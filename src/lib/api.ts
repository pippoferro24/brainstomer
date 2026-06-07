import { supabase } from './supabase'
import type {
  Idea,
  IdeaImage,
  Improvement,
  HistoryEntry,
  Prototype,
} from './types'

// ---------------------------------------------------------------------------
// IDEE
// ---------------------------------------------------------------------------
export async function fetchIdeas(userId: string): Promise<Idea[]> {
  const { data: ideas, error } = await supabase
    .from('ideas')
    .select('*, owner:profiles!ideas_owner_id_fkey(*)')
    .order('created_at', { ascending: false })
  if (error) throw error

  const { data: counts } = await supabase.from('idea_vote_counts').select('*')
  const { data: myVotes } = await supabase
    .from('idea_votes')
    .select('idea_id, value')
    .eq('user_id', userId)

  const countMap = new Map(counts?.map((c) => [c.idea_id, c]) ?? [])
  const voteMap = new Map(myVotes?.map((v) => [v.idea_id, v.value]) ?? [])

  return (ideas ?? []).map((idea) => ({
    ...idea,
    upvotes: countMap.get(idea.id)?.upvotes ?? 0,
    downvotes: countMap.get(idea.id)?.downvotes ?? 0,
    score: countMap.get(idea.id)?.score ?? 0,
    myVote: (voteMap.get(idea.id) as -1 | 1 | undefined) ?? 0,
  }))
}

export async function fetchIdea(ideaId: string, userId: string): Promise<Idea> {
  const { data, error } = await supabase
    .from('ideas')
    .select('*, owner:profiles!ideas_owner_id_fkey(*)')
    .eq('id', ideaId)
    .single()
  if (error) throw error

  const { data: counts } = await supabase
    .from('idea_vote_counts')
    .select('*')
    .eq('idea_id', ideaId)
    .maybeSingle()
  const { data: myVote } = await supabase
    .from('idea_votes')
    .select('value')
    .eq('idea_id', ideaId)
    .eq('user_id', userId)
    .maybeSingle()

  return {
    ...data,
    upvotes: counts?.upvotes ?? 0,
    downvotes: counts?.downvotes ?? 0,
    score: counts?.score ?? 0,
    myVote: (myVote?.value as -1 | 1 | undefined) ?? 0,
  }
}

export async function createIdea(
  ownerId: string,
  title: string,
  description: string,
): Promise<Idea> {
  const { data, error } = await supabase
    .from('ideas')
    .insert({ owner_id: ownerId, title, description })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateIdea(
  ideaId: string,
  patch: Partial<Pick<Idea, 'title' | 'description' | 'status'>>,
): Promise<void> {
  const { error } = await supabase
    .from('ideas')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', ideaId)
  if (error) throw error
}

export async function deleteIdea(ideaId: string): Promise<void> {
  const { error } = await supabase.from('ideas').delete().eq('id', ideaId)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// VOTI SULLE IDEE  (clic sullo stesso voto = annulla)
// ---------------------------------------------------------------------------
export async function voteIdea(
  ideaId: string,
  userId: string,
  value: 1 | -1,
  current: -1 | 0 | 1,
): Promise<void> {
  if (current === value) {
    const { error } = await supabase
      .from('idea_votes')
      .delete()
      .eq('idea_id', ideaId)
      .eq('user_id', userId)
    if (error) throw error
    return
  }
  const { error } = await supabase
    .from('idea_votes')
    .upsert({ idea_id: ideaId, user_id: userId, value })
  if (error) throw error
}

// ---------------------------------------------------------------------------
// IMMAGINI
// ---------------------------------------------------------------------------
export async function fetchImages(ideaId: string): Promise<IdeaImage[]> {
  const { data, error } = await supabase
    .from('idea_images')
    .select('*')
    .eq('idea_id', ideaId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map((img) => ({
    ...img,
    url: supabase.storage.from('idea-images').getPublicUrl(img.storage_path)
      .data.publicUrl,
  }))
}

export async function uploadImage(
  ideaId: string,
  userId: string,
  file: File,
  caption: string,
): Promise<void> {
  const ext = file.name.split('.').pop() ?? 'png'
  const path = `${ideaId}/${crypto.randomUUID()}.${ext}`
  const { error: upErr } = await supabase.storage
    .from('idea-images')
    .upload(path, file, { upsert: false })
  if (upErr) throw upErr

  const { error } = await supabase.from('idea_images').insert({
    idea_id: ideaId,
    storage_path: path,
    uploaded_by: userId,
    caption,
  })
  if (error) throw error
}

export async function deleteImage(image: IdeaImage): Promise<void> {
  await supabase.storage.from('idea-images').remove([image.storage_path])
  const { error } = await supabase.from('idea_images').delete().eq('id', image.id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// MIGLIORAMENTI
// ---------------------------------------------------------------------------
export async function fetchImprovements(
  ideaId: string,
  userId: string,
): Promise<Improvement[]> {
  const { data, error } = await supabase
    .from('improvements')
    .select('*, author:profiles!improvements_author_id_fkey(*)')
    .eq('idea_id', ideaId)
    .order('created_at', { ascending: false })
  if (error) throw error

  const ids = (data ?? []).map((i) => i.id)
  const { data: votes } = ids.length
    ? await supabase
        .from('improvement_votes')
        .select('improvement_id, user_id, value')
        .in('improvement_id', ids)
    : { data: [] as { improvement_id: string; user_id: string; value: number }[] }

  return (data ?? []).map((imp) => {
    const v = votes?.filter((x) => x.improvement_id === imp.id) ?? []
    const up = v.filter((x) => x.value === 1).length
    const down = v.filter((x) => x.value === -1).length
    const mine = v.find((x) => x.user_id === userId)?.value
    return {
      ...imp,
      upvotes: up,
      downvotes: down,
      myVote: (mine as -1 | 1 | undefined) ?? 0,
      // Pareggio con almeno un voto e ancora in attesa: serve la decisione del proprietario.
      isTie: imp.status === 'pending' && up === down && up + down > 0,
    }
  })
}

export async function createImprovement(
  ideaId: string,
  authorId: string,
  title: string,
  body: string,
): Promise<void> {
  const { error } = await supabase
    .from('improvements')
    .insert({ idea_id: ideaId, author_id: authorId, title, body })
  if (error) throw error
}

export async function voteImprovement(
  improvementId: string,
  userId: string,
  value: 1 | -1,
  current: -1 | 0 | 1,
): Promise<void> {
  if (current === value) {
    const { error } = await supabase
      .from('improvement_votes')
      .delete()
      .eq('improvement_id', improvementId)
      .eq('user_id', userId)
    if (error) throw error
    return
  }
  const { error } = await supabase
    .from('improvement_votes')
    .upsert({ improvement_id: improvementId, user_id: userId, value })
  if (error) throw error
}

// Il proprietario sblocca un pareggio (chiama la funzione SQL sicura).
export async function resolveImprovement(
  improvementId: string,
  decision: 'approved' | 'rejected',
): Promise<void> {
  const { error } = await supabase.rpc('owner_resolve_improvement', {
    p_improvement_id: improvementId,
    p_decision: decision,
  })
  if (error) throw error
}

// ---------------------------------------------------------------------------
// STORICO
// ---------------------------------------------------------------------------
export async function fetchHistory(ideaId: string): Promise<HistoryEntry[]> {
  const { data, error } = await supabase
    .from('history')
    .select('*, actor:profiles!history_actor_id_fkey(*)')
    .eq('idea_id', ideaId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

// ---------------------------------------------------------------------------
// PROTOTIPO
// ---------------------------------------------------------------------------
export async function fetchPrototype(ideaId: string): Promise<Prototype | null> {
  const { data, error } = await supabase
    .from('prototypes')
    .select('*')
    .eq('idea_id', ideaId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function savePrototype(
  ideaId: string,
  userId: string,
  content: string,
): Promise<void> {
  const { error } = await supabase.from('prototypes').upsert({
    idea_id: ideaId,
    content,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

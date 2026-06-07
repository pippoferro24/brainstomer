export type IdeaStatus = 'open' | 'in_progress' | 'shipped' | 'archived'
export type ImprovementStatus = 'pending' | 'approved' | 'rejected'

export interface Profile {
  id: string
  display_name: string
  created_at: string
}

export interface Idea {
  id: string
  owner_id: string
  title: string
  description: string
  status: IdeaStatus
  created_at: string
  updated_at: string
  owner?: Profile
  upvotes?: number
  downvotes?: number
  score?: number
  myVote?: -1 | 0 | 1
}

export interface IdeaImage {
  id: string
  idea_id: string
  storage_path: string
  caption: string
  uploaded_by: string
  created_at: string
  url?: string
}

export interface Improvement {
  id: string
  idea_id: string
  author_id: string
  title: string
  body: string
  status: ImprovementStatus
  resolved_by_owner: boolean
  created_at: string
  resolved_at: string | null
  author?: Profile
  upvotes?: number
  downvotes?: number
  myVote?: -1 | 0 | 1
  isTie?: boolean
}

export interface HistoryEntry {
  id: string
  idea_id: string
  actor_id: string | null
  action: string
  detail: Record<string, unknown>
  created_at: string
  actor?: Profile
}

export interface Prototype {
  idea_id: string
  content: string
  updated_by: string | null
  updated_at: string
}

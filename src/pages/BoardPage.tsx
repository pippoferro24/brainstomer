import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createIdea, fetchIdeas, voteIdea } from '../lib/api'
import type { Idea } from '../lib/types'
import { VoteButtons } from '../components/VoteButtons'
import { IdeaStatusBadge } from '../components/StatusBadge'

type SortKey = 'recent' | 'top'

export function BoardPage() {
  const { user } = useAuth()
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<SortKey>('top')
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!user) return
    setLoading(true)
    try {
      setIdeas(await fetchIdeas(user.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore di caricamento')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setBusy(true)
    setError(null)
    try {
      await createIdea(user.id, title.trim(), description.trim())
      setTitle('')
      setDescription('')
      setShowForm(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore nella creazione')
    } finally {
      setBusy(false)
    }
  }

  async function handleVote(idea: Idea, value: 1 | -1) {
    if (!user) return
    await voteIdea(idea.id, user.id, value, idea.myVote ?? 0)
    await load()
  }

  const sorted = [...ideas].sort((a, b) =>
    sort === 'top'
      ? (b.score ?? 0) - (a.score ?? 0)
      : +new Date(b.created_at) - +new Date(a.created_at),
  )

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Idee di progetto</h1>
          <p className="text-sm text-slate-500">
            Proponi la tua idea o vota quelle degli altri.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Annulla' : '+ Nuova idea'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-5 space-y-3">
          <input
            className="input"
            placeholder="Titolo dell'idea"
            required
            minLength={3}
            maxLength={140}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="input min-h-[90px]"
            placeholder="Descrivi l'idea: qual è il problema, la soluzione, chi ne beneficia…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button className="btn-primary" disabled={busy}>
            {busy ? 'Pubblicazione…' : 'Pubblica idea'}
          </button>
        </form>
      )}

      <div className="mb-3 flex gap-2 text-sm">
        <button
          className={sort === 'top' ? 'btn-primary' : 'btn-ghost'}
          onClick={() => setSort('top')}
        >
          🔥 Più votate
        </button>
        <button
          className={sort === 'recent' ? 'btn-primary' : 'btn-ghost'}
          onClick={() => setSort('recent')}
        >
          🕒 Più recenti
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400">Caricamento…</p>
      ) : sorted.length === 0 ? (
        <div className="card text-center text-slate-500">
          Nessuna idea ancora. Sii il primo a proporne una! 🚀
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((idea) => (
            <li key={idea.id} className="card flex items-start gap-4">
              <VoteButtons
                upvotes={idea.upvotes ?? 0}
                downvotes={idea.downvotes ?? 0}
                myVote={idea.myVote ?? 0}
                onVote={(v) => handleVote(idea, v)}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/idea/${idea.id}`}
                    className="truncate text-lg font-bold text-slate-900 hover:text-brand-700"
                  >
                    {idea.title}
                  </Link>
                  <IdeaStatusBadge status={idea.status} />
                </div>
                {idea.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                    {idea.description}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-400">
                  di {idea.owner?.display_name ?? '—'} · punteggio {idea.score ?? 0}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

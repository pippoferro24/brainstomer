import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchIdea, voteIdea } from '../lib/api'
import type { Idea } from '../lib/types'
import { VoteButtons } from '../components/VoteButtons'
import { IdeaStatusBadge } from '../components/StatusBadge'
import { DescriptionTab } from '../components/tabs/DescriptionTab'
import { ImagesTab } from '../components/tabs/ImagesTab'
import { ImprovementsTab } from '../components/tabs/ImprovementsTab'
import { PrototypeTab } from '../components/tabs/PrototypeTab'
import { HistoryTab } from '../components/tabs/HistoryTab'

type TabKey = 'descrizione' | 'immagini' | 'miglioramenti' | 'prototipo' | 'storico'

const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: 'descrizione', label: 'Descrizione', icon: '📝' },
  { key: 'immagini', label: 'Immagini', icon: '🖼' },
  { key: 'miglioramenti', label: 'Miglioramenti', icon: '💡' },
  { key: 'prototipo', label: 'Prototipo', icon: '🛠' },
  { key: 'storico', label: 'Storico', icon: '🕘' },
]

export function IdeaPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [idea, setIdea] = useState<Idea | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabKey>('descrizione')
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!id || !user) return
    try {
      setIdea(await fetchIdea(id, user.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Idea non trovata')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user])

  async function handleVote(value: 1 | -1) {
    if (!idea || !user) return
    await voteIdea(idea.id, user.id, value, idea.myVote ?? 0)
    await load()
  }

  if (loading) return <p className="text-slate-400">Caricamento…</p>
  if (error || !idea)
    return (
      <div className="card">
        <p className="text-rose-600">{error ?? 'Idea non trovata.'}</p>
        <Link to="/" className="btn-ghost mt-3">
          ← Torna alle idee
        </Link>
      </div>
    )

  return (
    <div>
      <Link to="/" className="text-sm text-slate-500 hover:text-brand-700">
        ← Tutte le idee
      </Link>

      <div className="mt-3 flex items-start gap-4">
        <VoteButtons
          upvotes={idea.upvotes ?? 0}
          downvotes={idea.downvotes ?? 0}
          myVote={idea.myVote ?? 0}
          onVote={handleVote}
        />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900">{idea.title}</h1>
            <IdeaStatusBadge status={idea.status} />
          </div>
          <p className="mt-1 text-sm text-slate-400">
            proposta da {idea.owner?.display_name ?? '—'} ·{' '}
            {new Date(idea.created_at).toLocaleDateString('it-IT')}
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-slate-200 [-webkit-overflow-scrolling:touch]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition touch-manipulation ${
              tab === t.key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 active:text-slate-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === 'descrizione' && <DescriptionTab idea={idea} onChange={load} />}
        {tab === 'immagini' && <ImagesTab idea={idea} />}
        {tab === 'miglioramenti' && <ImprovementsTab idea={idea} />}
        {tab === 'prototipo' && <PrototypeTab idea={idea} />}
        {tab === 'storico' && <HistoryTab idea={idea} />}
      </div>
    </div>
  )
}

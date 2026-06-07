import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  createImprovement,
  fetchImprovements,
  resolveImprovement,
  voteImprovement,
} from '../../lib/api'
import type { Idea, Improvement } from '../../lib/types'
import { VoteButtons } from '../VoteButtons'
import { ImprovementStatusBadge } from '../StatusBadge'

export function ImprovementsTab({ idea }: { idea: Idea }) {
  const { user } = useAuth()
  const isOwner = user?.id === idea.owner_id
  const [items, setItems] = useState<Improvement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    if (!user) return
    setLoading(true)
    try {
      setItems(await fetchImprovements(idea.id, user.id))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea.id, user])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setBusy(true)
    try {
      await createImprovement(idea.id, user.id, title.trim(), body.trim())
      setTitle('')
      setBody('')
      setShowForm(false)
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function handleVote(imp: Improvement, value: 1 | -1) {
    if (!user) return
    await voteImprovement(imp.id, user.id, value, imp.myVote ?? 0)
    await load()
  }

  async function resolve(imp: Improvement, decision: 'approved' | 'rejected') {
    await resolveImprovement(imp.id, decision)
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Le proposte vengono <strong>approvate se la maggioranza vota a favore</strong>.
          In caso di pareggio decide il proprietario dell'idea.
        </p>
        <button className="btn-primary shrink-0" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Annulla' : '+ Proponi miglioramento'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card space-y-3">
          <input
            className="input"
            placeholder="Titolo del miglioramento"
            required
            minLength={3}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="input min-h-[80px]"
            placeholder="Spiega la modifica proposta e perché migliora il progetto…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button className="btn-primary" disabled={busy}>
            {busy ? 'Invio…' : 'Invia proposta'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-slate-400">Caricamento…</p>
      ) : items.length === 0 ? (
        <p className="italic text-slate-400">Nessuna proposta di miglioramento.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((imp) => (
            <li key={imp.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-900">{imp.title}</h3>
                    <ImprovementStatusBadge status={imp.status} isTie={imp.isTie} />
                  </div>
                  {imp.body && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                      {imp.body}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-slate-400">
                    proposto da {imp.author?.display_name ?? '—'}
                  </p>
                </div>
                <VoteButtons
                  size="sm"
                  upvotes={imp.upvotes ?? 0}
                  downvotes={imp.downvotes ?? 0}
                  myVote={imp.myVote ?? 0}
                  onVote={(v) => handleVote(imp, v)}
                />
              </div>

              {imp.isTie && isOwner && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-violet-50 p-3">
                  <span className="text-sm text-violet-800">
                    Pareggio: come proprietario hai il voto decisivo →
                  </span>
                  <button
                    className="btn bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => resolve(imp, 'approved')}
                  >
                    Approva
                  </button>
                  <button
                    className="btn bg-rose-600 text-white hover:bg-rose-700"
                    onClick={() => resolve(imp, 'rejected')}
                  >
                    Respingi
                  </button>
                </div>
              )}
              {imp.isTie && !isOwner && (
                <p className="mt-3 rounded-lg bg-violet-50 p-2 text-xs text-violet-700">
                  In attesa che il proprietario dell'idea sblocchi il pareggio.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { deleteIdea, updateIdea } from '../../lib/api'
import type { Idea, IdeaStatus } from '../../lib/types'
import { useNavigate } from 'react-router-dom'

const statuses: { value: IdeaStatus; label: string }[] = [
  { value: 'open', label: 'Aperta' },
  { value: 'in_progress', label: 'In sviluppo' },
  { value: 'shipped', label: 'Realizzata' },
  { value: 'archived', label: 'Archiviata' },
]

export function DescriptionTab({ idea, onChange }: { idea: Idea; onChange: () => void }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isOwner = user?.id === idea.owner_id
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(idea.title)
  const [description, setDescription] = useState(idea.description)
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      await updateIdea(idea.id, { title: title.trim(), description: description.trim() })
      setEditing(false)
      onChange()
    } finally {
      setBusy(false)
    }
  }

  async function changeStatus(status: IdeaStatus) {
    await updateIdea(idea.id, { status })
    onChange()
  }

  async function remove() {
    if (!confirm('Eliminare definitivamente questa idea e tutto il suo storico?')) return
    await deleteIdea(idea.id)
    navigate('/')
  }

  if (editing) {
    return (
      <div className="space-y-3">
        <input
          className="input text-lg font-bold"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="input min-h-[200px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex gap-2">
          <button className="btn-primary" onClick={save} disabled={busy}>
            Salva
          </button>
          <button className="btn-ghost" onClick={() => setEditing(false)}>
            Annulla
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {idea.description ? (
        <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
          {idea.description}
        </p>
      ) : (
        <p className="italic text-slate-400">Nessuna descrizione ancora.</p>
      )}

      {isOwner && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <button className="btn-ghost" onClick={() => setEditing(true)}>
            ✏️ Modifica
          </button>
          <select
            className="input w-auto"
            value={idea.status}
            onChange={(e) => changeStatus(e.target.value as IdeaStatus)}
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                Stato: {s.label}
              </option>
            ))}
          </select>
          <button className="btn-danger ml-auto" onClick={remove}>
            🗑 Elimina idea
          </button>
        </div>
      )}
    </div>
  )
}

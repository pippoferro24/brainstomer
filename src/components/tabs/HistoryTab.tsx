import { useEffect, useState } from 'react'
import { fetchHistory } from '../../lib/api'
import type { HistoryEntry, Idea } from '../../lib/types'

const labels: Record<string, string> = {
  idea_created: 'ha creato l\'idea',
  improvement_proposed: 'ha proposto un miglioramento',
  improvement_approved: 'miglioramento approvato a maggioranza',
  improvement_rejected: 'miglioramento respinto a maggioranza',
  improvement_pending: 'miglioramento tornato in votazione',
  improvement_approved_by_owner: 'miglioramento approvato dal proprietario (pareggio)',
  improvement_rejected_by_owner: 'miglioramento respinto dal proprietario (pareggio)',
  prototype_updated: 'ha aggiornato il prototipo',
}

const icons: Record<string, string> = {
  idea_created: '✨',
  improvement_proposed: '💡',
  improvement_approved: '✅',
  improvement_rejected: '❌',
  improvement_pending: '⏳',
  improvement_approved_by_owner: '👑✅',
  improvement_rejected_by_owner: '👑❌',
  prototype_updated: '🛠',
}

export function HistoryTab({ idea }: { idea: Idea }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory(idea.id).then((e) => {
      setEntries(e)
      setLoading(false)
    })
  }, [idea.id])

  if (loading) return <p className="text-slate-400">Caricamento…</p>
  if (entries.length === 0)
    return <p className="italic text-slate-400">Nessun evento registrato.</p>

  return (
    <ol className="relative border-l border-slate-200 pl-6">
      {entries.map((e) => {
        const title = (e.detail?.title as string) ?? ''
        return (
          <li key={e.id} className="mb-5 last:mb-0">
            <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs ring-1 ring-slate-200">
              {icons[e.action] ?? '•'}
            </span>
            <p className="text-sm text-slate-700">
              <strong>{e.actor?.display_name ?? 'Sistema'}</strong>{' '}
              {labels[e.action] ?? e.action}
              {title && <span className="text-slate-500"> · «{title}»</span>}
            </p>
            <time className="text-xs text-slate-400">
              {new Date(e.created_at).toLocaleString('it-IT')}
            </time>
          </li>
        )
      })}
    </ol>
  )
}

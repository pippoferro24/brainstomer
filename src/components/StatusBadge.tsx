import type { IdeaStatus, ImprovementStatus } from '../lib/types'

const ideaStyles: Record<IdeaStatus, string> = {
  open: 'bg-sky-50 text-sky-700',
  in_progress: 'bg-amber-50 text-amber-700',
  shipped: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-slate-100 text-slate-500',
}
const ideaLabels: Record<IdeaStatus, string> = {
  open: 'Aperta',
  in_progress: 'In sviluppo',
  shipped: 'Realizzata',
  archived: 'Archiviata',
}

const impStyles: Record<ImprovementStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
}
const impLabels: Record<ImprovementStatus, string> = {
  pending: 'In votazione',
  approved: 'Approvato',
  rejected: 'Respinto',
}

export function IdeaStatusBadge({ status }: { status: IdeaStatus }) {
  return <span className={`badge ${ideaStyles[status]}`}>{ideaLabels[status]}</span>
}

export function ImprovementStatusBadge({
  status,
  isTie,
}: {
  status: ImprovementStatus
  isTie?: boolean
}) {
  if (isTie) {
    return (
      <span className="badge bg-violet-50 text-violet-700">
        Pareggio · decide il proprietario
      </span>
    )
  }
  return <span className={`badge ${impStyles[status]}`}>{impLabels[status]}</span>
}

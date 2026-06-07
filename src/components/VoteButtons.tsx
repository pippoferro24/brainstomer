interface Props {
  upvotes: number
  downvotes: number
  myVote: -1 | 0 | 1
  onVote: (value: 1 | -1) => void
  size?: 'sm' | 'md'
}

export function VoteButtons({ upvotes, downvotes, myVote, onVote, size = 'md' }: Props) {
  const pad = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onVote(1)}
        className={`inline-flex items-center gap-1 rounded-lg font-semibold ring-1 transition ${pad} ${
          myVote === 1
            ? 'bg-emerald-600 text-white ring-emerald-600'
            : 'bg-white text-emerald-700 ring-slate-200 hover:bg-emerald-50'
        }`}
        title="Voto positivo"
      >
        ▲ {upvotes}
      </button>
      <button
        onClick={() => onVote(-1)}
        className={`inline-flex items-center gap-1 rounded-lg font-semibold ring-1 transition ${pad} ${
          myVote === -1
            ? 'bg-rose-600 text-white ring-rose-600'
            : 'bg-white text-rose-700 ring-slate-200 hover:bg-rose-50'
        }`}
        title="Voto negativo"
      >
        ▼ {downvotes}
      </button>
    </div>
  )
}

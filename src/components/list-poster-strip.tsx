import { getPosterUrl } from '@/lib/tmdb'

interface PreviewEntry {
  poster_path: string | null
  custom_poster_url: string | null
  title?: string
}

interface ListPosterStripProps {
  entries: PreviewEntry[]
  count: number
  columns?: number
}

export default function ListPosterStrip({ entries, count, columns = 5 }: ListPosterStripProps) {
  const tiles = Math.min(entries.length, columns)
  const extra = Math.max(count - columns, 0)

  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: columns }).map((_, i) => {
        if (i < tiles) {
          const entry = entries[i]
          const posterUrl = entry?.custom_poster_url || getPosterUrl(entry?.poster_path ?? null, 'w92')
          return (
            <div
              key={i}
              className="aspect-[2/3] bg-tag-bg border border-border rounded-sm overflow-hidden"
            >
              {posterUrl ? (
                <img src={posterUrl} alt={entry?.title || ''} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-muted text-[10px] p-0.5 text-center leading-tight">
                  {entry?.title}
                </div>
              )}
            </div>
          )
        }
        if (i === columns - 1 && extra > 0) {
          return (
            <div
              key={i}
              className="aspect-[2/3] bg-tag-bg border border-border rounded-sm flex items-center justify-center text-xs text-text-muted"
            >
              +{extra}
            </div>
          )
        }
        return (
          <div
            key={i}
            className="aspect-[2/3] bg-tag-bg border border-border rounded-sm"
          />
        )
      })}
    </div>
  )
}
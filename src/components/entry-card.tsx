import { getPosterUrl } from '@/lib/tmdb'
import { Entry } from '@/types/database'
import { Film, Tv, Star } from 'lucide-react'
import Link from 'next/link'

const statusConfig: Record<string, { label: string; color: string }> = {
  watching: { label: 'Watching', color: 'text-status-watching bg-status-watching/10' },
  completed: { label: 'Completed', color: 'text-status-completed bg-status-completed/10' },
  on_hold: { label: 'On Hold', color: 'text-status-on-hold bg-status-on-hold/10' },
  dropped: { label: 'Dropped', color: 'text-status-dropped bg-status-dropped/10' },
  plan_to_watch: { label: 'Plan to Watch', color: 'text-status-plan bg-status-plan/10' },
}

interface Props {
  entry: Entry
  isPublic?: boolean
}

export default function EntryCard({ entry, isPublic }: Props) {
  const poster = getPosterUrl(entry.poster_path, 'w185')
  const status = statusConfig[entry.status]

  return (
    <div className="bg-surface border border-border rounded-sm overflow-hidden flex flex-col">
      <Link
        href={isPublic ? `/${entry.user_id}` : `/dashboard/edit/${entry.id}`}
        className="block aspect-[2/3] bg-tag-bg overflow-hidden relative"
      >
        {poster ? (
          <img
            src={poster}
            alt={entry.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {entry.type === 'movie' ? (
              <Film className="w-8 h-8 text-text-muted/40" />
            ) : (
              <Tv className="w-8 h-8 text-text-muted/40" />
            )}
          </div>
        )}
        {entry.rating && (
          <div className="absolute top-2 right-2 bg-surface/90 backdrop-blur-sm px-1.5 py-0.5 rounded-sm flex items-center gap-1 text-xs font-medium">
            <Star className="w-3 h-3 text-rating fill-current" />
            {entry.rating}
          </div>
        )}
      </Link>

      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={isPublic ? `/${entry.user_id}` : `/dashboard/edit/${entry.id}`}
            className="heading-sm leading-tight hover:text-accent transition-colors line-clamp-2"
          >
            {entry.title}
          </Link>
        </div>

        <div className="flex items-center gap-2 text-xs text-text-muted">
          {entry.year && <span>{entry.year}</span>}
          <span className="w-1 h-1 rounded-full bg-border" />
          {entry.type === 'movie' ? 'Film' : 'Series'}
        </div>

        <span className={`inline-flex self-start text-xs px-2 py-0.5 rounded-sm font-medium ${status.color}`}>
          {status.label}
        </span>

        {entry.type === 'series' && (entry.progress_season || entry.progress_episode) && (
          <p className="body-xs text-text-secondary">
            S{entry.progress_season || '?'} E{entry.progress_episode || '?'}
          </p>
        )}
      </div>
    </div>
  )
}

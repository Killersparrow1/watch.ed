import { getEntryPosterUrl } from '@/lib/tmdb'
import { Entry, WatchEvent } from '@/types/database'
import { Film, Tv, Star, Heart, Eye } from 'lucide-react'
import Link from 'next/link'
import { renderNotes } from '@/lib/render-notes'

const statusColors: Record<string, string> = {
  watching: 'text-status-watching bg-status-watching/10',
  completed: 'text-status-completed bg-status-completed/10',
  on_hold: 'text-status-on-hold bg-status-on-hold/10',
  dropped: 'text-status-dropped bg-status-dropped/10',
  plan_to_watch: 'text-status-plan bg-status-plan/10',
}

const statusLabels: Record<string, string> = {
  watching: 'Watching',
  completed: 'Completed',
  on_hold: 'On Hold',
  dropped: 'Dropped',
  plan_to_watch: 'Plan to Watch',
}

interface Props {
  entry: Entry
  watchEvent?: WatchEvent
}

export default function TimelineCard({ entry, watchEvent }: Props) {
  const poster = getEntryPosterUrl(entry, 'w185')

  const isWatchEvent = watchEvent !== undefined
  const displayRating = isWatchEvent ? watchEvent!.rating : entry.rating
  const displayNotes = isWatchEvent ? watchEvent!.notes : entry.notes
  const displaySeason = isWatchEvent ? watchEvent!.season_number : entry.progress_season
  const displayEpisode = isWatchEvent ? watchEvent!.episode_number : entry.progress_episode

  return (
    <Link
      href={`/dashboard/edit/${entry.id}`}
      className={`flex items-start gap-3 bg-surface border rounded-sm p-3 transition-colors group ${
        isWatchEvent ? 'border-accent/10 hover:border-accent/20' : 'border-border hover:border-accent/30'
      }`}
    >
      <div className="w-10 h-14 flex-shrink-0 bg-tag-bg rounded-sm overflow-hidden">
        {poster ? (
          <img src={poster} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {entry.type === 'movie' ? (
              <Film className="w-4 h-4 text-text-muted/40" />
            ) : (
              <Tv className="w-4 h-4 text-text-muted/40" />
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {isWatchEvent && <Eye className="w-3 h-3 text-accent/60 flex-shrink-0" />}
              <p className="text-sm font-medium leading-tight group-hover:text-accent transition-colors truncate">
                {entry.title}
                {entry.year && <span className="text-text-muted font-normal"> ({entry.year})</span>}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
              {isWatchEvent ? (
                <span className="text-accent/60">Rewatch</span>
              ) : (
                <span>{entry.type === 'movie' ? 'Film' : 'Series'}</span>
              )}
              {entry.runtime && !isWatchEvent && (
                <>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span>
                    {entry.runtime >= 60
                      ? `${Math.floor(entry.runtime / 60)}h ${entry.runtime % 60}m`
                      : `${entry.runtime}m`}
                  </span>
                </>
              )}
              <span className={`inline-flex text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${statusColors[entry.status]}`}>
                {statusLabels[entry.status]}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {displayRating && (
              <div className="flex items-center gap-0.5 text-xs font-medium text-rating">
                <Star className="w-3 h-3 fill-current" />
                {displayRating}
              </div>
            )}
            {entry.favorite && !isWatchEvent && (
              <Heart className="w-3 h-3 text-red-500 fill-red-500" />
            )}
          </div>
        </div>

        {displayNotes && (
          <div className="text-xs text-text-muted mt-1 line-clamp-1 leading-relaxed">
            {renderNotes(displayNotes)}
          </div>
        )}

        {(displaySeason != null || displayEpisode != null) && (
          <p className="text-[10px] text-text-muted mt-0.5">
            S{displaySeason ?? '?'} E{displayEpisode ?? '?'}
          </p>
        )}
      </div>
    </Link>
  )
}

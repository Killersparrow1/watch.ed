'use client'

import { useMemo } from 'react'
import { Entry, WatchEvent } from '@/types/database'
import { getEntryPosterUrl } from '@/lib/tmdb'
import { renderNotes } from '@/lib/render-notes'
import { Film, Tv, Star, Heart, Eye } from 'lucide-react'

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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

interface TimelineItem {
  id: string
  type: 'entry' | 'watch_event'
  entry: Entry
  watchEvent?: WatchEvent
  date: string
}

interface Props {
  entries: Entry[]
  watchEvents?: WatchEvent[]
}

export default function PublicTimeline({ entries, watchEvents = [] }: Props) {
  const grouped = useMemo(() => {
    const filteredEntryIds = new Set(entries.map(e => e.id))

    const items: TimelineItem[] = []

    for (const entry of entries) {
      if (!entry.watch_date) continue
      items.push({
        id: `entry-${entry.id}`,
        type: 'entry',
        entry,
        date: entry.watch_date,
      })
    }

    for (const event of watchEvents) {
      if (!filteredEntryIds.has(event.entry_id)) continue
      const entry = entries.find(e => e.id === event.entry_id)
      if (!entry) continue
      if (event.watch_date === entry.watch_date) continue
      items.push({
        id: `we-${event.id}`,
        type: 'watch_event',
        entry,
        watchEvent: event,
        date: event.watch_date,
      })
    }

    items.sort((a, b) => b.date.localeCompare(a.date))

    const groups: Record<string, Record<string, TimelineItem[]>> = {}

    for (const item of items) {
      if (!item.date) continue
      const date = new Date(item.date)
      if (isNaN(date.getTime())) continue
      const year = date.getFullYear().toString()
      const month = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!groups[year]) groups[year] = {}
      if (!groups[year][month]) groups[year][month] = []
      groups[year][month].push(item)
    }

    const sortedYears = Object.keys(groups).sort((a, b) => -a.localeCompare(b))

    return sortedYears.map(year => ({
      year,
      months: Object.keys(groups[year])
        .sort((a, b) => -a.localeCompare(b))
        .map(month => ({
          label: `${months[parseInt(month.split('-')[1]) - 1]} ${year}`,
          items: groups[year][month],
        })),
    }))
  }, [entries, watchEvents])

  if (grouped.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-text-secondary">No entries to show</p>
      </div>
    )
  }

  return (
    <div className="space-y-10 mt-6">
      {grouped.map(({ year, months: yearMonths }) => (
        <div key={year}>
          <h2 className="heading-md text-text-primary mb-4">{year}</h2>
          {yearMonths.map(({ label, items }) => (
            <div key={label} className="relative ml-4 pl-6 pb-6 border-l-2 border-border last:pb-0">
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-accent border-2 border-surface" />
              <h3 className="text-sm font-medium text-text-muted mb-3">{label}</h3>
              <div className="space-y-2">
                {items.map((item) => {
                  const isWatchEvent = item.type === 'watch_event'
                  const displayRating = isWatchEvent ? item.watchEvent!.rating : item.entry.rating
                  const displayNotes = isWatchEvent ? item.watchEvent!.notes : item.entry.notes
                  const displaySeason = isWatchEvent ? item.watchEvent!.season_number : item.entry.progress_season
                  const displayEpisode = isWatchEvent ? item.watchEvent!.episode_number : item.entry.progress_episode

                  return (
                    <div
                      key={item.id}
                      className={`relative flex items-start gap-3 bg-surface border rounded-sm p-3 ${
                        isWatchEvent ? 'border-accent/10' : 'border-border'
                      }`}
                    >
                      {isWatchEvent && (
                        <div className="absolute -left-[25px] top-3 w-4 h-4 rounded-full border-2 border-accent/40 bg-surface flex items-center justify-center">
                          <Eye className="w-2 h-2 text-accent/60" />
                        </div>
                      )}
                      <div className="w-10 h-14 flex-shrink-0 bg-tag-bg rounded-sm overflow-hidden">
                        {getEntryPosterUrl(item.entry, 'w185') ? (
                          <img src={getEntryPosterUrl(item.entry, 'w185')!} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {item.entry.type === 'movie' ? (
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
                              <p className="text-sm font-medium leading-tight truncate">
                                {item.entry.title}
                                {item.entry.year && <span className="text-text-muted font-normal"> ({item.entry.year})</span>}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                              {isWatchEvent ? (
                                <span className="text-accent/60">Rewatch</span>
                              ) : (
                                <span>{item.entry.type === 'movie' ? 'Film' : 'Series'}</span>
                              )}
                              {item.entry.runtime && !isWatchEvent && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-border" />
                                  <span>
                                    {item.entry.runtime >= 60
                                      ? `${Math.floor(item.entry.runtime / 60)}h ${item.entry.runtime % 60}m`
                                      : `${item.entry.runtime}m`}
                                  </span>
                                </>
                              )}
                              <span className={`inline-flex text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${statusColors[item.entry.status]}`}>
                                {statusLabels[item.entry.status]}
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
                            {item.entry.favorite && !isWatchEvent && (
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
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

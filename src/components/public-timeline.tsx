'use client'

import { useMemo } from 'react'
import { Entry } from '@/types/database'
import { getEntryPosterUrl } from '@/lib/tmdb'
import { Film, Tv, Star, Heart } from 'lucide-react'

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

interface Props {
  entries: Entry[]
}

export default function PublicTimeline({ entries }: Props) {
  const grouped = useMemo(() => {
    const groups: Record<string, Record<string, Entry[]>> = {}

    for (const entry of entries) {
      const dateStr = entry.watch_date || entry.created_at
      if (!dateStr) continue
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) continue
      const year = date.getFullYear().toString()
      const month = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!groups[year]) groups[year] = {}
      if (!groups[year][month]) groups[year][month] = []
      groups[year][month].push(entry)
    }

    const sortedYears = Object.keys(groups).sort((a, b) => -a.localeCompare(b))

    return sortedYears.map(year => ({
      year,
      months: Object.keys(groups[year])
        .sort((a, b) => -a.localeCompare(b))
        .map(month => ({
          label: `${months[parseInt(month.split('-')[1]) - 1]} ${year}`,
          entries: groups[year][month],
        })),
    }))
  }, [entries])

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
          {yearMonths.map(({ label, entries: monthEntries }) => (
            <div key={label} className="relative ml-4 pl-6 pb-6 border-l-2 border-border last:pb-0">
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-accent border-2 border-surface" />
              <h3 className="text-sm font-medium text-text-muted mb-3">{label}</h3>
              <div className="space-y-2">
                {monthEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 bg-surface border border-border rounded-sm p-3"
                  >
                    <div className="w-10 h-14 flex-shrink-0 bg-tag-bg rounded-sm overflow-hidden">
                      {getEntryPosterUrl(entry, 'w185') ? (
                        <img src={getEntryPosterUrl(entry, 'w185')!} alt="" className="w-full h-full object-cover" loading="lazy" />
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
                        <p className="text-sm font-medium leading-tight truncate">
                          {entry.title}
                          {entry.year && <span className="text-text-muted font-normal"> ({entry.year})</span>}
                        </p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {entry.rating && (
                            <div className="flex items-center gap-0.5 text-xs font-medium text-rating">
                              <Star className="w-3 h-3 fill-current" />
                              {entry.rating}
                            </div>
                          )}
                          {entry.favorite && (
                            <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                        <span>{entry.type === 'movie' ? 'Film' : 'Series'}</span>
                        {entry.runtime && (
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

                      {entry.type === 'series' && (entry.progress_season || entry.progress_episode) && (
                        <p className="text-[10px] text-text-muted mt-0.5">
                          S{entry.progress_season || '?'} E{entry.progress_episode || '?'}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

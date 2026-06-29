'use client'

import { useState, useMemo } from 'react'
import { Entry, WatchEvent } from '@/types/database'
import { ArrowUpDown, Grid3X3, Clock } from 'lucide-react'
import PublicEntryCard from './public-entry-card'
import PublicTimeline from '@/components/public-timeline'

interface Props {
  entries: Entry[]
  watchEvents: WatchEvent[]
  reactionCounts: Record<string, { likes: number; dislikes: number }>
  profileUsername: string
  profileDisplayName: string
  profileAvatarUrl: string | null
}

type FilterType = 'all' | 'movie' | 'series' | 'plan_to_watch'
type SortKey = 'watch_date' | 'rating' | 'title' | 'year'

export default function PublicFilters({ entries, watchEvents, reactionCounts, profileUsername, profileDisplayName, profileAvatarUrl }: Props) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [sort, setSort] = useState<SortKey>('watch_date')
  const [asc, setAsc] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid')

  const watched = entries.filter(e => e.status !== 'plan_to_watch')

  const filtered = useMemo(() => {
    let list: Entry[]
    if (filter === 'plan_to_watch') {
      list = entries.filter(e => e.status === 'plan_to_watch')
    } else if (filter === 'all') {
      list = watched
    } else {
      list = watched.filter(e => e.type === filter)
    }

    list = [...list].sort((a, b) => {
      let cmp = 0
      if (sort === 'title') cmp = a.title.localeCompare(b.title)
      else if (sort === 'rating') cmp = (a.rating || 0) - (b.rating || 0)
      else if (sort === 'year') cmp = (a.year || '') > (b.year || '') ? 1 : -1
      else {
        const aDate = a.watch_date || a.created_at
        const bDate = b.watch_date || b.created_at
        cmp = new Date(aDate).getTime() - new Date(bDate).getTime()
      }
      return asc ? cmp : -cmp
    })

    return list
  }, [entries, filter, sort, asc, watched])

  const watchEventsByEntry = useMemo(() => {
    const map: Record<string, WatchEvent[]> = {}
    for (const we of watchEvents) {
      if (!map[we.entry_id]) map[we.entry_id] = []
      map[we.entry_id].push(we)
    }
    return map
  }, [watchEvents])

  const counts = {
    all: watched.length,
    movie: watched.filter(e => e.type === 'movie').length,
    series: watched.filter(e => e.type === 'series').length,
    plan_to_watch: entries.filter(e => e.status === 'plan_to_watch').length,
  }

  const tabs = [
    { key: 'all' as const, label: 'All' },
    { key: 'movie' as const, label: 'Movies' },
    { key: 'series' as const, label: 'Series' },
    { key: 'plan_to_watch' as const, label: 'Watch List' },
  ]

  const sortOptions = [
    { key: 'watch_date' as const, label: 'Last logged' },
    { key: 'rating' as const, label: 'Rating' },
    { key: 'title' as const, label: 'Title' },
    { key: 'year' as const, label: 'Year' },
  ]

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-border">
        <div className="flex items-center gap-1 bg-surface border border-border rounded-sm p-0.5">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-3 py-1 text-xs rounded-sm font-medium transition-colors ${
                filter === t.key
                  ? 'bg-crimson text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-background'
              }`}
            >
              {t.label}
              <span className={`ml-1 ${filter === t.key ? 'text-white' : 'text-text-muted/60'}`}>({counts[t.key]})</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <div className="flex items-center gap-0.5 mr-2 pr-2 border-r border-border">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-sm transition-colors ${
                viewMode === 'grid'
                  ? 'text-text-primary bg-tag-bg'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Grid view"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`p-1.5 rounded-sm transition-colors ${
                viewMode === 'timeline'
                  ? 'text-text-primary bg-tag-bg'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Timeline view"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
          </div>
          {sortOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => {
                if (sort === opt.key) setAsc(!asc)
                else { setSort(opt.key); setAsc(false) }
              }}
              className={`px-2 py-1 text-xs rounded-sm transition-colors ${
                sort === opt.key
                  ? 'text-text-primary bg-surface border border-border'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {opt.label}
              {sort === opt.key && <span className="ml-1">{asc ? '↑' : '↓'}</span>}
            </button>
          ))}
        </div>

        <p className="w-full text-xs text-text-muted">
          Showing {filtered.length} of {entries.length} entries
        </p>
      </div>

      {viewMode === 'timeline' ? (
        <PublicTimeline entries={filtered} watchEvents={watchEvents} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {filtered.map((entry) => {
            const counts = reactionCounts[entry.id] || { likes: 0, dislikes: 0 }
            return (
              <PublicEntryCard
                key={entry.id}
                entry={entry}
                entryWatchEvents={watchEventsByEntry[entry.id] || []}
                likes={counts.likes}
                dislikes={counts.dislikes}
                profileUsername={profileUsername}
                profileDisplayName={profileDisplayName}
                profileAvatarUrl={profileAvatarUrl}
              />
            )
          })}
        </div>
      )}

      {filtered.length === 0 && viewMode === 'grid' && (
        <div className="text-center py-16">
          <p className="text-text-secondary">No {filter !== 'all' ? filter + ' ' : ''}entries match</p>
        </div>
      )}
    </div>
  )
}

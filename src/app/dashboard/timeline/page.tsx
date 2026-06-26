'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Entry, WatchEvent } from '@/types/database'
import TimelineCard from '@/components/timeline-card'
import FeedCard from '@/components/feed-card'
import { Film, Tv, Clock, Filter, Eye, Users } from 'lucide-react'

type ActiveFilter = 'all' | 'movie' | 'series'
type FeedMode = 'mine' | 'following'

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface TimelineItem {
  id: string
  type: 'entry' | 'watch_event'
  entry: Entry
  watchEvent?: WatchEvent
  date: string
  label: string
}

export default function TimelinePage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [watchEvents, setWatchEvents] = useState<WatchEvent[]>([])
  const [feedEntries, setFeedEntries] = useState<(Entry & { profile?: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null })[]>([])
  const [loading, setLoading] = useState(true)
  const [feedLoading, setFeedLoading] = useState(false)
  const [filter, setFilter] = useState<ActiveFilter>('all')
  const [feedMode, setFeedMode] = useState<FeedMode>('mine')
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  useEffect(() => {
    getSupabase().auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      Promise.all([
        getSupabase()
          .from('entries')
          .select('*')
          .eq('user_id', user.id)
          .neq('status', 'plan_to_watch')
          .order('watch_date', { ascending: false, nullsFirst: false }),
        getSupabase()
          .from('watch_events')
          .select('*, entries!inner(user_id)')
          .eq('entries.user_id', user.id)
          .order('watch_date', { ascending: false }),
      ]).then(([entriesRes, eventsRes]) => {
        if (entriesRes.data) setEntries(entriesRes.data as Entry[])
        if (eventsRes.data) setWatchEvents(eventsRes.data as WatchEvent[])
        setLoading(false)
      })
    })
  }, [])

  useEffect(() => {
    if (feedMode !== 'following') return
    setFeedLoading(true)
    fetch('/api/feed')
      .then(res => res.json())
      .then(data => {
        setFeedEntries(data.entries || [])
        setFeedLoading(false)
      })
      .catch(() => setFeedLoading(false))
  }, [feedMode])

  const timelineItems = useMemo((): TimelineItem[] => {
    const items: TimelineItem[] = []

    const entryMap = new Map(entries.map(e => [e.id, e]))

    for (const entry of entries) {
      if (!entry.watch_date) continue
      items.push({
        id: `entry-${entry.id}`,
        type: 'entry',
        entry,
        date: entry.watch_date,
        label: entry.title,
      })
    }

    for (const event of watchEvents) {
      const entry = entryMap.get(event.entry_id)
      if (!entry) continue
      if (filter === 'movie' && entry.type !== 'movie') continue
      if (filter === 'series' && entry.type !== 'series') continue

      if (event.watch_date === entry.watch_date) continue

      items.push({
        id: `we-${event.id}`,
        type: 'watch_event',
        entry,
        watchEvent: event,
        date: event.watch_date,
        label: event.episode_title || entry.title,
      })
    }

    items.sort((a, b) => {
      const cmp = a.date.localeCompare(b.date)
      return sortOrder === 'desc' ? -cmp : cmp
    })

    return items
  }, [entries, watchEvents, filter, sortOrder])

  const grouped = useMemo(() => {
    const groups: Record<string, Record<string, TimelineItem[]>> = {}

    for (const item of timelineItems) {
      const dateStr = item.date
      if (!dateStr) continue
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) continue
      const year = date.getFullYear().toString()
      const month = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!groups[year]) groups[year] = {}
      if (!groups[year][month]) groups[year][month] = []
      groups[year][month].push(item)
    }

    const sortedYears = Object.keys(groups).sort((a, b) =>
      sortOrder === 'desc' ? -a.localeCompare(b) : a.localeCompare(b)
    )

    return sortedYears.map(year => ({
      year,
      months: Object.keys(groups[year])
        .sort((a, b) => sortOrder === 'desc' ? -a.localeCompare(b) : a.localeCompare(b))
        .map(month => ({
          label: `${months[parseInt(month.split('-')[1]) - 1]} ${year}`,
          entries: groups[year][month],
        })),
    }))
  }, [timelineItems, sortOrder])

  if (loading) {
    return (
      <div>
        <h1 className="heading-lg mb-6">Timeline</h1>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 bg-tag-bg rounded-sm animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="heading-lg flex items-center gap-2">
          <Clock className="w-6 h-6 text-accent" />
          Timeline
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="text-xs text-text-muted hover:text-text-primary transition-colors px-2 py-1 border border-border rounded-sm"
          >
            {sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setFeedMode('mine')}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm transition-colors ${
            feedMode === 'mine'
              ? 'bg-accent text-white'
              : 'bg-tag-bg text-text-secondary hover:text-text-primary'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          My Timeline
        </button>
        <button
          onClick={() => setFeedMode('following')}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm transition-colors ${
            feedMode === 'following'
              ? 'bg-accent text-white'
              : 'bg-tag-bg text-text-secondary hover:text-text-primary'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Following
        </button>
      </div>

      {feedMode === 'mine' && (
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-4 h-4 text-text-muted" />
          {(['all', 'movie', 'series'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm transition-colors ${
                filter === f
                  ? 'bg-accent text-white'
                  : 'bg-tag-bg text-text-secondary hover:text-text-primary'
              }`}
            >
              {f === 'all' ? null : f === 'movie' ? (
                <Film className="w-3.5 h-3.5" />
              ) : (
                <Tv className="w-3.5 h-3.5" />
              )}
              {f === 'all' ? 'All' : f === 'movie' ? 'Movies' : 'Series'}
            </button>
          ))}
        </div>
      )}

      {feedMode === 'following' ? (
        feedLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-tag-bg rounded-sm animate-pulse" />
            ))}
          </div>
        ) : feedEntries.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-text-muted/30 mx-auto mb-3" />
            <p className="text-text-secondary">No activity from followed users yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {feedEntries.map(item => (
              <FeedCard key={item.id} entry={item} />
            ))}
          </div>
        )
      ) : grouped.length === 0 ? (
        <div className="text-center py-20">
          <Clock className="w-12 h-12 text-text-muted/30 mx-auto mb-3" />
          <p className="text-text-secondary">No entries yet</p>
        </div>
      ) : (
        <div className="space-y-10">
          {grouped.map(({ year, months: yearMonths }) => (
            <div key={year}>
              <h2 className="heading-md text-text-primary mb-4">{year}</h2>
              {yearMonths.map(({ label, entries: monthEntries }) => (
                <div key={label} className="relative ml-4 pl-6 pb-6 border-l-2 border-border last:pb-0">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-accent border-2 border-surface" />
                  <h3 className="text-sm font-medium text-text-muted mb-3">{label}</h3>
                  <div className="space-y-2">
                    {monthEntries.map((item) => (
                      <div key={item.id} className="relative">
                        {item.type === 'watch_event' && (
                          <div className="absolute -left-[25px] top-3 w-4 h-4 rounded-full border-2 border-accent/40 bg-surface flex items-center justify-center">
                            <Eye className="w-2 h-2 text-accent/60" />
                          </div>
                        )}
                        <TimelineCard
                          entry={item.entry}
                          watchEvent={item.watchEvent}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Entry } from '@/types/database'
import TimelineCard from '@/components/timeline-card'
import { Film, Tv, Clock, Filter } from 'lucide-react'

type ActiveFilter = 'all' | 'movie' | 'series'

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function TimelinePage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ActiveFilter>('all')
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  useEffect(() => {
    getSupabase().auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      getSupabase()
        .from('entries')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'plan_to_watch')
        .order('watch_date', { ascending: false, nullsFirst: false })
        .then(({ data }) => {
          if (data) setEntries(data as Entry[])
          setLoading(false)
        })
    })
  }, [])

  const filtered = useMemo(() => {
    let result = entries.filter(e => e.status !== 'plan_to_watch')
    if (filter === 'movie') result = result.filter(e => e.type === 'movie')
    if (filter === 'series') result = result.filter(e => e.type === 'series')

    result.sort((a, b) => {
      const dateA = a.watch_date || a.created_at
      const dateB = b.watch_date || b.created_at
      const cmp = dateA.localeCompare(dateB)
      return sortOrder === 'desc' ? -cmp : cmp
    })

    return result
  }, [entries, filter, sortOrder])

  const grouped = useMemo(() => {
    const groups: Record<string, Record<string, Entry[]>> = {}

    for (const entry of filtered) {
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
  }, [filtered, sortOrder])

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

      {grouped.length === 0 ? (
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
                    {monthEntries.map((entry) => (
                      <TimelineCard key={entry.id} entry={entry} />
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

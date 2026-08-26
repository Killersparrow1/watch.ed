'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Entry } from '@/types/database'
import EntryCard from '@/components/entry-card'
import {
  Plus,
  Search,
  SlidersHorizontal,
  Target,
  Film,
  Tv,
  Timer,
  BookOpen,
} from 'lucide-react'

type SortKey = 'watch_date' | 'title' | 'rating' | 'year'

interface Props {
  initialEntries: Entry[]
  profileUsername: string
  profileDisplayName: string
  profileAvatarUrl: string | null
}

export default function DashboardClient({ initialEntries, profileUsername, profileDisplayName, profileAvatarUrl }: Props) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries)
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterFavorites, setFilterFavorites] = useState(false)
  const [sort, setSort] = useState<SortKey>('watch_date')
  const [order, setOrder] = useState<'desc' | 'asc'>('desc')
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [goal, setGoal] = useState<{ movie_target: number; series_target: number; episode_target: number; hour_target: number } | null>(null)
  const [progress, setProgress] = useState<{ movies: number; series: number; episodes: number; hours: number } | null>(null)
  const hasFetched = useRef(false)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      const params = new URLSearchParams()
      if (filterType) params.set('type', filterType)
      if (filterStatus) params.set('status', filterStatus)
      if (filterFavorites) params.set('favorite', 'true')
      params.set('sort', sort)
      params.set('order', order)
      if (search) params.set('search', search)

      if (hasFetched.current) setLoading(true)

      const [res, goalsRes] = await Promise.all([
        fetch(`/api/entries?${params}`, { signal: controller.signal }),
        fetch(`/api/goals?year=${new Date().getFullYear()}`, { signal: controller.signal }),
      ])
      if (res.ok) {
        const data = await res.json()
        if (!controller.signal.aborted) {
          setEntries(data.entries || [])
          hasFetched.current = true
        }
      }
      if (goalsRes.ok) {
        const data = await goalsRes.json()
        if (!controller.signal.aborted) {
          setGoal(data.goal)
          setProgress(data.progress)
        }
      }
      if (!controller.signal.aborted) setLoading(false)
    }

    load()
    return () => controller.abort()
  }, [filterType, filterStatus, filterFavorites, sort, order, search])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="heading-lg">Entries</h1>
        <Link
          href="/dashboard/add"
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-sm hover:bg-accent-hover transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add entry
        </Link>

        <Link
          href="/dashboard/add-book"
          className="flex items-center gap-2 px-4 py-2 bg-surface text-text-primary rounded-sm hover:bg-accent-hover transition-colors text-sm font-medium"
        >
          <BookOpen className="w-4 h-4" />
          Add book
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search titles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="px-3 py-2 border border-border bg-surface rounded-sm text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="watch_date">Last logged</option>
            <option value="title">Title</option>
            <option value="rating">Rating</option>
            <option value="year">Year</option>
          </select>

          <button
            onClick={() => setOrder(order === 'desc' ? 'asc' : 'desc')}
            className="px-3 py-2 border border-border bg-surface rounded-sm text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            {order === 'desc' ? '↓' : '↑'}
          </button>

          <button
            onClick={() => setFilterFavorites(!filterFavorites)}
            className={`px-3 py-2 border rounded-sm text-sm transition-colors ${
              filterFavorites
                ? 'border-red-500 text-red-500 bg-red-500/10'
                : 'border-border text-text-secondary bg-surface hover:text-red-400'
            }`}
            title="Show favorites only"
          >
            ♥
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 border rounded-sm text-sm transition-colors ${
              showFilters || filterType || filterStatus
                ? 'border-accent text-accent bg-accent-light'
                : 'border-border text-text-secondary bg-surface hover:text-text-primary'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="flex gap-3 mb-6 p-4 bg-surface border border-border rounded-sm">
          <div>
            <label className="block body-xs text-text-muted mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 border border-border bg-bg rounded-sm text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">All</option>
              <option value="movie">Movies</option>
              <option value="series">Series</option>
            </select>
          </div>
          <div>
            <label className="block body-xs text-text-muted mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 border border-border bg-bg rounded-sm text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">All</option>
              <option value="watching">Watching</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
              <option value="dropped">Dropped</option>
              <option value="plan_to_watch">Plan to Watch</option>
            </select>
          </div>
        </div>
      )}

      {goal && progress && (goal.movie_target > 0 || goal.series_target > 0 || goal.episode_target > 0 || goal.hour_target > 0) && (
        <div className="mb-8 p-5 bg-surface border border-border rounded-sm">
          <h2 className="heading-sm mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-accent" />
            {new Date().getFullYear()} Goals
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {goal.movie_target > 0 && (
              <GoalBar
                icon={<Film className="w-3.5 h-3.5" />}
                label="Movies"
                current={progress.movies}
                target={goal.movie_target}
              />
            )}
            {goal.series_target > 0 && (
              <GoalBar
                icon={<Tv className="w-3.5 h-3.5" />}
                label="Series"
                current={progress.series}
                target={goal.series_target}
              />
            )}
            {goal.episode_target > 0 && (
              <GoalBar
                icon={<Tv className="w-3.5 h-3.5" />}
                label="Episodes"
                current={progress.episodes}
                target={goal.episode_target}
              />
            )}
            {goal.hour_target > 0 && (
              <GoalBar
                icon={<Timer className="w-3.5 h-3.5" />}
                label="Hours"
                current={progress.hours}
                target={goal.hour_target}
              />
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-sm overflow-hidden animate-pulse">
              <div className="aspect-[2/3] bg-tag-bg" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-tag-bg rounded w-3/4" />
                <div className="h-3 bg-tag-bg rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-text-secondary mb-2">No entries yet</p>
          <Link
            href="/dashboard/add"
            className="text-accent hover:text-accent-hover text-sm font-medium transition-colors"
          >
            Add your first entry
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} username={profileUsername} displayName={profileDisplayName} avatarUrl={profileAvatarUrl} />
          ))}
        </div>
      )}
    </div>
  )
}

function GoalBar({ icon, label, current, target }: { icon: React.ReactNode; label: string; current: number; target: number }) {
  const pct = Math.min(Math.round((current / target) * 100), 100)
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-secondary flex items-center gap-1">
          {icon}
          {label}
        </span>
        <span className="text-xs font-medium text-text-primary">{current}/{target}</span>
      </div>
      <div className="h-2 bg-tag-bg rounded-sm overflow-hidden">
        <div
          className={`h-full rounded-sm transition-all ${
            pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-accent' : 'bg-accent/60'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

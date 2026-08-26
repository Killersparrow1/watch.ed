'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Entry, Book } from '@/types/database'
import EntryCard from '@/components/entry-card'
import BookCard from '@/components/book-card'
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
  initialBooks?: Book[]
  profileUsername: string
  profileDisplayName: string
  profileAvatarUrl: string | null
}

export default function DashboardClient({
  initialEntries,
  initialBooks = [],
  profileUsername,
  profileDisplayName,
  profileAvatarUrl,
}: Props) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries)
  const [books, setBooks] = useState<Book[]>(initialBooks)
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterFavorites, setFilterFavorites] = useState(false)
  const [sort, setSort] = useState<SortKey>('watch_date')
  const [order, setOrder] = useState<'desc' | 'asc'>('desc')
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [goal, setGoal] = useState<{
    movie_target: number
    series_target: number
    episode_target: number
    hour_target: number
  } | null>(null)
  const [progress, setProgress] = useState<{
    movies: number
    series: number
    episodes: number
    hours: number
  } | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      const params = new URLSearchParams()
      if (filterType && filterType !== 'book') params.set('type', filterType)
      if (filterFavorites) params.set('favorite', 'true')
      params.set('sort', sort)
      params.set('order', order)
      if (search) params.set('search', search)

      const promises: Promise<Response>[] = [
        fetch(`/api/goals?year=${new Date().getFullYear()}`, { signal: controller.signal }),
      ]

      if (filterType !== 'book') {
        promises.push(fetch(`/api/entries?${params}`, { signal: controller.signal }))
      }
      if (filterType !== 'movie' && filterType !== 'series' && !filterFavorites) {
        const bookParams = new URLSearchParams()
        if (search) bookParams.set('search', search)
        promises.push(fetch(`/api/books?${bookParams}`, { signal: controller.signal }))
      }

      try {
        const results = await Promise.all(promises)
        const goalsRes = results[0]
        if (goalsRes && goalsRes.ok) {
          const data = await goalsRes.json()
          if (!controller.signal.aborted) {
            setGoal(data.goal)
            setProgress(data.progress)
          }
        }

        let idx = 1
        if (filterType !== 'book') {
          const entriesRes = results[idx++]
          if (entriesRes && entriesRes.ok) {
            const data = await entriesRes.json()
            if (!controller.signal.aborted) {
              setEntries(data.entries || [])
            }
          }
        } else {
          setEntries([])
        }

        if (filterType !== 'movie' && filterType !== 'series' && !filterFavorites) {
          const booksRes = results[idx++]
          if (booksRes && booksRes.ok) {
            const data = await booksRes.json()
            if (!controller.signal.aborted) {
              setBooks(data.books || [])
            }
          }
        } else {
          setBooks([])
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Failed to load dashboard data:', err)
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [filterType, filterFavorites, sort, order, search])

  async function setBookStatus(bookId: string, newStatus: string) {
    // Optimistic update
    setBooks((prevBooks) =>
      prevBooks.map((b) =>
        b.id === bookId ? { ...b, status: newStatus as Book['status'] } : b
      )
    )

    const res = await fetch('/api/books', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bookId, status: newStatus }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.book) {
        setBooks((prevBooks) =>
          prevBooks.map((b) => (b.id === bookId ? data.book : b))
        )
      }
    }
  }

  async function deleteBook(bookId: string) {
    // Optimistic update
    setBooks((prevBooks) => prevBooks.filter((b) => b.id !== bookId))

    const res = await fetch('/api/books', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bookId }),
    })
    if (!res.ok) {
      // Reload on failure
      const r = await fetch('/api/books')
      if (r.ok) {
        const data = await r.json()
        setBooks(data.books || [])
      }
    }
  }

  // Unified items list containing both movie/series entries and books
  const unifiedItems = useMemo(() => {
    const items: Array<
      | { kind: 'entry'; data: Entry; date: string; title: string; rating: number; year: number }
      | { kind: 'book'; data: Book; date: string; title: string; rating: number; year: number }
    > = []

    // 1. Add entries
    for (const entry of entries) {
      items.push({
        kind: 'entry',
        data: entry,
        date: entry.watch_date || entry.created_at || '',
        title: entry.title || '',
        rating: entry.rating ?? -1,
        year: entry.year ?? 0,
      })
    }

    // 2. Add books
    for (const book of books) {
      let pubYear = 0
      if (book.published_date) {
        pubYear = parseInt(book.published_date) || 0
      } else if (book.created_at) {
        pubYear = new Date(book.created_at).getFullYear() || 0
      }

      items.push({
        kind: 'book',
        data: book,
        date: book.created_at || '',
        title: book.title || '',
        rating: book.rating ?? -1,
        year: pubYear,
      })
    }

    // 3. Filter items
    const q = search.trim().toLowerCase()
    const filtered = items.filter((item) => {
      // Type filter
      if (filterType === 'movie' && (item.kind !== 'entry' || item.data.type !== 'movie')) return false
      if (filterType === 'series' && (item.kind !== 'entry' || item.data.type !== 'series')) return false
      if (filterType === 'book' && item.kind !== 'book') return false

      // Status filter
      if (filterStatus) {
        if (item.kind === 'entry') {
          if (item.data.status !== filterStatus) return false
        } else {
          const bookStatusMap: Record<string, string> = {
            watching: 'currently_reading',
            completed: 'read',
            dropped: 'did_not_finish',
            plan_to_watch: 'want_to_read',
          }
          if (filterStatus === 'on_hold') return false
          if (item.data.status !== bookStatusMap[filterStatus]) return false
        }
      }

      // Favorites filter
      if (filterFavorites) {
        if (item.kind !== 'entry' || !item.data.favorite) return false
      }

      // Search filter
      if (q) {
        if (item.kind === 'entry') {
          const matchTitle = item.data.title?.toLowerCase().includes(q)
          const matchOverview = item.data.overview?.toLowerCase().includes(q)
          const matchCast = item.data.cast_crew?.toLowerCase().includes(q)
          const matchNotes = item.data.notes?.toLowerCase().includes(q)
          if (!matchTitle && !matchOverview && !matchCast && !matchNotes) return false
        } else {
          const matchTitle = item.data.title?.toLowerCase().includes(q)
          const matchAuthors = item.data.authors?.some((a) => a.toLowerCase().includes(q))
          const matchNotes = item.data.notes?.toLowerCase().includes(q)
          if (!matchTitle && !matchAuthors && !matchNotes) return false
        }
      }

      return true
    })

    // 4. Sort items
    filtered.sort((a, b) => {
      let cmp = 0
      if (sort === 'watch_date') {
        const timeA = a.date ? new Date(a.date).getTime() : 0
        const timeB = b.date ? new Date(b.date).getTime() : 0
        cmp = timeA - timeB
      } else if (sort === 'title') {
        cmp = a.title.localeCompare(b.title)
      } else if (sort === 'rating') {
        cmp = a.rating - b.rating
      } else if (sort === 'year') {
        cmp = a.year - b.year
      }
      return order === 'desc' ? -cmp : cmp
    })

    return filtered
  }, [entries, books, filterType, filterStatus, filterFavorites, search, sort, order])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="heading-lg">Entries</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/add"
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-sm hover:bg-accent-hover transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add entry
          </Link>
          <Link
            href="/dashboard/add-book"
            className="flex items-center gap-2 px-4 py-2 bg-surface text-text-primary rounded-sm hover:border-accent hover:text-accent transition-colors text-sm font-medium border border-border"
          >
            <BookOpen className="w-4 h-4" />
            Add book
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search titles, authors, reviews..."
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
            title={order === 'desc' ? 'Descending' : 'Ascending'}
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
            title="Filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-surface border border-border rounded-sm">
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
              <option value="book">Books</option>
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
              <option value="watching">Watching / Reading</option>
              <option value="completed">Completed / Read</option>
              <option value="on_hold">On Hold</option>
              <option value="dropped">Dropped / DNF</option>
              <option value="plan_to_watch">Plan to Watch / Want to Read</option>
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
      ) : unifiedItems.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-text-secondary mb-2">No entries yet</p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/dashboard/add"
              className="text-accent hover:text-accent-hover text-sm font-medium transition-colors"
            >
              Add movie or series
            </Link>
            <span className="text-text-muted">·</span>
            <Link
              href="/dashboard/add-book"
              className="text-accent hover:text-accent-hover text-sm font-medium transition-colors"
            >
              Add book
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {unifiedItems.map((item) =>
            item.kind === 'entry' ? (
              <EntryCard
                key={`entry-${item.data.id}`}
                entry={item.data}
                username={profileUsername}
                displayName={profileDisplayName}
                avatarUrl={profileAvatarUrl}
              />
            ) : (
              <BookCard
                key={`book-${item.data.id}`}
                book={item.data}
                onStatusChange={setBookStatus}
                onDelete={deleteBook}
              />
            )
          )}
        </div>
      )}
    </div>
  )
}

function GoalBar({
  icon,
  label,
  current,
  target,
}: {
  icon: React.ReactNode
  label: string
  current: number
  target: number
}) {
  const pct = Math.min(Math.round((current / target) * 100), 100)
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-secondary flex items-center gap-1">
          {icon}
          {label}
        </span>
        <span className="text-xs font-medium text-text-primary">
          {current}/{target}
        </span>
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

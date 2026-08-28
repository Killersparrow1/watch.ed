'use client'

import { useState, useMemo } from 'react'
import { Entry, Book } from '@/types/database'
import EntryCard from '@/components/entry-card'
import BookCard from '@/components/book-card'
import { Search, SlidersHorizontal, Film, Tv, BookOpen, X } from 'lucide-react'

type SortKey = 'date' | 'title' | 'rating' | 'year'

interface Props {
  initialEntries: Entry[]
  initialBooks: Book[]
  profileUsername: string
  profileDisplayName: string
  profileAvatarUrl: string | null
}

export default function UnifiedTimeline({
  initialEntries,
  initialBooks = [],
  profileUsername,
  profileDisplayName,
  profileAvatarUrl,
}: Props) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries)
  const [books, setBooks] = useState<Book[]>(initialBooks)
  const [filterType, setFilterType] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [sort, setSort] = useState<SortKey>('date')
  const [order, setOrder] = useState<'desc' | 'asc'>('desc')
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const typeFilters = [
    { key: '', label: 'All', icon: null },
    { key: 'movie', label: 'Movies', icon: Film },
    { key: 'series', label: 'Series', icon: Tv },
    { key: 'book', label: 'Books', icon: BookOpen },
  ]

  const statusFilters = [
    { key: '', label: 'All' },
    { key: 'watching', label: 'Watching / Reading' },
    { key: 'completed', label: 'Completed / Read' },
    { key: 'on_hold', label: 'On Hold' },
    { key: 'dropped', label: 'Dropped / DNF' },
    { key: 'plan_to_watch', label: 'Plan to Watch / Want to Read' },
  ]

  async function setBookStatus(bookId: string, newStatus: string) {
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
    setBooks((prevBooks) => prevBooks.filter((b) => b.id !== bookId))

    const res = await fetch('/api/books', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bookId }),
    })
    if (!res.ok) {
      const r = await fetch('/api/books')
      if (r.ok) {
        const data = await r.json()
        setBooks(data.books || [])
      }
    }
  }

  const unifiedItems = useMemo(() => {
    const items: Array<
      | { kind: 'entry'; data: Entry; date: string; title: string; rating: number; year: number }
      | { kind: 'book'; data: Book; date: string; title: string; rating: number; year: number }
    > = []

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

    const q = search.trim().toLowerCase()
    const filtered = items.filter((item) => {
      if (filterType === 'movie' && (item.kind !== 'entry' || item.data.type !== 'movie')) return false
      if (filterType === 'series' && (item.kind !== 'entry' || item.data.type !== 'series')) return false
      if (filterType === 'book' && item.kind !== 'book') return false

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

    filtered.sort((a, b) => {
      let cmp = 0
      if (sort === 'date') {
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
  }, [entries, books, filterType, filterStatus, search, sort, order])

  if (unifiedItems.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-text-secondary mb-2">No entries or books yet</p>
      </div>
    )
  }

  const sortOptions = [
    { key: 'date' as const, label: 'Date logged' },
    { key: 'title' as const, label: 'Title' },
    { key: 'rating' as const, label: 'Rating' },
    { key: 'year' as const, label: 'Year' },
  ]

  return (
    <div>
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

        <div className="flex items-center gap-1 ml-auto">
          <div className="flex items-center gap-0.5 mr-2 pr-2 border-r border-border">
            {sortOptions.map(opt => (
              <button
                key={opt.key}
                onClick={() => {
                  if (sort === opt.key) setOrder(order === 'desc' ? 'asc' : 'desc')
                  else { setSort(opt.key); setOrder('desc') }
                }}
                className={`px-2 py-1 text-xs rounded-sm transition-colors ${
                  sort === opt.key
                    ? 'text-text-primary bg-surface border border-border'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {opt.label}
                {sort === opt.key && <span className="ml-1">{order === 'desc' ? '↓' : '↑'}</span>}
              </button>
            ))}
          </div>
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
            <div className="flex flex-wrap gap-1.5 bg-bg border border-border rounded-sm p-1.5">
              {typeFilters.map(t => (
                <button
                  key={t.key}
                  onClick={() => setFilterType(t.key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-sm transition-colors ${
                    filterType === t.key
                      ? 'bg-accent text-white'
                      : 'text-text-muted hover:text-text-primary hover:bg-background'
                  }`}
                >
                  {t.icon && <t.icon className="w-3 h-3" />}
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block body-xs text-text-muted mb-1">Status</label>
            <div className="flex flex-wrap gap-1.5 bg-bg border border-border rounded-sm p-1.5">
              {statusFilters.map(s => (
                <button
                  key={s.key}
                  onClick={() => setFilterStatus(s.key)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-colors ${
                    filterStatus === s.key
                      ? 'bg-accent text-white'
                      : 'text-text-muted hover:text-text-primary hover:bg-background'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {(filterType || filterStatus) && (
            <button
              onClick={() => { setFilterType(''); setFilterStatus(''); }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-text-muted hover:text-accent transition-colors bg-bg border border-border rounded-sm self-end"
            >
              <X className="w-3 h-3" />
              Clear filters
            </button>
          )}
        </div>
      )}

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
    </div>
  )
}
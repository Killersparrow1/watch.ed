'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, BookOpen, ArrowLeft, Star, ShoppingBag, ExternalLink, Sparkles, Undo2 } from 'lucide-react'
import Link from 'next/link'
import BookProvidersModal from '@/components/book-providers-modal'

interface OpenLibraryResult {
  title: string
  author_name: string[]
  first_publish_year: number | null
  isbn: string[]
  cover_i: number | null
  oclc: string | null
  ia: string | null
}

export default function AddBookPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<OpenLibraryResult[]>([])
  const [searching, setSearching] = useState(false)
  const [previewModalBook, setPreviewModalBook] = useState<{
    title: string
    authors?: string[]
    isbn?: string | null
    open_library_id?: string | null
    cover_url?: string | null
  } | null>(null)
  const [form, setForm] = useState({
    title: '',
    authors: '' as string,
    isbn: '' as string | null,
    status: 'want_to_read' as 'want_to_read' | 'currently_reading' | 'read' | 'did_not_finish',
    rating: '' as string | null,
    progress: '' as string | null,
    notes: '' as string,
    cover_url: '' as string | null,
    open_library_id: '' as string | null,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [coverError, setCoverError] = useState<number>(0)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const [rephrasing, setRephrasing] = useState(false)
  const [originalNotes, setOriginalNotes] = useState<string | null>(null)
  const [rephraseError, setRephraseError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
    })
  }, [])

  async function handleSearch(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.length < 2) {
      setResults([])
      return
    }

    // Check if input looks like ISBN (10 or 13 digits, possibly with hyphens/spaces)
    const isbnPattern = /^\d{10}(\d{3})?$|^\d{13}$/;
    const cleaned = value.replace(/[\s\-]+/g, '');

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        let results: any[] = []
        if (isbnPattern.test(cleaned)) {
          // Search by ISBN
          const res = await fetch(`https://openlibrary.org/search.json?isbn=${encodeURIComponent(cleaned)}`)
          const data = await res.json()
          results = data.docs || []
        } else {
          // Search by title
          const res = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(value)}`)
          const data = await res.json()
          results = data.docs || []
        }
        setResults(results)
      } catch {
        setResults([])
      }
      setSearching(false)
    }, 400)
  }

  async function handleRephrase() {
    const text = form.notes.trim()
    if (!text) {
      setRephraseError('Write a review first')
      return
    }
    setRephrasing(true)
    setRephraseError(null)
    setOriginalNotes(form.notes)

    try {
      const res = await fetch('/api/rephrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, title: form.title }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to rephrase')
      setForm(prev => ({ ...prev, notes: data.rephrased }))
    } catch (e) {
      setRephraseError(e instanceof Error ? e.message : 'Failed to rephrase')
      setOriginalNotes(null)
    } finally {
      setRephrasing(false)
    }
  }

  function handleUndo() {
    if (originalNotes !== null) {
      setForm(prev => ({ ...prev, notes: originalNotes }))
      setOriginalNotes(null)
      setRephraseError(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const progressNum = form.progress ? parseInt(form.progress) : 0
    const ratingNum = form.rating ? parseInt(form.rating) : null

    const body = {
      title: form.title.trim(),
      authors: form.authors.split(',').map((a: string) => a.trim()).filter((a: string) => a.length > 0),
      isbn: form.isbn || null,
      status: form.status,
      rating: ratingNum,
      progress: progressNum,
      notes: form.notes.trim(),
      cover_url: form.cover_url || null,
      open_library_id: form.open_library_id || null,
    }

    const res = await fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Failed to save book')
      setSaving(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  function handleSelectResult(item: OpenLibraryResult) {
    setForm(prev => ({
      ...prev,
      title: item.title,
      authors: item.author_name ? item.author_name.join(', ') : '',
      isbn: item.isbn?.[0] || null,
      cover_url: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg` : '',
      open_library_id: item.title.toLowerCase().replace(/\s+/g, '-'),
    }))

    setQuery('')
    setResults([])
  }

  return (
    <div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="heading-lg">Add book</h1>

        {form.title.trim() && (
          <button
            type="button"
            onClick={() =>
              setPreviewModalBook({
                title: form.title.trim(),
                authors: form.authors
                  ? form.authors.split(',').map((a) => a.trim()).filter(Boolean)
                  : [],
                isbn: form.isbn,
                open_library_id: form.open_library_id,
                cover_url: form.cover_url,
              })
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border hover:border-accent text-xs font-medium text-text-primary rounded-sm transition-colors shadow-sm"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-accent" />
            Check Read & Buy Options
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-text-primary mb-1.5">
            Title *
          </label>
          <input
            id="title"
            type="text"
            value={form.title}
            onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="authors" className="block text-sm font-medium text-text-primary mb-1.5">
              Authors
            </label>
            <input
              id="authors"
              type="text"
              value={form.authors}
              onChange={(e) => setForm(prev => ({ ...prev, authors: e.target.value }))}
              className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
              placeholder="e.g. J.K. Rowling"
            />
          </div>

          <div>
            <label htmlFor="isbn" className="block text-sm font-medium text-text-primary mb-1.5">
              ISBN
            </label>
            <input
              id="isbn"
              type="text"
              value={form.isbn || ''}
              onChange={(e) => setForm(prev => ({ ...prev, isbn: e.target.value }))}
              className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
              placeholder="ISBN-13 or ISBN-10"
            />
          </div>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-text-primary mb-1.5">
            Status
          </label>
          <select
            id="status"
            value={form.status}
            onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value as 'want_to_read' | 'currently_reading' | 'read' | 'did_not_finish' }))}
            className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="want_to_read">Want to Read</option>
            <option value="currently_reading">Currently Reading</option>
            <option value="read">Read</option>
            <option value="did_not_finish">Did Not Finish</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="rating" className="block text-sm font-medium text-text-primary mb-1.5">
              Rating (1-10)
            </label>
            <div className="relative">
              <Star className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rating" />
              <input
                id="rating"
                type="number"
                min="1"
                max="10"
                value={form.rating || ''}
                onChange={(e) => setForm(prev => ({ ...prev, rating: e.target.value }))}
                className="w-full pl-9 pr-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
                placeholder="Rate 1-10"
              />
            </div>
          </div>

          <div>
            <label htmlFor="progress" className="block text-sm font-medium text-text-primary mb-1.5">
              Pages read
            </label>
            <input
              id="progress"
              type="number"
              min="0"
              value={form.progress || ''}
              onChange={(e) => setForm(prev => ({ ...prev, progress: e.target.value }))}
              className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
              placeholder="Pages read so far"
            />
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-text-primary mb-1.5">
            Notes / Review
          </label>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              {originalNotes !== null && (
                <button
                  type="button"
                  onClick={handleUndo}
                  className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
                >
                  <Undo2 className="w-3 h-3" />
                  Undo
                </button>
              )}
              <button
                type="button"
                onClick={handleRephrase}
                disabled={rephrasing || !form.notes.trim()}
                className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles className={`w-3 h-3 ${rephrasing ? 'animate-pulse' : ''}`} />
                {rephrasing ? 'Rephrasing...' : 'Rephrase'}
              </button>
            </div>
          </div>
          <textarea
            id="notes"
            rows={3}
            value={form.notes}
            onChange={(e) => {
              setForm(prev => ({ ...prev, notes: e.target.value }))
              setOriginalNotes(null)
            }}
            className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors resize-y"
            placeholder="Your thoughts on this book..."
          />
          {rephraseError && (
            <p className="mt-1 text-xs text-accent">{rephraseError}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="cover_url" className="block text-sm font-medium text-text-primary mb-1.5">
              Cover URL
            </label>
            <input
              id="cover_url"
              type="text"
              value={form.cover_url || ''}
              onChange={(e) => setForm(prev => ({ ...prev, cover_url: e.target.value }))}
              className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
              placeholder="Book cover URL"
            />
          </div>

          <div>
            <label htmlFor="open_library_id" className="block text-sm font-medium text-text-primary mb-1.5">
              Open Library ID
            </label>
            <input
              id="open_library_id"
              type="text"
              value={form.open_library_id || ''}
              onChange={(e) => setForm(prev => ({ ...prev, open_library_id: e.target.value }))}
              className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
              placeholder="OLID or OL key"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-text-primary">
              Search by title, author, or ISBN
            </label>
            <div className="flex items-center gap-2">
              <Search className="w-3 h-3 text-text-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                className="flex-1 px-3 py-2 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
                placeholder="Search Open Library..."
              />
            </div>
          </div>

          {searching && (
            <p className="text-sm text-text-muted">Searching...</p>
          )}

          {results.length > 0 && (
            <div className="mt-3 max-h-80 overflow-y-auto space-y-2">
              {results.slice(0, 8).map((item) => {
                const coverId = item.cover_i
                const cover_url = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : undefined

                return (
                  <div
                    key={item.title + (item.isbn?.[0] || '')}
                    className="flex items-center justify-between gap-3 px-3 py-2 border border-border rounded-sm text-sm transition-colors hover:border-accent group"
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectResult(item)}
                      className="flex items-center gap-3 flex-1 text-left min-w-0"
                    >
                      <div className="w-10 h-14 rounded-sm overflow-hidden flex-shrink-0 bg-tag-bg">
                        {coverId ? (
                          <img
                            src={cover_url}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={() => setCoverError(prev => prev + 1)}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-text-muted/40" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium line-clamp-1 group-hover:text-accent transition-colors">
                          {item.title}
                        </p>
                        <p className="body-xs text-text-secondary line-clamp-1">
                          {item.author_name?.[0] || 'Unknown Author'} · {item.first_publish_year || 'N/A'}
                        </p>
                        {item.isbn?.[0] && (
                          <p className="text-[10px] text-text-muted font-mono">
                            ISBN: {item.isbn[0]}
                          </p>
                        )}
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewModalBook({
                            title: item.title,
                            authors: item.author_name || [],
                            isbn: item.isbn?.[0] || null,
                            cover_url,
                          })
                        }
                        className="p-1.5 rounded-sm bg-surface hover:bg-surface-hover border border-border text-text-secondary hover:text-accent transition-colors"
                        title="Preview Read & Buy Options"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectResult(item)}
                        className="px-2.5 py-1 bg-accent/10 hover:bg-accent text-accent hover:text-white rounded-sm text-xs font-medium transition-colors"
                      >
                        Use
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {results.length === 0 && searching && (
            <p className="text-sm text-text-muted">No results found</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || !form.title.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-sm hover:bg-accent-hover transition-colors disabled:opacity-50 text-sm font-medium"
          >
            <Star className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save book'}
          </button>
          <Link
            href="/dashboard"
            className="px-6 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>

      {previewModalBook && (
        <BookProvidersModal
          book={previewModalBook}
          isOpen={!!previewModalBook}
          onClose={() => setPreviewModalBook(null)}
        />
      )}
    </div>
  )
}


'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { TMDBResult, getPosterUrl } from '@/lib/tmdb'
import { Search, Plus, Star, Film, Tv, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AddEntryPage() {
  const router = useRouter()
  const [, setStep] = useState<'search' | 'manual'>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TMDBResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<TMDBResult | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const [form, setForm] = useState({
    title: '',
    type: 'movie' as 'movie' | 'series',
    status: 'plan_to_watch' as string,
    rating: '',
    progress_season: '',
    progress_episode: '',
    watch_date: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSearch(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.length < 2) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/tmdb?query=${encodeURIComponent(value)}`)
        const data = await res.json()
        setResults(data.results || [])
      } catch {
        setResults([])
      }
      setSearching(false)
    }, 400)
  }

  function selectResult(item: TMDBResult) {
    setSelected(item)
    setForm(prev => ({
      ...prev,
      title: item.title,
      type: item.media_type,
      watch_date: item.year ? String(item.year) : '',
    }))
    setQuery('')
    setResults([])
  }

  function clearSelected() {
    setSelected(null)
    setForm(prev => ({
      ...prev,
      title: '',
      type: 'movie',
      watch_date: '',
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const body: Record<string, unknown> = {
      title: form.title.trim(),
      type: form.type,
      status: form.status,
      rating: form.rating ? parseInt(form.rating) : null,
      progress_season: form.progress_season ? parseInt(form.progress_season) : null,
      progress_episode: form.progress_episode ? parseInt(form.progress_episode) : null,
      watch_date: form.watch_date || null,
      notes: form.notes || null,
    }

    if (selected) {
      body.tmdb_id = selected.tmdb_id
      body.poster_path = selected.poster_path
      body.year = selected.year
      body.genres = selected.genres
      body.overview = selected.overview
    }

    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Failed to save entry')
      setSaving(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to entries
      </Link>

      <h1 className="heading-lg mb-8">Add entry</h1>

      {!selected && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search TMDB for a title..."
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
              />
            </div>
            <span className="text-xs text-text-muted">or</span>
            <button
              onClick={() => setStep('manual')}
              className="px-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Enter manually
            </button>
          </div>

          {searching && (
            <p className="text-sm text-text-muted">Searching...</p>
          )}

          {results.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-4">
              {results.map((item) => {
                const poster = getPosterUrl(item.poster_path, 'w185')
                return (
                  <button
                    key={`${item.media_type}-${item.tmdb_id}`}
                    onClick={() => selectResult(item)}
                    className="bg-surface border border-border rounded-sm overflow-hidden text-left hover:border-accent transition-colors group"
                  >
                    <div className="aspect-[2/3] bg-tag-bg overflow-hidden">
                      {poster ? (
                        <img src={poster} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {item.media_type === 'movie' ? (
                            <Film className="w-6 h-6 text-text-muted/40" />
                          ) : (
                            <Tv className="w-6 h-6 text-text-muted/40" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-sm font-medium leading-tight line-clamp-2">{item.title}</p>
                      <p className="body-xs text-text-muted mt-1">
                        {item.year || 'N/A'} · {item.media_type === 'movie' ? 'Film' : 'Series'}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {selected && (
        <div className="flex gap-4 items-start mb-6 p-4 bg-surface border border-border rounded-sm">
          <div className="w-20 flex-shrink-0">
            {getPosterUrl(selected.poster_path, 'w185') ? (
              <img src={getPosterUrl(selected.poster_path, 'w185')!} alt={selected.title} className="w-full rounded-sm" />
            ) : (
              <div className="aspect-[2/3] bg-tag-bg rounded-sm flex items-center justify-center">
                <Film className="w-5 h-5 text-text-muted/40" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="heading-sm">{selected.title}</p>
            <p className="body-small text-text-secondary mt-1">
              {selected.year || 'N/A'} · {selected.media_type === 'movie' ? 'Film' : 'Series'}
              {selected.overview && ` · ${selected.overview.slice(0, 120)}...`}
            </p>
          </div>
          <button
            onClick={clearSelected}
            className="text-xs text-accent hover:text-accent-hover whitespace-nowrap"
          >
            Change
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
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
            <label htmlFor="type" className="block text-sm font-medium text-text-primary mb-1.5">
              Type
            </label>
            <select
              id="type"
              value={form.type}
              onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value as 'movie' | 'series' }))}
              className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="movie">Movie</option>
              <option value="series">Series</option>
            </select>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-text-primary mb-1.5">
              Status
            </label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="plan_to_watch">Plan to Watch</option>
              <option value="watching">Watching</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
              <option value="dropped">Dropped</option>
            </select>
          </div>
        </div>

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
              value={form.rating}
              onChange={(e) => setForm(prev => ({ ...prev, rating: e.target.value }))}
              className="w-full pl-9 pr-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
              placeholder="Rate 1-10"
            />
          </div>
        </div>

        {form.type === 'series' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="season" className="block text-sm font-medium text-text-primary mb-1.5">
                Season
              </label>
              <input
                id="season"
                type="number"
                min="1"
                value={form.progress_season}
                onChange={(e) => setForm(prev => ({ ...prev, progress_season: e.target.value }))}
                className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
                placeholder="Season #"
              />
            </div>
            <div>
              <label htmlFor="episode" className="block text-sm font-medium text-text-primary mb-1.5">
                Episode
              </label>
              <input
                id="episode"
                type="number"
                min="1"
                value={form.progress_episode}
                onChange={(e) => setForm(prev => ({ ...prev, progress_episode: e.target.value }))}
                className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
                placeholder="Episode #"
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="date" className="block text-sm font-medium text-text-primary mb-1.5">
            Watch date
          </label>
          <input
            id="date"
            type="text"
            value={form.watch_date}
            onChange={(e) => setForm(prev => ({ ...prev, watch_date: e.target.value }))}
            className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
            placeholder="e.g., 2024-03-15 or March 2024"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-text-primary mb-1.5">
            Notes / Review
          </label>
          <textarea
            id="notes"
            rows={4}
            value={form.notes}
            onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors resize-y"
            placeholder="Your thoughts on this title..."
          />
        </div>

        {error && (
          <p className="text-sm text-accent bg-accent-light px-3 py-2 rounded-sm">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving || !form.title.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-sm hover:bg-accent-hover transition-colors disabled:opacity-50 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save entry'}
          </button>
          <Link
            href="/dashboard"
            className="px-6 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

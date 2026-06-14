'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { TMDBResult, getPosterUrl } from '@/lib/tmdb'
import { Search, Plus, Star, Film, Tv, ArrowLeft, Award, Zap, ThumbsDown, Sparkles, Undo2 } from 'lucide-react'
import Link from 'next/link'

export default function AddEntryPage() {
  const router = useRouter()
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
    notes: '',
    watch_date: '',
    progress_season: '',
    progress_episode: '',
    badge: '' as string,
    tagline: '' as string,
    cast_crew: '' as string,
    runtime: '' as string,
    custom_poster_url: '' as string,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rephrasing, setRephrasing] = useState(false)
  const [originalNotes, setOriginalNotes] = useState<string | null>(null)
  const [rephraseError, setRephraseError] = useState<string | null>(null)

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
        body: JSON.stringify({ text }),
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

    if (item.tmdb_id) {
      fetch(`/api/tmdb?tmdb_id=${item.tmdb_id}&type=${item.media_type}`)
        .then(r => r.json())
        .then(data => {
          if (data.result) {
            setSelected(prev => prev ? { ...prev, ...data.result } : prev)
          }
        })
        .catch(() => {})
    }
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
      badge: form.badge || null,
      progress_season: form.progress_season ? parseInt(form.progress_season) : null,
      progress_episode: form.progress_episode || null,
      watch_date: form.watch_date || null,
      notes: form.notes || null,
      runtime: form.runtime ? parseInt(form.runtime) : null,
      custom_poster_url: form.custom_poster_url || null,
    }

    if (selected) {
      body.tmdb_id = selected.tmdb_id
      body.poster_path = selected.poster_path
      body.year = selected.year
      body.genres = selected.genres
      body.overview = selected.overview
      body.runtime = selected.runtime
      body.tagline = selected.tagline || null
      body.cast_crew = selected.cast_crew || null
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

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Badge
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, badge: prev.badge === 'golden' ? '' : 'golden' }))}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-sm text-sm transition-colors ${
                form.badge === 'golden'
                  ? 'border-rating bg-rating/10 text-rating'
                  : 'border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              <Award className="w-4 h-4" />
              Golden ticket
            </button>
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, badge: prev.badge === 'literal shit' ? '' : 'literal shit' }))}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-sm text-sm transition-colors ${
                form.badge === 'literal shit'
                  ? 'border-text-primary bg-text-primary/10 text-text-primary'
                  : 'border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
              Literal shit
            </button>
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, badge: prev.badge === 'lamo' ? '' : 'lamo' }))}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-sm text-sm transition-colors ${
                form.badge === 'lamo'
                  ? 'border-[#8B5CF6] bg-[#8B5CF6]/10 text-[#8B5CF6]'
                  : 'border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              <Zap className="w-4 h-4" />
              LAMO
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="runtime" className="block text-sm font-medium text-text-primary mb-1.5">
            Runtime (minutes)
          </label>
          <input
            id="runtime"
            type="number"
            min="1"
            value={form.runtime || ''}
            onChange={(e) => setForm(prev => ({ ...prev, runtime: e.target.value }))}
            className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
            placeholder="Leave empty to auto-fetch from TMDB"
          />
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
                Episodes watched
              </label>
              <input
                id="episode"
                type="text"
                value={form.progress_episode}
                onChange={(e) => setForm(prev => ({ ...prev, progress_episode: e.target.value }))}
                className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
                placeholder='e.g. "1-5" or "1,3,5-7" or "all"'
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
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="notes" className="text-sm font-medium text-text-primary">
              Notes / Review
            </label>
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
            rows={4}
            value={form.notes}
            onChange={(e) => {
              setForm(prev => ({ ...prev, notes: e.target.value }))
              setOriginalNotes(null)
            }}
            className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors resize-y"
            placeholder="Your thoughts on this title..."
          />
          {rephraseError && (
            <p className="mt-1 text-xs text-accent">{rephraseError}</p>
          )}
        </div>

        <div>
          <label htmlFor="custom_poster" className="block text-sm font-medium text-text-primary mb-1.5">
            Custom poster URL
          </label>
          <input
            id="custom_poster"
            type="url"
            value={form.custom_poster_url}
            onChange={(e) => setForm(prev => ({ ...prev, custom_poster_url: e.target.value }))}
            className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
            placeholder="https://example.com/poster.jpg"
          />
          {form.custom_poster_url && (
            <img
              src={form.custom_poster_url}
              alt="Poster preview"
              className="mt-2 w-20 rounded-sm"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
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

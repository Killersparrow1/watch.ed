'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Entry } from '@/types/database'
import { getEntryPosterUrl } from '@/lib/tmdb'
import { Save, ArrowLeft, Trash2, Star, Award, Zap, ThumbsDown, Sparkles, Undo2 } from 'lucide-react'
import Link from 'next/link'

export default function EditEntryPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [entry, setEntry] = useState<Entry | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [rephrasing, setRephrasing] = useState(false)
  const [originalNotes, setOriginalNotes] = useState<string | null>(null)
  const [rephraseError, setRephraseError] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    type: 'movie' as 'movie' | 'series',
    status: 'plan_to_watch' as string,
    rating: '',
    badge: '' as string,
    progress_season: '',
    progress_episode: '',
    watch_date: '',
    notes: '',
    tagline: '',
    cast_crew: '',
    runtime: '' as string,
    custom_poster_url: '' as string,
  })

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/entries/${id}`)
      if (!res.ok) {
        router.push('/dashboard')
        return
      }
      const data = await res.json()
      setEntry(data.entry)
      setForm({
        title: data.entry.title || '',
        type: data.entry.type || 'movie',
        status: data.entry.status || 'plan_to_watch',
        rating: data.entry.rating ? String(data.entry.rating) : '',
        badge: data.entry.badge || '',
        progress_season: data.entry.progress_season ? String(data.entry.progress_season) : '',
        progress_episode: data.entry.progress_episode || '',
        watch_date: data.entry.watch_date || '',
        notes: data.entry.notes || '',
        tagline: data.entry.tagline || '',
        cast_crew: data.entry.cast_crew || '',
        runtime: data.entry.runtime ? String(data.entry.runtime) : '',
        custom_poster_url: data.entry.custom_poster_url || '',
      })
      setLoading(false)
    }
    load()
  }, [id, router])

  async function handleSave(e: React.FormEvent) {
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
      tagline: form.tagline || null,
      cast_crew: form.cast_crew || null,
      runtime: form.runtime ? parseInt(form.runtime) : null,
      custom_poster_url: form.custom_poster_url || null,
    }

    const res = await fetch(`/api/entries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Failed to save')
      setSaving(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/dashboard')
      router.refresh()
    } else {
      setError('Failed to delete')
      setDeleting(false)
    }
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
        body: JSON.stringify({ text, title: entry?.title || form.title, year: entry?.year }),
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

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-tag-bg rounded w-1/3" />
        <div className="h-12 bg-tag-bg rounded w-full" />
        <div className="h-12 bg-tag-bg rounded w-full" />
      </div>
    )
  }

  if (!entry) return null

  const poster = getEntryPosterUrl(entry, 'w185')

  return (
    <div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to entries
      </Link>

      <div className="flex items-start justify-between mb-8">
        <h1 className="heading-lg">Edit entry</h1>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-accent hover:bg-accent-light rounded-sm transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">Confirm delete?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 bg-accent text-white rounded-sm text-sm hover:bg-accent-hover transition-colors"
            >
              {deleting ? 'Deleting...' : 'Yes, delete'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 border border-border rounded-sm text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-4 mb-6">
        {poster && (
          <div className="w-32">
            <img src={poster} alt={entry.title} className="w-full rounded-sm" />
          </div>
        )}
        <div className="flex-1">
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
              alt="Custom poster preview"
              className="mt-2 w-20 rounded-sm"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="max-w-lg space-y-5">
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
              onClick={() => setForm(prev => ({ ...prev, badge: prev.badge === 'absolute appi' ? '' : 'absolute appi' }))}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-sm text-sm transition-colors ${
                form.badge === 'absolute appi'
                  ? 'border-amber-800 bg-amber-900/10 text-amber-800'
                  : 'border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              <svg viewBox="0 0 20 20" className="w-4 h-4"><path fill="currentColor" d="M10 2C7.5 2 6 3.2 6 5c0 .6.2 1.2.5 1.7C5 7.5 4 9.5 4 12c0 3 2 5 4.5 5.5-.8.5-1.5 1.5-1.5 2.5 0 1.5 1.2 2 3 2s3-.5 3-2c0-1-.7-2-1.5-2.5C14 17 16 15 16 12c0-2.5-1-4.5-2.5-5.3.3-.5.5-1.1.5-1.7 0-1.8-1.5-3-4-3z"/><circle cx="7" cy="9" r="1.3" fill="#fff"/><circle cx="13" cy="9" r="1.3" fill="#fff"/><circle cx="7" cy="9" r=".5" fill="currentColor"/><circle cx="13" cy="9" r=".5" fill="currentColor"/><path d="M6.5 12.5c1 1.5 6 1.5 7 0" fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/></svg>
              absolute appi
            </button>
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, badge: prev.badge === 'MalamCult' ? '' : 'MalamCult' }))}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-sm text-sm transition-colors ${
                form.badge === 'MalamCult'
                  ? 'border-rose-700 bg-rose-900/10 text-rose-700'
                  : 'border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current"><path d="M10 2C5 2 2 6 2 10s3 8 8 8 8-4 8-8-3-8-8-8zM7 9c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1zm6 0c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1zm-5 5c-.6 0-1-.4-1-1s.4-1 1-1h4c.6 0 1 .4 1 1s-.4 1-1 1H8z"/></svg>
              MalamCult
            </button>
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, badge: prev.badge === 'wammale cinema' ? '' : 'wammale cinema' }))}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-sm text-sm transition-colors ${
                form.badge === 'wammale cinema'
                  ? 'border-cyan-700 bg-cyan-900/10 text-cyan-700'
                  : 'border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 16V5h3"/><path d="M17 16V5h-3"/><path d="M3 5h2"/><path d="M17 5h-2"/></svg>
              wammale cinema
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
            value={form.runtime}
            onChange={(e) => setForm(prev => ({ ...prev, runtime: e.target.value }))}
            className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
            placeholder="Leave empty to auto-fetch from TMDB"
          />
        </div>

        {form.type === 'series' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Season</label>
              <input
                type="number"
                min="1"
                value={form.progress_season}
                onChange={(e) => setForm(prev => ({ ...prev, progress_season: e.target.value }))}
                className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Episodes watched</label>
              <input
                type="text"
                value={form.progress_episode}
                onChange={(e) => setForm(prev => ({ ...prev, progress_episode: e.target.value }))}
                className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder='e.g. "1-5" or "1,3,5-7"'
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
            className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
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
          />
          {rephraseError && (
            <p className="mt-1 text-xs text-accent">{rephraseError}</p>
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
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save changes'}
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

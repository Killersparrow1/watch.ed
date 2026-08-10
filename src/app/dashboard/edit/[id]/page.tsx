'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Entry, WatchEvent, WatchProvider, EntryPoster } from '@/types/database'
import { getEntryPosterUrl, getPosterUrl } from '@/lib/tmdb'
import { createClient } from '@/lib/supabase/client'
import { Save, ArrowLeft, Trash2, Star, Award, Zap, ThumbsDown, Sparkles, Undo2, Eye, Plus, X, RefreshCw, Images, Link as LinkIcon, ChevronUp, ChevronDown, Merge } from 'lucide-react'
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
  const [watchEvents, setWatchEvents] = useState<WatchEvent[]>([])
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [newEvent, setNewEvent] = useState({ watch_date: '', notes: '', rating: '', season_number: '', episode_number: '' })
  const [addingEvent, setAddingEvent] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [watchProviders, setWatchProviders] = useState<WatchProvider[]>([])
  const [fetchingProviders, setFetchingProviders] = useState(false)

  const [posters, setPosters] = useState<EntryPoster[]>([])
  const [showAddPoster, setShowAddPoster] = useState(false)
  const [addingPoster, setAddingPoster] = useState(false)
  const [posterError, setPosterError] = useState<string | null>(null)
  const [newPoster, setNewPoster] = useState({
    image_url: '',
    make_main: false,
    links: [{ label: '', url: '' }] as { label: string; url: string }[],
  })
  const [editingPoster, setEditingPoster] = useState<EntryPoster | null>(null)
  const [editImageUrl, setEditImageUrl] = useState('')
  const [editLinks, setEditLinks] = useState<{ label: string; url: string }[]>([])
  const [savingPosterEdit, setSavingPosterEdit] = useState(false)
  const [mainPosterUrl, setMainPosterUrl] = useState('')

  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergeQuery, setMergeQuery] = useState('')
  const [mergeResults, setMergeResults] = useState<Entry[]>([])
  const [mergeLoading, setMergeLoading] = useState(false)
  const [mergeConfirm, setMergeConfirm] = useState<Entry | null>(null)
  const [merging, setMerging] = useState(false)
  const [mergeError, setMergeError] = useState<string | null>(null)

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
    download_url: '' as string,
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
        download_url: data.entry.download_url || '',
      })
      setWatchProviders(data.entry.watch_providers || [])
      setMainPosterUrl(data.entry.custom_poster_url || '')
      const postersRes = await fetch(`/api/entries/${id}/posters`)
      if (postersRes.ok) {
        const postersData = await postersRes.json()
        setPosters(postersData.posters || [])
      }
      const eventsRes = await fetch(`/api/entries/${id}/watch-events`)
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json()
        setWatchEvents(eventsData.events || [])
      }
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
        setIsAdmin(profile?.is_admin || false)
      }
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
      watch_providers: watchProviders,
      download_url: form.download_url || null,
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

  async function handleAddEvent() {
    if (!newEvent.watch_date) return
    setAddingEvent(true)
    const res = await fetch(`/api/entries/${id}/watch-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        watch_date: newEvent.watch_date,
        notes: newEvent.notes || null,
        rating: newEvent.rating ? parseInt(newEvent.rating) : null,
        season_number: newEvent.season_number ? parseInt(newEvent.season_number) : null,
        episode_number: newEvent.episode_number ? parseInt(newEvent.episode_number) : null,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setWatchEvents(prev => [data.event, ...prev])
      setNewEvent({ watch_date: '', notes: '', rating: '', season_number: '', episode_number: '' })
      setShowAddEvent(false)
    }
    setAddingEvent(false)
  }

  async function handleDeleteEvent(eventId: string) {
    const res = await fetch(`/api/watch-events/${eventId}`, { method: 'DELETE' })
    if (res.ok) {
      setWatchEvents(prev => prev.filter(e => e.id !== eventId))
    }
  }

  async function handleAddPoster(e: React.FormEvent) {
    e.preventDefault()
    if (!newPoster.image_url.trim()) return
    setAddingPoster(true)
    setPosterError(null)
    const links = newPoster.links
      .filter(l => l.url.trim())
      .map(l => ({ label: l.label.trim() || null, url: l.url.trim() }))
    const res = await fetch(`/api/entries/${id}/posters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: newPoster.image_url.trim(),
        links,
        make_main: newPoster.make_main,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setPosterError(data.error || 'Failed to add poster')
      setAddingPoster(false)
      return
    }
    setPosters(prev => [...prev, data.poster])
    if (newPoster.make_main) {
      setMainPosterUrl(data.poster.image_url)
      setForm(prev => ({ ...prev, custom_poster_url: data.poster.image_url }))
    }
    setNewPoster({ image_url: '', make_main: false, links: [{ label: '', url: '' }] })
    setShowAddPoster(false)
    setAddingPoster(false)
  }

  async function handleDeletePoster(posterId: string) {
    const res = await fetch(`/api/posters/${posterId}`, { method: 'DELETE' })
    if (res.ok) {
      setPosters(prev => prev.filter(p => p.id !== posterId))
      if (editingPoster?.id === posterId) setEditingPoster(null)
    }
  }

  async function handleMakeMain(poster: EntryPoster) {
    const res = await fetch(`/api/posters/${poster.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: poster.image_url, make_main: true }),
    })
    if (res.ok) {
      setMainPosterUrl(poster.image_url)
      setForm(prev => ({ ...prev, custom_poster_url: poster.image_url }))
    }
  }

  async function handleMovePoster(index: number, dir: -1 | 1) {
    const ordered = [...posters].sort((a, b) => a.position - b.position)
    const target = index + dir
    if (target < 0 || target >= ordered.length) return
    const a = ordered[index]
    const b = ordered[target]
    const results = await Promise.all([
      fetch(`/api/posters/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: b.position }),
      }),
      fetch(`/api/posters/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: a.position }),
      }),
    ])
    if (results.every(r => r.ok)) {
      setPosters(prev => prev.map(p =>
        p.id === a.id ? { ...p, position: b.position } : p.id === b.id ? { ...p, position: a.position } : p
      ))
    }
  }

  function handleStartEditPoster(poster: EntryPoster) {
    setEditingPoster(poster)
    setEditImageUrl(poster.image_url)
    setEditLinks((poster.links || []).map(l => ({ label: l.label || '', url: l.url })))
  }

  async function handleSavePosterEdit() {
    if (!editingPoster || !editImageUrl.trim()) return
    setSavingPosterEdit(true)
    setPosterError(null)
    const links = editLinks
      .filter(l => l.url.trim())
      .map(l => ({ label: l.label.trim() || null, url: l.url.trim() }))
    const res = await fetch(`/api/posters/${editingPoster.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: editImageUrl.trim(), links }),
    })
    const data = await res.json()
    if (!res.ok) {
      setPosterError(data.error || 'Failed to save poster')
      setSavingPosterEdit(false)
      return
    }
    setPosters(prev => prev.map(p => (p.id === data.poster.id ? data.poster : p)))
    if (mainPosterUrl === editingPoster.image_url) {
      setMainPosterUrl(data.poster.image_url)
      setForm(prev => ({ ...prev, custom_poster_url: data.poster.image_url }))
    }
    setEditingPoster(null)
    setSavingPosterEdit(false)
  }

  async function loadMergeSuggestions(query?: string) {
    setMergeLoading(true)
    setMergeError(null)
    const q = (query ?? '').trim()
    try {
      const params = new URLSearchParams()
      if (q) {
        params.set('search', q)
      } else if (entry?.tmdb_id) {
        params.set('tmdb_id', String(entry.tmdb_id))
      } else {
        setMergeResults([])
        setMergeLoading(false)
        return
      }
      const res = await fetch(`/api/entries?${params.toString()}`)
      const data = await res.json()
      setMergeResults((data.entries || []).filter((e: Entry) => e.id !== id))
    } catch {
      setMergeError('Failed to load entries')
    }
    setMergeLoading(false)
  }

  function handleOpenMerge() {
    setMergeOpen(true)
    setMergeConfirm(null)
    setMergeQuery('')
    loadMergeSuggestions()
  }

  async function handleConfirmMerge() {
    if (!mergeConfirm) return
    setMerging(true)
    setMergeError(null)
    const res = await fetch(`/api/entries/${id}/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_entry_id: mergeConfirm.id }),
    })
    const data = await res.json()
    if (!res.ok) {
      setMergeError(data.error || 'Failed to merge')
      setMerging(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
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

      <div className="mb-6 p-4 bg-surface border border-border rounded-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-text-primary flex items-center gap-1.5">
            <Images className="w-4 h-4" />
            Poster collection <span className="text-text-muted font-normal">({posters.length})</span>
          </h2>
          <button
            type="button"
            onClick={() => setShowAddPoster(!showAddPoster)}
            className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add poster
          </button>
        </div>

        {posters.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {[...posters].sort((a, b) => a.position - b.position).map((p, i) => (
              <div key={p.id} className="bg-tag-bg border border-border rounded-sm overflow-hidden">
                <img
                  src={p.image_url}
                  alt="Poster"
                  className="w-full aspect-[2/3] object-cover bg-tag-bg"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/logo.svg' }}
                />
                <div className="p-1.5 space-y-1">
                  {mainPosterUrl === p.image_url && (
                    <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded-sm">
                      Main
                    </span>
                  )}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMakeMain(p)}
                      title="Set as main poster"
                      className="p-1 text-text-muted hover:text-accent transition-colors"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartEditPoster(p)}
                      title="Edit links"
                      className="p-1 text-text-muted hover:text-accent transition-colors"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMovePoster(i, -1)}
                      disabled={i === 0}
                      title="Move up"
                      className="p-1 text-text-muted hover:text-text-primary transition-colors disabled:opacity-30"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMovePoster(i, 1)}
                      disabled={i === posters.length - 1}
                      title="Move down"
                      className="p-1 text-text-muted hover:text-text-primary transition-colors disabled:opacity-30"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePoster(p.id)}
                      title="Remove poster"
                      className="p-1 text-text-muted hover:text-accent transition-colors ml-auto"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {p.links && p.links.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {p.links.map((link, li) => (
                        <a
                          key={li}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-text-muted hover:text-accent transition-colors underline underline-offset-2"
                        >
                          {link.label || 'Link'}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-muted">No posters in collection yet. Add posters with optional links.</p>
        )}

        {showAddPoster && (
          <form onSubmit={handleAddPoster} className="mt-4 p-4 bg-tag-bg border border-border rounded-sm space-y-3">
            <div>
              <label className="block body-xs text-text-muted mb-1">Poster image URL *</label>
              <input
                type="url"
                required
                value={newPoster.image_url}
                onChange={(e) => setNewPoster(prev => ({ ...prev, image_url: e.target.value }))}
                className="w-full px-3 py-2 border border-border bg-bg rounded-sm text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="https://example.com/poster.jpg"
              />
              {newPoster.image_url && (
                <img
                  src={newPoster.image_url}
                  alt="Preview"
                  className="mt-2 w-16 rounded-sm"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block body-xs text-text-muted">Links (add as many as you want)</label>
                <button
                  type="button"
                  onClick={() => setNewPoster(prev => ({ ...prev, links: [...prev.links, { label: '', url: '' }] }))}
                  className="flex items-center gap-1 text-[10px] text-accent hover:text-accent-hover transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add link
                </button>
              </div>
              <div className="space-y-1.5">
                {newPoster.links.map((link, i) => (
                  <div key={i} className="flex gap-1.5">
                    <input
                      value={link.label}
                      onChange={(e) => {
                        const links = [...newPoster.links]
                        links[i] = { ...links[i], label: e.target.value }
                        setNewPoster(prev => ({ ...prev, links }))
                      }}
                      className="w-28 px-2 py-1.5 border border-border bg-bg rounded-sm text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="Label"
                    />
                    <input
                      value={link.url}
                      onChange={(e) => {
                        const links = [...newPoster.links]
                        links[i] = { ...links[i], url: e.target.value }
                        setNewPoster(prev => ({ ...prev, links }))
                      }}
                      className="flex-1 px-2 py-1.5 border border-border bg-bg rounded-sm text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="https://example.com"
                    />
                    <button
                      type="button"
                      onClick={() => setNewPoster(prev => ({ ...prev, links: prev.links.filter((_, li) => li !== i) }))}
                      className="p-1.5 text-text-muted hover:text-accent transition-colors"
                      title="Remove link"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={newPoster.make_main}
                onChange={(e) => setNewPoster(prev => ({ ...prev, make_main: e.target.checked }))}
                className="accent-accent"
              />
              Use as main poster (shown everywhere)
            </label>
            {posterError && <p className="text-xs text-accent">{posterError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={addingPoster}
                className="px-3 py-1.5 bg-accent text-white rounded-sm text-xs hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {addingPoster ? 'Adding...' : 'Add poster'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddPoster(false)}
                className="px-3 py-1.5 border border-border rounded-sm text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {editingPoster && (
          <div className="mt-4 p-4 bg-tag-bg border border-border rounded-sm space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-text-primary">Edit poster</p>
              <button
                type="button"
                onClick={() => setEditingPoster(null)}
                className="p-1 text-text-muted hover:text-accent transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              <label className="block body-xs text-text-muted mb-1">Image URL</label>
              <input
                type="url"
                value={editImageUrl}
                onChange={(e) => setEditImageUrl(e.target.value)}
                className="w-full px-3 py-2 border border-border bg-bg rounded-sm text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block body-xs text-text-muted">Links</label>
                <button
                  type="button"
                  onClick={() => setEditLinks(prev => [...prev, { label: '', url: '' }])}
                  className="flex items-center gap-1 text-[10px] text-accent hover:text-accent-hover transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add link
                </button>
              </div>
              <div className="space-y-1.5">
                {editLinks.map((link, i) => (
                  <div key={i} className="flex gap-1.5">
                    <input
                      value={link.label}
                      onChange={(e) => {
                        const links = [...editLinks]
                        links[i] = { ...links[i], label: e.target.value }
                        setEditLinks(links)
                      }}
                      className="w-28 px-2 py-1.5 border border-border bg-bg rounded-sm text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="Label"
                    />
                    <input
                      value={link.url}
                      onChange={(e) => {
                        const links = [...editLinks]
                        links[i] = { ...links[i], url: e.target.value }
                        setEditLinks(links)
                      }}
                      className="flex-1 px-2 py-1.5 border border-border bg-bg rounded-sm text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="https://example.com"
                    />
                    <button
                      type="button"
                      onClick={() => setEditLinks(prev => prev.filter((_, li) => li !== i))}
                      className="p-1.5 text-text-muted hover:text-accent transition-colors"
                      title="Remove link"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSavePosterEdit}
                disabled={savingPosterEdit}
                className="px-3 py-1.5 bg-accent text-white rounded-sm text-xs hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {savingPosterEdit ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEditingPoster(null)}
                className="px-3 py-1.5 border border-border rounded-sm text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mb-6 p-4 bg-surface border border-border rounded-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-text-primary flex items-center gap-1.5">
            <Merge className="w-4 h-4" />
            Merge duplicate into another entry
          </h2>
          <button
            type="button"
            onClick={handleOpenMerge}
            className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
          >
            {mergeOpen ? 'Close' : 'Find duplicate'}
          </button>
        </div>

        {mergeOpen && (
          <div className="space-y-3">
            <p className="text-xs text-text-muted">
              This logs <strong className="text-text-secondary">{form.watch_date || 'this entry'}</strong> as a rewatch on
              the target entry, moves comments/posters/list membership over, keeps this old link working as a redirect,
              and deletes this duplicate.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={mergeQuery}
                onChange={(e) => setMergeQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); loadMergeSuggestions(mergeQuery) } }}
                className="flex-1 px-3 py-2 border border-border bg-bg rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Search your entries by title..."
              />
              <button
                type="button"
                onClick={() => loadMergeSuggestions(mergeQuery)}
                className="px-3 py-2 border border-border rounded-sm text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                Search
              </button>
            </div>

            {mergeLoading ? (
              <p className="text-xs text-text-muted animate-pulse">Loading...</p>
            ) : mergeResults.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {mergeResults.map((candidate) => (
                  <div key={candidate.id} className="flex items-center gap-3 p-2.5 bg-tag-bg border border-border rounded-sm">
                    <img
                      src={getEntryPosterUrl(candidate, 'w92') || ''}
                      alt=""
                      className="w-8 h-12 object-cover rounded-sm bg-bg flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{candidate.title}</p>
                      <p className="text-xs text-text-muted">
                        {candidate.year || '—'} · {candidate.status.replace(/_/g, ' ')}
                        {candidate.watch_date ? ` · watched ${candidate.watch_date}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMergeConfirm(candidate)}
                      className="px-3 py-1.5 bg-accent text-white rounded-sm text-xs hover:bg-accent-hover transition-colors"
                    >
                      Merge into this
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted">
                {entry?.tmdb_id ? 'No duplicate found for this movie. Search manually above.' : 'No tmdb match — search manually above.'}
              </p>
            )}

            {mergeConfirm && (
              <div className="p-3 bg-accent-light border border-accent/30 rounded-sm space-y-2">
                <p className="text-xs text-text-primary">
                  Merge <strong>{entry?.title}</strong> into <strong>{mergeConfirm.title}</strong>? The rewatch will be
                  logged on the target and this duplicate will be deleted.
                </p>
                {mergeError && <p className="text-xs text-accent">{mergeError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmMerge}
                    disabled={merging}
                    className="px-3 py-1.5 bg-accent text-white rounded-sm text-xs hover:bg-accent-hover transition-colors disabled:opacity-50"
                  >
                    {merging ? 'Merging...' : 'Confirm merge'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMergeConfirm(null)}
                    className="px-3 py-1.5 border border-border rounded-sm text-xs text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
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

      {watchProviders.length > 0 && (
        <div className="mb-6 px-4 py-3 bg-surface border border-border rounded-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-text-muted">Where to watch</p>
            {entry.tmdb_id && (
              <button
                type="button"
                onClick={async () => {
                  setFetchingProviders(true)
                  const res = await fetch(`/api/tmdb?watch_providers=1&tmdb_id=${entry.tmdb_id}&type=${entry.type}`)
                  const data = await res.json()
                  const providers = data.providers || []
                  setWatchProviders(providers)
                  setFetchingProviders(false)
                }}
                disabled={fetchingProviders}
                className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${fetchingProviders ? 'animate-spin' : ''}`} />
                Re-fetch
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {watchProviders.map((p) => (
              <a
                key={p.provider_id}
                href={`https://www.themoviedb.org/${entry.type === 'movie' ? 'movie' : 'tv'}/${entry.tmdb_id}/watch`}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative"
                title={`${p.provider_name} (${p.type})`}
              >
                <img
                  src={getPosterUrl(p.logo_path, 'w185') || ''}
                  alt={p.provider_name}
                  className="w-8 h-8 rounded-sm object-cover group-hover:ring-1 group-hover:ring-accent transition-all"
                />
                <span className="text-[10px] text-text-muted mt-0.5 block leading-none">{p.provider_name}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {entry.tmdb_id && watchProviders.length === 0 && (
        <div className="mb-6 px-4 py-3 bg-surface border border-border rounded-sm">
          <button
            type="button"
            onClick={async () => {
              setFetchingProviders(true)
              const res = await fetch(`/api/tmdb?watch_providers=1&tmdb_id=${entry.tmdb_id}&type=${entry.type}`)
              const data = await res.json()
              const providers = data.providers || []
              setWatchProviders(providers)
              setFetchingProviders(false)
            }}
            disabled={fetchingProviders}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${fetchingProviders ? 'animate-spin' : ''}`} />
            {fetchingProviders ? 'Loading...' : 'Load watch providers'}
          </button>
        </div>
      )}

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
               <Award className="w-5 h-5" />
               Golden ticket
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
              <svg viewBox="-562.003517 -637.269142 1227.276564 1409.339064" className="w-5 h-5 fill-current"><path fill="currentColor" d="m 217.39258,157.30469 c -0.27808,0.0163 -0.24919,0.34165 0.0723,0.96875 0.52548,1.02527 -0.2314,2.69674 -1.68164,3.71484 -1.45024,1.0181 -2.09612,1.87625 -1.43554,1.90625 0.66059,0.03 0.18891,1.79629 -1.04688,3.92383 -1.34655,2.31823 -1.78577,5.01587 -1.0957,6.73242 1.00374,2.49686 1.04164,28.03022 0.0527,36.35547 -0.49667,4.18409 -4.26787,1.94951 -4.58203,-2.71484 -0.14253,-2.11609 -0.39873,-6.27012 -0.56836,-9.23243 -0.16962,-2.96232 -1.05356,-9.71215 -1.96484,-15 -0.9113,-5.28785 -1.3064,-10.29674 -0.87891,-11.13086 0.4275,-0.83409 -0.41514,-2.28425 -1.87109,-3.2207 -3.86135,-2.4836 -11.56069,-3.26019 -11.5957,-1.16992 -0.0166,0.98744 -0.57071,2.82474 -1.23243,4.08203 -0.66172,1.25729 -0.47078,7.97487 0.42383,14.92774 0.89461,6.95288 1.17464,13.52143 0.62305,14.59765 -0.60014,1.17096 -0.31173,1.44237 0.71679,0.67578 1.10678,-0.82481 1.7187,0.17291 1.71876,2.80078 -5e-5,7.79243 -4.21085,-0.53936 -4.67774,-9.25586 -0.50366,-9.40288 -4.46285,-12.31779 -9.33203,-6.86914 -2.46163,2.75457 -2.79559,5.41774 -2.48828,19.8379 0.62871,29.50173 0.66297,29.92644 2.28515,28.75781 1.01659,-0.73237 0.99642,-0.22448 -0.0527,1.46484 -0.88484,1.42384 -1.46532,5.20477 -1.29102,8.40039 0.17431,3.19562 -0.28567,5.36087 -1.02148,4.8125 -0.77838,-0.5801 -0.9009,3.74688 -0.29492,10.34766 0.57283,6.2397 0.95927,17.62336 0.85937,25.29687 -0.10582,8.13138 0.39191,13.52503 1.19336,12.92774 0.79635,-0.59349 0.99421,1.27713 0.46875,4.44531 -0.5305,3.19851 -0.1701,6.54471 0.86914,8.05469 1.3562,1.97055 1.36725,3.50348 0.0508,6.4707 -0.94933,2.13895 -1.3927,5.42295 -0.98632,7.29688 0.40639,1.87393 0.0865,3.40625 -0.71094,3.40625 -0.79739,0 -1.01469,1.65547 -0.48242,3.67773 0.53227,2.02227 0.16758,4.83858 -0.81055,6.25977 -0.97809,1.4212 -1.37643,3.84951 -0.88477,5.39453 0.58059,1.82446 0.2963,2.36395 -0.81054,1.53906 -1.21174,-0.90305 -1.42667,0.39281 -0.74805,4.48437 0.52964,3.19338 0.36782,5.31635 -0.36328,4.77149 -0.72458,-0.54 -1.33136,2.046 -1.34766,5.74609 -0.0975,22.0913 -0.36654,25.23823 -2.33008,27.20313 -1.66274,1.66406 -1.75984,3.19889 -0.46484,7.33593 1.2279,3.92276 1.15604,7.49279 -0.28516,14.27344 -1.15056,5.41339 -1.50381,12.02441 -0.88085,16.47071 0.80593,5.75227 0.61718,7.11186 -0.83789,6.02734 -1.46925,-1.09497 -1.69422,1.08044 -1.0254,9.97461 0.47044,6.2562 0.33914,10.3661 -0.29296,9.13281 -0.644,-1.25653 -1.57504,3.53365 -2.11719,10.89453 -1.27949,17.37201 -5.1493,63.18608 -6.92774,82.00782 -1.3784,14.58785 0.3277,24.39371 3.56641,20.48828 0.58398,-0.7042 0.67995,-0.079 0.21289,1.38867 -1.14924,3.61138 14.58519,22.41266 17.1543,20.49805 1.17674,-0.87699 1.48905,-0.6577 0.84765,0.59374 -1.28984,2.51667 4.3087,6.2298 7.68555,5.09766 9.08063,-3.04443 10.00382,-3.18003 7.75977,-1.13867 -1.69059,1.5379 0.61796,1.74177 9.5,0.83984 9.06406,-0.92041 12.01588,-0.64047 12.97656,1.22852 0.96107,1.86972 6.41388,2.38421 24,2.26172 22.75566,-0.15849 22.75435,-0.1598 22.29297,20.12695 -0.2885,12.68505 0.40159,26.30944 1.83984,36.35938 2.02662,14.16116 2.04071,16.81886 0.125,22.34765 -4.14743,11.9696 -5.62443,23.80295 -6.53906,52.38281 -0.91929,28.7255 -0.91953,28.72648 -58.24024,29.65625 -52.09741,0.84504 -48.52831,0.96695 39.16993,1.34571 69.86308,0.30174 96.21121,-0.12706 95.47851,-1.55664 -0.73584,-1.43572 -0.17586,-1.43572 2.04883,0 1.68272,1.08595 6.83192,1.97461 11.44336,1.97461 4.61144,0 9.76064,-0.88866 11.44336,-1.97461 2.24349,-1.44788 2.78625,-1.44021 2.0332,0.0293 -0.74342,1.4505 4.55724,1.79924 19.19727,1.26563 22.49491,-0.81991 24.08292,-1.49519 33.95312,-14.43945 1.1096,-1.45518 2.06894,-2.79975 2.86328,-3.99415 -0.56187,-1.3e-4 -1.12375,0.005 -1.68554,0.0176 -0.71785,0.0219 -1.43483,0.0461 -2.15235,0.0723 -1.39013,3.50076 -1.93736,3.55379 -1.49609,0.0586 -1.32663,0.0555 -2.65276,0.12061 -3.97852,0.20117 -3.08715,0.18702 -6.17875,0.28331 -9.26757,0.4375 -3.31788,0.16994 -6.63778,0.27537 -9.95899,0.35157 -1.13029,0.0425 -2.26052,0.0494 -3.39062,0.0371 5.33469,2.31956 8.60866,6.17245 4.1875,8.60156 -2.71783,1.49325 -3.70756,1.39013 -4.29102,-0.44336 -0.51842,-1.62909 0.14953,-2.09653 2.10938,-1.47852 4.30253,1.35676 3.44868,-0.8541 -1.52735,-3.95703 -5.54607,-3.45838 -6.89699,-3.47222 -4.53906,-0.0469 2.12279,3.08435 -0.0564,3.70497 -2.53125,0.7207 -2.54408,-3.0678 -8.51763,-0.20238 -6.29883,3.02149 2.10371,3.05663 0.81443,3.26164 -3.4043,0.53906 -2.62173,-1.69195 -2.96317,-1.55329 -2.18359,0.89648 0.92519,2.90733 -0.96101,3.79697 -6.79883,3.20703 -1.43302,-0.14481 -2.60547,0.59048 -2.60547,1.63282 0,1.07814 -1.28451,1.40419 -2.97851,0.75585 -1.63773,-0.6268 -2.97847,-0.47899 -2.98047,0.32813 -0.002,0.80712 -2.17844,1.54558 -4.83789,1.64258 -4.83537,0.17643 -4.83652,0.17665 -0.70703,-1.90235 2.27122,-1.14344 3.71288,-2.58255 3.20312,-3.19726 -0.50977,-0.61468 0.64688,-0.64813 2.57031,-0.0762 1.92346,0.57261 2.99725,0.38761 2.38672,-0.41211 -1.08935,-1.42693 6.19459,-6.05901 16.86719,-10.73633 -0.47405,-0.0608 -0.94865,-0.12327 -1.42187,-0.1875 -3.72149,-0.486 -7.44741,-0.89949 -11.15821,-1.4668 -2.741,-0.43059 -5.49228,-0.74754 -8.19726,-1.37695 -1.24285,-0.35119 -2.34673,-0.84039 -3.31641,-1.48438 -0.85634,4.10669 -1.81457,6.90615 -2.83008,7.66797 -3.76271,2.82275 -4.66147,3.07925 -3.23632,0.92383 0.16367,-0.24757 0.31001,-0.47532 0.43945,-0.68359 -0.9135,0.91059 -2.16333,1.69883 -3.76172,2.26172 0.0864,2.34558 -1.40078,3.21477 -4.40234,2.56054 -0.70617,-0.15392 -2.04695,0.92653 -2.97852,2.40235 -0.93157,1.47582 -3.70356,3.28083 -6.16016,4.00976 -19.0089,5.64036 -62.65595,1.56705 -54.01953,-5.04101 1.52992,-1.17062 1.50975,-1.46628 -0.0937,-1.48828 -1.53197,-0.021 -1.80565,-2.25043 -1.1582,-9.45313 0.3042,-3.38421 0.56914,-7.51351 0.71484,-10.88867 -0.76407,-1.4054 -1.89996,-3.35377 -2.06445,-4.90235 -0.1282,-1.20681 -0.67174,-2.73009 0.13281,-3.63867 0.62904,-0.71037 1.19319,-1.33399 1.70508,-1.88086 -0.21143,-0.93312 -0.30482,-1.33567 -0.375,-2.60156 -0.0914,-1.64829 0.18724,-3.28585 0.50781,-4.89453 0.38238,-1.65796 0.87194,-3.28807 1.15039,-4.96875 0.4344,-1.98865 1.01894,-3.9376 1.51953,-5.91016 0.4473,-1.64504 0.86492,-3.29894 1.30665,-4.94531 -1.28753,-9.20364 -0.76879,-19.22616 2.13085,-29.25976 0.22562,-1.16004 0.20756,-2.37372 0.51563,-3.51368 0.16202,-0.59953 -0.0472,-1.72808 0.57227,-1.77148 0.27914,-0.0195 0.55869,-0.035 0.83789,-0.0449 0.14827,-0.33744 0.29938,-0.67027 0.45507,-1 -1.12953,-0.59526 -2.15058,-1.40957 -3.03906,-2.46094 -0.37781,-0.44709 -0.61849,-0.99324 -0.92773,-1.49023 -0.21931,-0.60834 -0.47068,-1.2073 -0.65821,-1.82618 -0.47442,-1.56561 -0.31977,-3.25848 -0.23437,-4.86328 0.041,-0.50316 0.0886,-1.00593 0.14453,-1.50781 -1.05146,-9.78936 -3.50192,-42.15532 -3.48242,-47.21875 0.01,-2.48969 0.85404,-3.81847 4.99805,-4.22461 4.144,-0.40614 11.5887,0.11042 24.79687,1.30469 6.1415,0.55531 15.52112,1.06687 20.84375,1.13867 10.87934,0.14682 23.09258,17.48005 27.78906,36.53516 0.53613,-0.0283 1.07289,-0.0517 1.60938,-0.0723 1.52677,-0.0549 3.05279,-0.0756 4.58008,-0.0879 -1.38947,-1.08184 -2.7663,-3.08129 -4.52539,-6.375 -9.07965,-17.00062 -15.90233,-29.24337 -17.47852,-31.36133 -1.06061,-1.42515 -5.86014,-2.24886 -13.15039,-2.25586 -27.99308,-0.0262 -35.79506,-1.69261 -36.89063,-7.8789 -0.54306,-3.06646 -1.48886,-6.3817 -2.10156,-7.36914 -0.61269,-0.98744 -1.11333,-3.00713 -1.11133,-4.48829 0.002,-1.48116 -1.70446,-7.13743 -3.79492,-12.56836 -7.69745,-19.9976 -15.93278,-53.35475 -15.95898,-64.64453 -0.0123,-5.29194 5.37015,-7.90532 20.51562,-9.96484 6.13104,-0.83371 9.98273,-2.31725 11.16602,-4.29687 0.99355,-1.66224 4.82291,-4.9606 8.50781,-7.33204 3.6849,-2.37144 7.70334,-5.24511 8.93164,-6.38476 8.64708,-8.023 33.0693,-20.63432 44.66602,-23.06446 12.65522,-2.65192 12.6555,-2.6519 -0.74414,-1.70703 -7.36981,0.51967 -15.07393,2.02431 -17.1211,3.3418 -2.04717,1.31748 -7.2731,4.46605 -11.61328,6.99805 -4.34018,2.53201 -9.70135,6.1396 -11.91211,8.01562 -2.21075,1.87603 -8.2063,6.02363 -13.32422,9.2168 -5.11792,3.19316 -9.30468,6.89802 -9.30468,8.23437 0,2.39018 -3.03709,3.33766 -16.20313,5.05469 -6.524,0.85082 -6.5225,0.84995 -5.70703,-8.67773 0.94066,-10.99043 5.44445,-31.47727 6.82812,-31.0586 2.36916,0.71687 7.7814,-2.76774 7.18946,-4.6289 -0.64,-2.01229 2.43313,-2.99559 11.24219,-3.59766 2.25189,-0.15391 4.09374,-0.98755 4.09374,-1.85156 0,-0.86401 2.04371,-1.07689 4.54102,-0.47461 2.49731,0.60228 4.18421,0.40189 3.75,-0.44531 -0.72426,-1.41311 7.23354,-2.97676 24.46289,-4.80469 11.92093,-1.26474 27.47719,-3.99496 30.15039,-5.29102 1.48029,-0.71769 2.60547,-0.45859 2.60547,0.59961 0,1.02441 -1.50716,2.17822 -3.34961,2.5625 -3.03667,0.63337 -2.93603,0.83953 1.07813,2.21485 4.90617,1.68094 23.00536,-1.37152 24.45703,-4.125 1.40387,-2.6628 13.08092,-4.48852 14.24023,-2.22657 0.55005,1.07322 1.63452,1.4765 2.41016,0.89844 0.77564,-0.57806 1.02581,-1.80149 0.55469,-2.7207 -0.51633,-1.00742 9.60054,-1.67188 25.46875,-1.67188 27.60777,0 31.69548,1.66988 17.04492,6.96289 -3.28519,1.18689 -5.97266,2.93306 -5.97266,3.88086 0,2.30883 0.19505,2.26425 8.19922,-1.87304 8.15129,-4.21333 9.63017,-3.58406 9.77148,4.15234 0.18119,9.9192 2.03542,12.47507 14.90039,20.53906 6.08815,3.81615 10.2582,6.6721 10.13672,6.91407 l -0.002,0.002 -0.002,0.002 -0.002,0.002 h -0.002 v 0.002 h -0.002 c -0.0337,0.0159 -0.12456,-3e-4 -0.27149,-0.0547 -1.56129,-0.57674 -2.3028,-0.24965 -1.77343,0.7832 0.50029,0.97613 0.19922,1.77539 -0.66797,1.77539 -0.86719,0 -1.55615,1.41456 -1.53125,3.14258 0.0421,2.91968 0.15025,2.92621 1.51367,0.10742 0.86533,-1.78902 2.73377,-2.73777 4.55664,-2.31445 2.2364,0.51935 2.86062,-0.0114 2.25391,-1.91797 -0.65976,-2.07322 0.49991,-2.60069 5.44531,-2.47656 6.78158,0.17022 15.35313,-0.95618 18.94141,-2.48828 1.22829,-0.52446 6.76846,-2.70247 12.3125,-4.8418 11.84978,-4.57265 20.40663,-13.83212 20.42773,-22.10351 0.0245,-9.62101 0.71027,-9.85365 33.35547,-11.28516 13.5225,-0.59297 21.2301,-0.24904 22.25781,0.99023 0.86468,1.04269 2.27496,1.88229 3.13477,1.86719 0.85981,-0.0151 0.55837,-0.8932 -0.66993,-1.95117 -1.09455,-0.94277 -1.37937,-1.37111 -0.72656,-1.36328 0.39169,0.005 1.12226,0.16619 2.2168,0.46875 2.04717,0.5659 8.4105,1.11829 14.14258,1.22656 10.42194,0.19686 10.42275,0.19574 3.08007,2.26758 -7.34266,2.07183 -7.34303,2.07208 -0.43554,4.28906 3.79913,1.21933 8.05195,1.68758 9.44922,1.04102 1.85848,-0.85999 2.2129,-0.53647 1.32031,1.20508 -0.96792,1.88853 -0.0189,2.14137 4.59375,1.22265 3.19807,-0.63696 8.82877,-1.28844 12.51367,-1.44726 4.44637,-0.19164 5.32269,-0.5388 2.60547,-1.03516 -2.25189,-0.41136 -4.09375,-1.55653 -4.09375,-2.54492 0,-0.9884 1.1889,-1.34347 2.64258,-0.78711 1.45368,0.55636 7.91199,1.8182 14.35156,2.80273 6.43958,0.98454 12.4537,2.4705 13.36328,3.30274 0.90957,0.83225 5.79204,1.57372 10.85156,1.64844 12.4339,0.18346 30.25586,10.6923 30.25586,17.83984 0,1.35627 2.0102,7.26644 4.4668,13.13476 2.77287,6.62383 4.4668,13.42963 4.4668,17.94727 0,6.00614 0.61744,7.5597 3.5332,8.89648 3.53272,1.61963 3.53185,1.61942 -3.85742,25.37305 -4.06409,13.0645 -9.06253,32.71487 -11.10742,43.66797 -2.0449,10.9531 -4.41034,20.92586 -5.25782,22.16016 -1.06123,1.54563 -1.06168,2.24414 -0.002,2.24414 0.84716,0 2.00999,3.43229 2.58399,7.6289 0.57399,4.19662 1.65355,8.54452 2.39843,9.66016 1.66029,2.48668 -13.78919,4.29468 -50.01953,5.85742 -25.25122,1.08917 -25.2515,1.08927 -30.23828,11.86133 -6.8761,14.85323 -9.57555,17.95012 -13.46289,15.44141 -0.66911,-0.43182 -1.70188,-0.79533 -2.94141,-1.08594 0.007,0.006 0.0146,0.0119 0.0215,0.0176 0.56993,0.46775 1.06015,1.02619 1.58984,1.53906 1.74712,2.20198 2.79746,4.78853 3.61719,7.44922 0.58148,2.27649 1.17038,4.54729 1.59375,6.85937 0.36946,1.96311 0.45918,3.95917 0.61719,5.94532 0.2025,2.30367 0.31278,4.61323 0.39648,6.92382 0.0677,1.96865 0.0954,3.93858 0.11328,5.90821 -0.005,1.76713 0.006,3.53064 0.10157,5.29492 0.15598,2.25367 0.1555,4.51556 0.29492,6.76953 0.16474,1.966 0.55988,3.90489 0.80859,5.86328 0.29666,2.21897 0.61004,4.43419 0.95313,6.64648 0.13841,0.79346 0.24836,1.58973 0.33789,2.38868 10e-4,-0.11988 0.003,-0.23924 0.004,-0.35938 0.40202,-39.0728 0.40184,-39.0727 12.86328,-45.30273 5.00662,-2.50303 8.44039,-4.52782 10.33985,-4.59375 0.40929,-0.0142 0.74654,0.0635 1.01367,0.24609 -0.0105,-0.15032 -0.0135,-0.30386 -0.01,-0.45898 0.0494,-2.05894 1.04355,-4.04201 2.09571,-5.8125 0.66404,-1.11737 2.87029,-1.93907 4.07031,-2.46289 3.39352,-1.07373 6.926,-1.62488 10.42773,-2.21875 2.16072,-0.37961 4.33628,-0.65791 6.49219,-1.0625 0.19301,-0.046 0.39709,-0.0907 0.61328,-0.13477 0.12691,-0.0258 0.18503,-0.0374 0.17188,-0.0332 -0.0131,0.004 -0.0963,0.0238 -0.24805,0.0644 -0.17858,0.0355 -0.35822,0.0699 -0.53711,0.10352 -1.80436,0.43014 -2.6124,0.94531 -2.74219,1.52343 1.6773,0.008 3.3384,0.10834 4.61133,0.29883 0.77027,0.11527 1.13426,0.22717 1.13477,0.32422 -0.0207,0.22362 -1.9839,0.3822 -5.38477,0.39844 1.13306,1.37431 4.57258,2.97797 7.1875,4.58398 1.42706,0.0172 2.86941,0.0205 4.2832,0.16211 0.61168,0.0613 1.53307,-0.28059 1.82618,0.25977 1.69709,3.12867 2.96811,5.19306 3.77734,6.64453 11.60232,-4.6439 44.86914,70.72096 44.86914,103.13086 0,8.47665 0.36729,9.67383 2.97656,9.67383 3.47991,0 3.67908,-2.69967 1.43164,-19.40039 -2.45515,-18.24423 -11.38463,-47.25533 -13.35937,-43.40235 -0.72605,1.4166 -1.35016,1.14252 -1.99219,-0.875 -0.54621,-1.71642 -0.32309,-2.48091 0.53711,-1.83984 1.71724,1.2798 1.83022,0.50516 0.52149,-3.60742 -0.66359,-2.08528 -1.2781,-2.35641 -2.02735,-0.89453 -0.76918,1.50072 -1.31443,1.3385 -1.92187,-0.57032 -0.53424,-1.6788 -0.0439,-2.52372 1.32617,-2.28125 5.49213,0.97201 18.55559,32.52038 23.35156,56.39649 3.30013,16.42927 3.29989,16.42906 51.6875,16.02929 48.38761,-0.39977 48.38728,-0.39892 2.73242,-0.90039 -45.65486,-0.50148 -45.65495,-0.50098 -46.69531,-8.10547 -2.03115,-14.84664 -8.15624,-34.74371 -15.3418,-49.83593 -8.18987,-17.20162 -8.62312,-20.52443 -9.50195,-72.8125 -0.42482,-25.27598 -0.42472,-25.27616 7.01953,-24.66992 5.79467,0.47189 6.78466,0.20054 4.4668,-1.22461 -2.33665,-1.4367 -1.75698,-1.61091 2.69922,-0.81055 6.14557,1.10377 22.20405,-2.45992 21.06836,-4.67578 -0.38227,-0.74586 0.7506,-0.90093 2.51758,-0.34375 2.39332,0.75471 2.90526,0.41306 2.00585,-1.3418 -0.80864,-1.57776 -0.62877,-1.92499 0.54688,-1.04883 2.23437,1.6652 10.8963,-0.54991 9.88281,-2.52734 -0.41771,-0.815 0.68622,-1.02593 2.45313,-0.46875 2.33947,0.73772 2.89625,0.39757 2.04883,-1.25586 -0.85722,-1.6725 -0.33083,-1.9526 2,-1.06055 1.83641,0.70284 3.16406,0.43109 3.16406,-0.64844 0,-1.02299 1.00412,-1.39455 2.23242,-0.82617 1.23529,0.5716 2.23437,0.0511 2.23437,-1.16406 0,-1.31293 1.19697,-1.81899 2.97657,-1.25781 1.63774,0.51644 2.97851,0.31866 2.97851,-0.43946 0,-0.75806 1.77448,-0.96871 3.94336,-0.46874 2.96925,0.68443 3.64883,0.33378 2.75,-1.41993 -0.93995,-1.83395 0.14442,-2.07267 5.09961,-1.11718 3.71333,0.71602 5.94615,0.53782 5.44727,-0.43555 -1.06995,-2.08761 3.33915,-4.23074 5.45703,-2.65234 0.92348,0.68822 1.14906,0.33285 0.54101,-0.85352 -1.19553,-2.33263 1.44131,-9.0637 4.92188,-12.56641 0.97932,-0.98555 1.43915,-1.51254 1.39453,-1.62304 v -0.002 V 563 l -0.002,-0.002 -0.002,-0.002 h -0.002 c -0.0801,-0.0551 -0.50192,0.16216 -1.25976,0.62891 -2.82201,1.73804 0.95937,-4.62435 4.23828,-7.13086 1.4662,-1.12082 1.74013,-3.78139 1.01172,-9.875 -1.69957,-14.21764 -2.49664,-17.06495 -4.01368,-14.3457 -0.84198,1.50923 -0.97036,-0.20812 -0.34179,-4.57813 0.64282,-4.46897 0.47123,-6.59357 -0.47461,-5.88867 -0.88972,0.66308 -1.19996,-0.66617 -0.77735,-3.33203 0.3866,-2.43871 0.0488,-4.43359 -0.75195,-4.43359 -0.80082,0 -1.11783,-2.13855 -0.70312,-4.75391 0.53395,-3.36825 0.24001,-4.37283 -1.00977,-3.44141 -1.26677,0.94407 -1.49203,0.006 -0.79883,-3.32422 0.6106,-2.93367 0.34871,-4.63867 -0.71289,-4.63867 -1.07228,0 -1.3218,-1.71769 -0.68945,-4.75586 0.76263,-3.66405 0.54043,-4.42161 -0.96875,-3.29687 -1.43738,1.07123 -1.69243,0.62147 -0.95703,-1.68946 0.55129,-1.73223 0.52305,-4.08586 -0.0645,-5.23046 -0.58661,-1.1446 -0.8651,-4.39317 -0.61914,-7.22071 0.29684,-3.41252 -0.10926,-4.72828 -1.20703,-3.91015 -1.16507,0.86828 -1.36681,-0.9279 -0.68359,-6.08008 0.53341,-4.02243 0.36934,-7.31445 -0.36524,-7.31445 -1.30146,0 -1.9184,-7.40221 -1.9082,-22.89063 0.003,-4.39341 -0.69579,-7.62891 -1.64648,-7.62891 -1.05623,0 -1.57238,-4.0425 -1.43164,-11.2207 0.1209,-6.1715 0.0795,-11.62542 -0.0918,-12.11914 -0.17127,-0.49372 -0.48695,-4.53309 -0.70313,-8.97656 -0.21618,-4.44348 -0.77323,-10.90989 -1.23828,-14.36914 -3.57231,-26.57251 -4.00118,-39.9355 -1.36523,-42.53711 1.45238,-1.43344 1.81614,-2.10546 0.80859,-1.49219 -1.11484,0.67858 -0.84032,-0.96996 0.70313,-4.21289 1.3949,-2.93081 2.8979,-5.05983 3.33984,-4.73047 0.78683,0.58641 0.85662,-14.39716 0.084,-17.9375 -0.21562,-0.98744 -0.27766,-3.53469 -0.13867,-5.66211 0.139,-2.12743 -0.31493,-4.29221 -1.00781,-4.80859 -0.69288,-0.51637 -1.07294,-6.37526 -0.84375,-13.01953 0.23391,-6.78131 -0.28778,-13.10396 -1.18945,-14.41407 -0.88346,-1.28364 -1.15589,-3.2112 -0.60547,-4.28515 0.55043,-1.07395 0.19825,-3.12088 -0.78321,-4.54688 -2.3971,-3.48294 -3.70327,-20.58789 -1.57226,-20.58789 0.88677,0 1.44494,-0.8552 1.24023,-1.90039 -0.13828,-0.706 0.88371,-1.8119 2.50586,-2.85742 -0.12365,-0.1775 -0.222,-0.31827 -0.26953,-0.38672 -0.79899,-1.10825 -1.54212,-2.25113 -2.24804,-3.41797 -3.25523,0.30477 -5.57227,-1.3562 -5.57227,-5.73828 0,-3.3871 -1.02696,-5.98397 -2.82227,-7.14258 -0.7528,-0.48583 -1.46469,-0.71708 -2.11132,-0.72851 -0.67582,1.03558 -1.62544,1.63631 -2.66211,1.75 -0.82876,1.52119 -1.09103,3.92676 -0.4961,6.78515 0.68768,3.30395 0.38117,4.65825 -1.05273,4.65625 -2.20295,-0.002 -2.52092,-5.5385 -1.27539,-12.32617 -1.16534,-0.88968 -2.22873,-2.45241 -2.92383,-4.76758 -0.20727,-0.69035 -0.28634,-1.41007 -0.42383,-2.11523 -0.37475,-1.92206 -0.26364,-3.5222 0.16211,-4.76758 -0.0196,-0.0889 -0.0385,-0.17843 -0.0566,-0.26953 -0.0447,-0.22427 -0.0882,-0.44955 -0.13281,-0.67383 -0.0922,-0.61793 -0.17303,-1.23822 -0.22657,-1.86133 -0.18052,-0.28737 -0.35449,-0.59429 -0.52343,-0.91992 -0.20457,-0.39442 -0.12879,-0.23399 -0.24024,-0.47265 -0.34301,-0.63727 -0.66663,-1.28536 -0.99218,-1.93164 -0.10901,-0.19659 -0.21192,-0.39598 -0.32227,-0.5918 -0.003,-0.005 -0.1737,-0.21723 -0.17969,-0.28711 -10e-6,-0.001 -8e-5,-0.005 0,-0.006 v -0.002 -0.002 l 0.002,-0.002 v -0.002 l 0.002,-0.002 0.002,-0.002 0.002,-0.002 h 0.002 0.002 l 0.002,-0.002 c 0.004,-2.4e-4 0.012,1.2e-4 0.0176,0.002 0.0864,0.0191 0.17071,0.0367 0.25391,0.0527 -0.2439,-0.9996 -0.38281,-2.35116 -0.38281,-4.05469 0,-6.44113 -2.21218,-7.90291 -7.94532,-5.25 -2.0853,0.96493 -2.28189,25.22102 -0.30078,37.11719 0.28778,1.72802 -0.3134,3.14063 -1.33398,3.14063 -2.85291,0 -5.74231,-13.35967 -7.76563,-35.90625 -0.48737,-5.43091 -1.50126,-10.80544 -2.2539,-11.94336 -0.64087,-0.96895 -0.53739,-1.92152 0.15625,-2.83203 -0.75026,-0.1599 -1.57446,-0.50442 -2.44336,-1.07813 -0.47277,-0.31215 -0.97065,-0.57717 -1.47852,-0.82812 -0.33558,-0.19835 -0.92135,-0.57388 -1.43945,-1.01172 -0.99967,0.25199 -1.85307,0.30446 -2.45313,0.11523 -2.01336,-0.6349 -2.63834,-0.26502 -1.91992,1.13672 0.90626,1.76823 -0.50528,2.72164 -3.59961,2.43164 -0.42151,-0.0395 -0.54085,3.7035 -0.26562,8.31641 0.78976,13.23679 0.77401,15.00441 -0.21875,24.99414 -0.51518,5.18406 -0.44532,9.42544 0.15625,9.42578 0.60157,3.5e-4 1.21695,3.02987 1.36523,6.73242 0.26962,6.73191 0.26925,6.73173 -1.6543,1.3457 -1.0579,-2.96232 -1.64264,-5.99184 -1.29882,-6.73242 0.34382,-0.74058 -0.0126,-1.3457 -0.79102,-1.3457 -1.53005,0 -3.90626,-8.45928 -3.4043,-12.11914 0.16928,-1.23429 -0.39133,-2.24414 -1.24609,-2.24414 -0.85477,0 -1.39285,-0.60708 -1.19727,-1.34766 0.91428,-3.46116 -7.28184,-20.33295 -10.3496,-21.30469 -3.70959,-1.17505 -11.45541,7.78107 -9.49805,10.98243 0.60374,0.98744 1.16535,3.41184 1.24805,5.38671 0.0826,1.97489 0.97977,6.01425 1.99218,8.97657 1.01241,2.96232 1.70238,6.3946 1.53516,7.6289 -0.16721,1.2343 0.43674,2.24414 1.33984,2.24414 0.90309,0 1.20297,0.85458 0.66797,1.89844 -1.49681,2.92046 -1.91959,10.68748 -0.52539,9.64844 0.67975,-0.50659 1.66334,1.13163 2.18555,3.64062 0.52222,2.50898 1.47222,4.5625 2.11133,4.5625 0.63911,0 1.12979,1.00985 1.09179,2.24415 -0.22075,7.16739 0.53728,10.43268 2.14258,9.23632 1.19634,-0.89159 1.42037,-0.28902 0.7168,1.92188 -0.56341,1.77047 -0.23823,5.84061 0.72265,9.04492 3.29337,10.98254 -6.49974,13.96098 -12.5996,3.83203 -0.89834,-1.49169 -1.4392,-1.4166 -2.00586,0.27735 -0.55528,1.65976 -1.31464,1.78017 -2.66797,0.42578 -1.35565,-1.35669 -2.38262,-1.17693 -3.63086,0.63672 -1.00866,1.46559 -3.12817,2.11896 -5.03711,1.55273 -1.81235,-0.53758 -2.85323,-0.39133 -2.3125,0.32422 0.54072,0.71554 -0.96644,3.54858 -3.34961,6.29492 -4.39964,5.07007 -5.61862,9.0918 -2.75586,9.0918 0.86719,0 1.21046,0.71623 0.76172,1.59179 -0.44875,0.87555 0.29013,2.69289 1.64258,4.03907 1.92049,1.91159 2.59673,1.95779 3.08593,0.20507 1.16739,-4.18251 2.94803,-2.27465 2.51172,2.69141 -0.42626,4.85164 -0.39008,4.87612 2.11719,1.34766 2.65054,-3.73008 7.10474,-5.9684 5.44922,-2.73828 -0.54747,1.06817 0.61185,1.83984 2.76562,1.83984 2.41098,0 4.04342,1.26659 4.66211,3.61719 0.52357,1.98922 1.60658,3.12917 2.40625,2.5332 0.91151,-0.67931 0.80393,-2.02911 -0.28906,-3.61719 -2.82853,-4.10977 -0.61212,-2.88991 2.48438,1.36719 1.89679,2.60768 2.09706,3.45435 0.60351,2.55859 -1.3633,-0.81765 -1.22873,-0.3428 0.34766,1.2168 1.42029,1.40516 2.14647,3.07972 1.61328,3.72266 -0.53318,0.64295 -0.24971,1.16992 0.6289,1.16992 0.90321,0 1.23248,1.68235 0.75782,3.87109 -0.57098,2.63287 -0.29319,3.46445 0.86718,2.59961 1.10623,-0.82443 1.39319,-0.29269 0.81836,1.51367 -0.48766,1.53245 -0.12082,2.78711 0.81446,2.78711 1.27147,0 1.26787,0.96003 0.01,3.80664 -0.92937,2.09404 -1.06204,3.34144 -0.29492,2.76953 2.90788,-2.16712 8.15781,4.25237 6.04688,7.39454 -1.06262,1.58175 -1.23606,2.37481 -0.38477,1.76172 0.85129,-0.61316 2.86148,1.24933 4.4668,4.13867 1.60531,2.88935 4.07868,5.25481 5.49609,5.25781 1.61958,0.003 2.88028,1.8406 3.39258,4.94336 0.44835,2.71546 1.41151,7.17541 2.14258,9.91211 0.73107,2.73671 1.03748,11.22016 0.67968,18.85156 -0.43106,9.19557 -0.19371,12.66481 0.70508,10.28516 0.8919,-2.36142 1.28287,3.93211 1.14063,18.38476 -0.11896,12.08688 -0.80303,21.98514 -1.51953,21.99414 -0.71651,0.009 -0.89399,2.48079 -0.39453,5.49219 0.63997,3.85857 0.40619,5.10123 -0.79102,4.20898 -1.21111,-0.90258 -1.41756,0.48895 -0.72266,4.84766 0.60504,3.795 0.47452,5.17586 -0.34375,3.64258 -0.86371,-1.61845 -2.24103,5.06015 -3.99218,19.36719 -1.78619,14.59325 -3.23704,21.57536 -4.375,21.04883 -0.93654,-0.43338 -6.1753,-1.36454 -11.64063,-2.07032 -5.7375,-0.74092 -9.95592,-2.14336 -9.98242,-3.31836 -0.36396,-16.11188 -3.15151,-28.15821 -7.99023,-34.52734 -2.84754,-3.74809 -4.77666,-7.66491 -4.28711,-8.70508 0.48955,-1.04017 0.35612,-1.30884 -0.29688,-0.59766 -0.653,0.71142 -2.93852,-0.18532 -5.07812,-1.99218 -3.58704,-3.02921 -7.95751,-5.56544 -18.26758,-10.60352 -17.48488,-8.54409 -81.42985,-18.36625 -120.04688,-18.43945 -29.49659,-0.0559 -28.64418,0.24192 -26.85156,-9.37891 0.76693,-4.11622 1.08248,-8.91641 0.70313,-10.66601 -0.37943,-1.7496 -0.0824,-2.72914 0.66015,-2.17578 0.7425,0.55336 1.34961,-0.64904 1.34961,-2.67383 0,-2.02478 1.34079,-4.6905 2.97852,-5.92383 3.63004,-2.73368 3.94327,-5.30431 0.44922,-3.6875 -1.98785,0.91983 -1.76605,-0.12209 1.0371,-4.86914 1.98666,-3.36436 2.61204,-5.43658 1.41211,-4.67969 -1.18462,0.74725 -0.47881,-0.41083 1.56836,-2.57226 2.04717,-2.16142 3.39278,-4.04025 2.99024,-4.17579 -0.76006,-0.25594 7.31945,-13.85671 9.26562,-15.59765 0.60835,-0.5442 0.49149,-3.57372 -0.25976,-6.73242 -0.94445,-3.97102 -0.86157,-5.74414 0.26757,-5.74414 0.89819,0 1.24077,-0.47313 0.76172,-1.05079 -1.57501,-1.89925 2.01862,-11.33192 3.97266,-10.42773 4.12856,1.91042 5.99349,-4.40884 3.30664,-11.20312 -2.51166,-6.35127 -2.51239,-6.35206 1.88281,-2.57813 4.34958,3.73476 7.79702,0.5674 6.35938,-5.84375 -0.18253,-0.81398 0.36435,-0.95956 1.21679,-0.32422 0.85281,0.63535 1.23443,1.77277 0.84766,2.52734 -0.38677,0.75467 0.26213,1.3711 1.44141,1.3711 1.47387,0 1.68969,-0.65888 0.6914,-2.10938 -0.79876,-1.16057 -1.01145,-2.64128 -0.47265,-3.29101 0.53881,-0.64972 -0.87993,-1.18164 -3.15235,-1.18164 -3.69939,0 -4.0305,-0.48521 -3.16601,-4.63867 0.73023,-3.5084 0.49761,-4.29945 -0.95508,-3.2461 -1.43327,1.03926 -1.40534,0.62696 0.10938,-1.625 1.11635,-1.65983 2.7899,-2.50502 3.7207,-1.87695 0.9308,0.62807 0.0956,-0.72507 -1.85742,-3.00781 -3.51688,-4.11069 -0.95264,-10.84856 3.00586,-7.89844 0.68716,0.51214 0.6534,-0.92743 -0.0762,-3.19922 -0.72914,-2.27179 -2.09568,-3.91488 -3.03711,-3.65039 -2.6207,0.73629 -7.24344,-5.37404 -4.80664,-6.35352 1.06222,-0.42696 3.33271,-2.51182 5.04493,-4.63281 1.71222,-2.12098 2.59375,-2.7568 1.95898,-1.41211 -0.68376,1.44849 -0.31716,3.08327 0.89844,4.01172 2.94184,2.24691 3.84533,2.00347 4.90429,-1.32422 0.78412,-2.46406 0.56575,-2.57502 -1.33007,-0.67773 -1.96075,1.96226 -2.26758,1.37585 -2.26758,-4.33985 0,-3.63522 0.59897,-6.1635 1.33203,-5.61718 0.73306,0.54632 1.74161,-0.2886 2.24023,-1.85547 0.6032,-1.89552 -0.0928,-3.16301 -2.07812,-3.78906 -1.64111,-0.51752 -2.98242,-1.78933 -2.98242,-2.82618 0,-1.03684 -0.4309,-1.36685 -0.95703,-0.73242 -0.52612,0.63443 -0.11004,2.38561 0.92578,3.89063 2.53112,3.67766 0.87194,3.49302 -2.23047,-0.24805 -2.03451,-2.45333 -2.69774,-2.55033 -3.72656,-0.54297 -0.92079,1.79657 -1.5203,1.15519 -2.26563,-2.42578 -0.59022,-2.83572 -0.29948,-5.90225 0.69531,-7.34766 1.34861,-1.95948 1.14813,-2.42595 -0.95117,-2.2207 -1.63972,0.16032 -2.58617,-0.88941 -2.4707,-2.74023 0.12499,-2.00348 -0.57446,-2.64595 -2.10547,-1.9375 -1.49387,0.69126 -1.91926,0.3358 -1.22461,-1.01954 0.68047,-1.32769 0.28314,-1.71811 -1.0957,-1.08007 -1.188,0.54972 -2.6074,0.1236 -3.15625,-0.94727 -0.54884,-1.07086 -1.62249,-1.48216 -2.38477,-0.91406 -2.32423,1.73216 -1.48657,-1.61571 1.5918,-6.36133 6.06427,-9.3487 3.24876,-12.97562 -6.32813,-8.15039 -6.67165,3.36144 -7.80247,1.86321 -3.75781,-4.98633 1.82615,-3.09252 2.29327,-4.78503 1.07422,-3.89844 -1.71634,1.24827 -1.81284,1.04145 -0.46875,-1.02148 2.13112,-3.2709 0.84155,-14.25977 -1.67383,-14.25977 -1.03602,0 -2.69165,2.35406 -3.67969,5.23047 -2.13365,6.21148 -8.11207,8.09607 -17.91992,5.64844 -0.40944,-0.10218 0.89749,-1.70856 2.9043,-3.56836 3.11441,-2.88627 3.35922,-3.79903 1.67773,-6.24219 -2.32758,-3.38191 -6.25825,-3.71472 -8.72656,-0.73828 -2.43597,2.93744 -4.14814,0.37011 -1.91601,-2.87304 0.9953,-1.44615 1.6112,-4.09007 1.36718,-5.87696 -0.24402,-1.7869 0.12383,-4.34297 0.81836,-5.67969 0.82306,-1.58408 -0.0971,-1.35691 -2.64258,0.6543 -4.51968,3.57104 -5.02161,4.83019 -1.29882,3.25195 1.43301,-0.60751 -0.0761,1.08659 -3.35157,3.76563 -3.27547,2.67904 -8.48021,8.25186 -11.5664,12.38281 -3.08618,4.13096 -5.44185,6.70228 -5.23633,5.71485 0.38511,-1.85023 -2.47426,-6.46785 -9.6582,-15.60352 -2.2708,-2.88774 -3.6741,-6.13807 -3.11914,-7.2207 0.60597,-1.18233 0.32152,-1.45501 -0.71094,-0.68555 -0.94539,0.70456 -1.71875,0.37744 -1.71875,-0.72656 0,-1.10401 -0.60208,-1.56009 -1.33789,-1.01172 -0.73581,0.54837 -2.91238,-1.00522 -4.83789,-3.45313 -3.78615,-4.81338 -7.17034,-5.86212 -7.3125,-2.26757 -0.0488,1.23429 -0.61706,6.11042 -1.26172,10.83593 -0.64465,4.72551 -0.68175,8.95589 -0.082,9.40235 1.52783,1.13864 2.65468,11.61622 1.35351,12.58593 -1.75232,1.30594 -4.73707,-4.2093 -3.54101,-6.54296 0.69755,-1.36101 0.47021,-1.67953 -0.61719,-0.86915 -1.01852,0.75909 -1.71875,0.14096 -1.71875,-1.51757 0,-1.53944 -0.56258,-2.80078 -1.25,-2.80078 -0.68743,0 -2.01256,-2.0197 -2.94531,-4.48829 -2.13867,-5.66014 -4.42192,-5.72407 -6.17188,-0.17382 -0.74808,2.37268 -2.17402,4.92186 -3.16992,5.66406 -1.15858,0.86345 -1.42607,0.59801 -0.74219,-0.73633 0.59592,-1.16271 0.0557,-2.55388 -1.2207,-3.14453 -3.24988,-1.50382 -7.24263,3.87604 -6.09961,8.21875 0.60633,2.30364 -0.14346,4.95301 -2.13086,7.52539 -1.687,2.18354 -3.09209,5.23162 -3.12109,6.77344 -0.0819,4.35071 -4.26623,-5.42145 -4.56446,-10.66016 -0.1218,-2.13967 -0.18803,-3.26168 -0.30468,-3.36133 l -0.002,-0.002 v -0.002 h -0.002 -0.002 l -0.002,-0.002 h -0.002 -0.002 c -10e-4,0 -0.005,-1.3e-4 -0.006,0 h -0.002 -0.002 -0.002 v 0.002 c -1.3e-4,6e-5 -0.005,6e-5 -0.006,0 v 0.002 0.002 c -0.12815,0.0993 -0.32281,1.22125 -0.68945,3.36133 -0.76896,4.48836 -0.76862,4.48836 -1.99805,0 -0.36669,-1.33866 -0.60486,-2.04013 -0.71875,-2.06836 -0.002,-2.9e-4 -0.01,-2.1e-4 -0.0117,0 h -0.002 -0.01 -0.0117 l -0.004,0.002 h -0.0117 l -0.0117,0.002 -0.002,0.002 -0.002,0.002 c -0.12395,0.14706 -0.016,1.59608 0.31446,4.43165 0.43977,3.77296 1.16619,8.01475 1.61523,9.42578 0.61988,1.94793 -0.65611,2.61867 -5.29883,2.78906 -9.84884,0.36147 -12.07031,1.70092 -12.07031,7.27344 0,2.8096 0.71297,3.46771 2.97656,2.7539 3.71304,-1.17086 5.31549,1.61572 2.92578,5.08789 -2.84217,4.12961 -6.48548,3.0867 -11.25195,-3.2207 -4.51168,-5.97024 -8.04884,-8.14043 -8.04883,-4.9375 0,0.98744 1.00413,1.79492 2.23242,1.79492 2.87604,0 2.84965,2.59187 -0.0625,6.10352 -2.06891,2.49481 -2.05181,3.21874 0.17579,7.31836 2.91795,5.37011 0.58412,10.71226 -3.92579,8.98633 -3.18203,-1.2179 -5.57152,5.59384 -3.03515,8.65234 2.28455,2.75486 2.10361,5.69673 -0.22461,3.65234 -3.14548,-2.76204 -10.04882,-2.92032 -10.04883,-0.23047 0,3.19704 5.70163,9.00669 7.51367,7.65625 0.78065,-0.58179 1.41992,-0.13386 1.41992,0.99414 0,1.128 0.83138,1.7171 1.84766,1.3086 7.90399,-3.17704 5.88276,6.49663 -3.9375,18.84961 -2.94552,3.70519 -5.35546,7.59852 -5.35547,8.65234 0,3.21309 6.2881,1.00498 8.03711,-2.82226 1.62468,-3.5552 4.22883,-6.22937 6.44727,-6.6211 0.6315,-0.11151 2.03678,-1.49508 3.12109,-3.07422 2.68247,-3.90667 0.72469,0.59099 -3.65625,8.40039 -1.81592,3.23706 -4.82565,9.69888 -6.6875,14.36133 -3.89496,9.75379 -6.40278,13.33205 -8.08984,11.53516 -0.0814,-0.0867 -0.1374,-0.1298 -0.16797,-0.13086 -9e-4,5e-5 -0.005,-1.3e-4 -0.006,0 l -0.002,0.002 -0.002,0.002 h -0.002 -0.004 v 0.002 l -0.002,0.002 -0.002,0.002 -0.002,0.002 -0.002,0.002 c -0.0814,0.19451 0.89329,2.14486 2.4707,4.89648 3.46324,6.04132 3.46205,6.0406 0.0742,4.74415 -2.41458,-0.92413 -3.07621,-0.6889 -2.30469,0.8164 0.59528,1.16148 3.52622,1.97841 6.51368,1.81445 2.98743,-0.1639 6.1578,-0.22068 7.04492,-0.125 1.97917,0.21346 2.18736,6.04204 0.26953,7.55665 -0.85274,0.67346 -0.78864,3.73237 0.16797,7.91015 0.85789,3.74682 1.21027,7.49293 0.7832,8.32617 -0.42705,0.83325 -0.0268,1.51563 0.88867,1.51563 0.91949,0 1.17729,1.0045 0.57617,2.24414 -0.59852,1.23429 0.40786,0.66022 2.23633,-1.27539 3.75124,-3.97102 6.36117,-1.57138 5.01953,4.61523 -0.40459,1.86557 0.0134,3.39258 0.92774,3.39258 0.91438,0 1.66211,1.19397 1.66211,2.65234 0,1.45842 1.67547,3.97431 3.72265,5.5918 2.04716,1.61748 3.72266,3.86603 3.72266,4.9961 0,1.13007 1.36564,3.08258 3.03516,4.33984 1.68803,1.27121 2.5702,3.19271 1.98828,4.32812 -0.69613,1.3582 -0.19172,1.64581 1.50781,0.85938 1.52742,-0.70678 2.18638,-0.46317 1.63867,0.60547 -0.50385,0.9831 0.1319,2.18512 1.41211,2.67187 1.28022,0.48675 3.50059,1.41788 4.9336,2.06836 1.43302,0.65048 3.157,1.03475 3.83203,0.85352 0.67502,-0.18123 0.84013,0.42485 0.36718,1.34765 -1.04627,2.04138 0.56727,7.65461 1.91211,6.65235 0.52835,-0.39376 0.98341,1.42766 1.01172,4.04883 0.0283,2.62116 0.57579,6.58295 1.2168,8.80468 1.16545,4.03953 1.16555,4.03975 -29.08399,4.1875 -16.63724,0.0813 -33.26429,0.43152 -36.94921,0.77735 -24.42273,2.29212 -63.31584,9.48692 -78.16407,14.45898 -4.09434,1.37102 -11.31632,3.29472 -16.04882,4.27539 -9.65995,2.00174 -17.73548,8.33053 -20.2461,15.86719 -2.60371,7.81607 -6.09132,27.64685 -6.11523,34.77344 -0.0218,6.51075 -0.0836,6.57402 -7.46875,7.79883 -4.67108,0.77469 -7.08097,1.94416 -6.46875,3.13867 0.59229,1.15563 0.26205,1.37198 -0.83985,0.55078 -2.69123,-2.00567 -12.33918,0.56522 -11.11132,2.96094 0.61278,1.19563 0.33377,1.47393 -0.70313,0.70117 -0.9454,-0.70457 -1.71875,-2.49345 -1.71875,-3.97461 0,-1.56552 -0.71408,-2.16043 -1.70508,-1.42188 -1.17839,0.8782 -1.46914,-0.21071 -0.94336,-3.52734 0.41834,-2.63892 0.24351,-5.18317 -0.38867,-5.6543 -0.63218,-0.47114 -0.77211,-2.59826 -0.31055,-4.72656 0.62941,-2.90238 0.34565,-3.50124 -1.13671,-2.39648 -1.4291,1.06504 -1.71915,0.6617 -1.04493,-1.45704 0.51283,-1.61151 0.29001,-3.41024 -0.49609,-3.99609 -0.78613,-0.58586 -0.99476,-3.15558 -0.46289,-5.71094 0.56324,-2.70605 0.38789,-4.21335 -0.41992,-3.61132 -0.77417,0.57696 -1.53561,-3.07 -1.72266,-8.25391 -0.1843,-5.10798 -0.70594,-10.9063 -1.16016,-12.88477 -0.68835,-2.99817 -0.54395,-3.14884 0.8711,-0.90429 1.31595,2.08734 1.46361,1.07796 0.65625,-4.48828 -1.32381,-9.12656 -3.25272,-82.28437 -2.20117,-83.48438 0.82139,-0.93736 0.94153,-1.91923 1.30859,-10.77148 0.13996,-3.37533 1.02675,-5.38672 2.375,-5.38672 1.18326,0 5.03532,-3.46719 8.56055,-7.70508 4.70554,-5.65682 5.04375,-5.89431 1.26953,-0.89648 -7.72946,10.23532 -5.02826,8.20588 6.43945,-4.83594 5.62774,-6.40024 10.78529,-11.22425 11.46094,-10.72071 0.67587,0.50355 0.97546,-0.66985 0.66602,-2.60742 -0.30946,-1.93758 0.56166,-4.58484 1.9375,-5.88281 1.03773,-0.97902 1.61108,-1.49682 1.73632,-1.47656 h 0.002 l 0.002,0.002 h 0.002 0.002 v 0.002 l 0.004,0.002 h 0.002 0.002 l 0.002,0.002 0.002,0.002 v 0.002 h 0.002 v 0.002 l 0.002,0.002 0.002,0.002 v 0.002 0.002 c 0.0361,0.14622 -0.46816,0.95886 -1.49023,2.53125 -2.11097,3.24764 -2.04769,3.31587 1.1582,1.25586 1.86538,-1.19865 3.02582,-2.89009 2.58008,-3.75976 -0.44573,-0.86966 -0.0251,-2.16634 0.93359,-2.88086 1.08869,-0.81136 1.3451,-0.52109 0.68165,0.77343 -0.5843,1.14 -0.41027,2.07227 0.38867,2.07227 0.79897,0 1.71404,-0.94499 2.0332,-2.09961 0.32285,-1.16797 3.04703,-1.98594 6.14063,-1.8457 3.78088,0.1714 5.22965,-0.39543 4.52539,-1.76953 -0.65363,-1.27531 -0.36241,-1.51831 0.78906,-0.66016 4.58243,3.41511 14.38684,-0.71267 16.2207,-6.82813 2.1594,-7.20107 2.29531,-12.5342 0.28125,-11.0332 -0.81887,0.61028 -1.49023,0.25274 -1.49023,-0.79297 0,-1.04572 -1.29927,-1.90039 -2.88867,-1.90039 -1.58941,0 -3.34046,-0.87771 -3.89063,-1.95117 -0.55019,-1.07344 -2.16865,-1.58343 -3.59766,-1.13281 -1.42901,0.45063 -3.84852,-0.0246 -5.375,-1.05469 -4.20774,-2.8395 -11.04686,-2.87759 -11.04687,-0.0605 0,1.45197 -1.69767,2.4043 -4.28516,2.4043 -2.35659,0 -6.68726,1.21126 -9.625,2.69141 -5.34136,2.69119 -5.34187,2.69141 -4.75195,-4.45899 0.32445,-3.93273 0.0684,-7.53913 -0.56836,-8.01367 -1.67899,-1.25134 -1.67751,-11.76367 0.004,-11.76367 0.77969,0 0.98915,-2.06101 0.46484,-4.58008 -0.68458,-3.28912 -0.16868,-5.35079 1.83203,-7.31445 1.53228,-1.50392 2.04089,-2.29256 1.13086,-1.75196 -1.95053,1.1587 3.76837,-13.60932 5.9668,-15.4082 0.82545,-0.67543 2.20455,-0.8182 3.0625,-0.31641 0.85796,0.50179 0.31971,-0.30624 -1.19531,-1.79492 -1.75,-1.7196 -2.30844,-3.56867 -1.5293,-5.07031 0.6745,-1.3 1.28125,-3.17077 1.34765,-4.1582 0.0664,-0.98744 0.93748,-4.12032 1.93555,-6.96094 5.36148,-15.25953 4.6413,-22.66211 -2.20508,-22.66211 -2.5589,0 -4.07916,1.97322 -6.4082,8.32227 -1.67932,4.57795 -4.49416,9.82951 -6.25391,11.66992 -2.15135,2.24995 -2.5139,3.3565 -1.10937,3.375 1.4849,0.0196 1.58474,0.41286 0.3457,1.36328 -0.95867,0.73535 -2.20869,3.57258 -2.77734,6.30469 -0.83702,4.02145 -1.43255,4.56875 -3.13086,2.86914 -1.15379,-1.15469 -2.52857,-1.5817 -3.05469,-0.94727 -0.52612,0.63443 -0.15328,1.1543 0.83008,1.1543 1.121,0 1.53715,1.84187 1.11523,4.9375 -0.37012,2.71546 -0.72761,5.92169 -0.79492,7.125 -0.072,1.28608 -1.14325,1.71492 -2.59961,1.04101 -1.66586,-0.77085 -2.12422,-0.45919 -1.40039,0.95313 0.59209,1.15524 0.40677,2.10156 -0.41211,2.10156 -2.79606,0 -3.3062,-3.5571 -3.91992,-27.35547 -0.93143,-36.11789 -1.13478,-36.97032 -10.20898,-42.97461 -0.94046,-0.62225 -1.55493,-0.93834 -1.86133,-0.94726 z m 3.41406,8.19726 c 1.3658,-0.019 2.86266,2.65549 3.22266,7.88867 0.39667,5.76661 0.0278,6.7168 -2.60547,6.7168 -2.59547,0 -3.06641,-1.12496 -3.06641,-7.3125 0,-4.88074 1.1662,-7.2751 2.44922,-7.29297 z m 262.89453,4.30664 c 0.0339,-0.003 0.0701,0.003 0.10938,0.0195 0.98694,0.40622 1.56861,2.59487 1.29297,4.86329 -0.38137,3.13848 0.0598,3.86456 1.84375,3.03906 1.2894,-0.59665 2.18512,-0.50778 1.99023,0.19726 -0.1949,0.70504 0.0773,1.28125 0.60547,1.28125 0.52818,0 2.25831,1.41632 3.84375,3.14649 1.58544,1.73018 3.18637,2.77893 3.55859,2.33008 0.37223,-0.44886 0.67774,0.75802 0.67774,2.68359 0,3.06629 -0.43689,2.88883 -3.51172,-1.43164 -3.82435,-5.37363 -3.00737,-2.48787 1.53515,5.42188 1.56964,2.73309 4.11619,9.19686 5.65821,14.36328 2.09924,7.03334 2.85453,8.26689 3.00586,4.90625 0.0979,-2.17405 0.14919,-3.29534 0.29687,-3.36329 0.15769,-0.0538 0.42878,1.06651 0.97656,3.36329 0.98797,4.14243 1.1561,3.94293 2.20118,-2.57032 0.8331,-5.19209 1.48876,-6.3782 2.48046,-4.48828 1.00295,1.9111 1.3541,1.35053 1.3711,-2.19336 0.0151,-3.15559 2.30653,-7.70046 6.78906,-13.46484 3.72161,-4.78586 5.96137,-6.99133 4.97656,-4.90039 -2.47654,5.25813 -0.79304,9.29149 4.17578,10.00781 4.18228,0.60293 4.18207,0.60298 -0.60546,3.73438 -3.13355,2.04957 -4.49486,4.05158 -3.93946,5.79687 0.53881,1.69316 -1.78967,5.56552 -6.3789,10.60938 -5.65669,6.21709 -6.83929,8.42347 -5.44336,10.15234 1.40228,1.73675 3.57643,0.23341 10.16992,-7.0332 4.6124,-5.08327 9.16936,-9.25443 10.12695,-9.26953 1.2938,-0.0204 1.28334,-0.37915 -0.041,-1.39454 -2.84134,-2.17811 -0.006,-5.61259 5.57812,-6.75781 4.85545,-0.99579 4.97777,-0.89961 2.2461,1.76758 -1.63468,1.5961 -2.08208,2.82227 -1.0293,2.82227 1.07731,0 1.39262,0.91422 0.74805,2.17187 -0.61251,1.19507 1.39725,0.38759 4.46484,-1.79492 7.09794,-5.05001 7.79072,-4.98447 4.83398,0.45703 -4.19649,7.72312 2.36339,12.44144 11.48438,8.25977 3.12341,-1.43198 3.68001,-1.27334 3.00195,0.85742 -0.45785,1.43874 -2.68648,2.61523 -4.95312,2.61523 -7.24699,0 -13.42774,2.16915 -13.42774,4.71289 0,1.79372 2.34007,2.50401 8.56055,2.59571 13.1923,0.19446 16.75388,3.16634 4.0957,3.41796 -8.83474,0.17561 -23.73762,4.80115 -17.12304,5.31446 1.98514,0.15405 1.98514,0.38741 0,2.10937 -1.79256,1.55492 -1.64399,1.68329 0.74609,0.65235 18.59249,-8.01978 43.70097,4.80217 33.49805,17.10547 -1.63773,1.97488 -4.82039,3.64739 -7.07227,3.71679 -3.6281,0.11182 -3.75384,0.3007 -1.11523,1.66797 2.75318,1.42663 2.69537,1.56772 -0.7461,1.87695 -3.13215,0.28144 -3.24986,0.47484 -0.74414,1.21094 6.61347,1.94284 15.0145,17.35883 11.08594,20.34375 -1.84235,1.39982 -1.75475,2.479 0.61523,7.50391 5.70738,12.10094 5.88876,15.48795 0.43555,8.13476 -4.63611,-6.25139 -6.95684,-7.06216 -6.90234,-2.41406 0.0125,1.06973 0.61818,0.80949 1.3457,-0.57617 0.95289,-1.81492 1.25866,-1.22897 1.09375,2.0918 -0.1809,3.64283 -0.64932,4.18888 -2.23047,2.60742 -1.62376,-1.62407 -1.91281,-0.76631 -1.5332,4.54687 0.25728,3.60091 -0.12068,7.1967 -0.8418,7.99024 -0.73202,0.80554 -0.83818,0.45022 -0.24023,-0.80274 0.58904,-1.2343 0.36134,-2.24414 -0.50586,-2.24414 -0.86719,0 -1.57813,1.5231 -1.57813,3.38281 0,1.8714 -1.32853,3.80063 -2.97656,4.32032 -2.40549,0.75854 -2.97852,0.0536 -2.97852,-3.66211 0,-2.52981 -1.7888,-7.5035 -3.97656,-11.05274 -1.83737,-2.9808 -3.01472,-5.09926 -2.95508,-5.2832 v -0.002 l 0.002,-0.002 v -0.002 l 0.002,-0.002 0.002,-0.002 h 0.002 l 0.002,-0.002 h 0.002 0.002 0.002 c 8.7e-4,8e-5 0.005,-1.6e-4 0.006,0 0.0275,0.007 0.0785,0.0478 0.15039,0.125 0.65769,0.70583 2.4083,0.50224 3.88867,-0.45312 1.75688,-1.13378 3.01104,-1.11254 3.61328,0.0625 1.57964,3.08207 3.72461,1.97627 3.72461,-1.91993 0,-4.70725 -7.30664,-19.93156 -8.9707,-18.6914 -0.68438,0.51003 -1.72973,-0.0197 -2.32227,-1.17578 -0.67284,-1.3128 -0.43289,-1.62037 0.64063,-0.82032 2.25332,1.67932 2.2198,-1.20277 -0.0469,-3.93554 -1.36354,-1.64423 -0.66852,-2.59135 3.04492,-4.15235 5.0232,-2.11158 5.70634,-6.68531 0.79493,-5.32226 -5.83306,1.61883 -23.79448,0.64201 -27.06836,-1.47266 -5.50776,-3.55759 -9.9578,-1.06046 -6.19532,3.47656 2.84214,3.42723 4.09243,8.18826 1.67774,6.38868 -0.67294,-0.50151 0.39233,3.02093 2.36523,7.82812 2.26843,5.52724 3.80406,12.92007 4.17774,20.10742 0.5909,11.36549 0.58994,11.36414 -1.44531,4.06836 -3.26262,-11.69559 -9.45895,-26.38112 -13.5879,-32.20117 -3.82104,-5.38603 -3.82173,-5.38526 -1.3164,0.89844 2.48104,6.22275 2.47761,6.25272 -0.4336,3.12695 -2.81809,-3.0258 -3.05782,-2.99595 -5.7871,0.75195 -2.53177,3.47655 -2.56118,3.78408 -0.25782,2.77149 1.91582,-0.84222 2.83524,0.0365 3.5293,3.37109 1.58336,7.60732 -0.38934,6.79744 -5.52148,-2.26562 -2.69534,-4.75973 -3.82497,-7.60452 -2.50977,-6.32227 1.84319,1.79702 2.64476,1.83479 3.49805,0.16992 0.67667,-1.32026 0.47803,-1.69123 -0.50977,-0.95507 -0.88881,0.6624 -2.03644,0.38437 -2.55078,-0.61914 -0.51434,-1.00356 -2.18,-1.82618 -3.70117,-1.82618 -1.52117,0 -3.14903,-1.00984 -3.61914,-2.24414 -0.47015,-1.2343 -0.49853,-0.22446 -0.0625,2.24414 0.384,2.17405 0.58138,3.29511 0.45117,3.39649 l -0.002,0.002 h -0.002 l -0.002,0.002 h -0.002 c -0.15684,0.0359 -0.67367,-1.00928 -1.69532,-3.10547 -2.02397,-4.15266 -2.06909,-4.11428 -4.58203,3.82032 -2.2845,7.21333 -8.38672,16.60359 -8.38672,12.90625 0,-0.81889 -1.67353,0.40938 -3.7207,2.72851 -4.45395,5.04564 -4.84243,2.30523 -0.80664,-5.69726 2.17742,-4.31756 2.5024,-6.38696 1.2793,-8.16406 -1.28855,-1.87224 -1.0655,-2.11311 1.04883,-1.13477 1.71746,0.79475 2.33629,0.55823 1.71484,-0.6543 -0.54407,-1.06154 0.0982,-1.79002 1.45703,-1.65234 1.33607,0.13537 2.72485,-0.76375 3.08594,-1.99805 1.00919,-3.44968 -4.33547,-2.60443 -8.52539,1.34766 -2.04716,1.93097 -3.1363,3.52878 -2.42188,3.55078 0.71441,0.022 0.37971,1.40232 -0.74414,3.06836 -1.78939,2.65266 -1.7211,2.88268 0.56055,1.85156 4.81658,-2.17671 2.6671,2.11934 -6.95313,13.89258 -5.80408,7.10304 -9.85271,10.82866 -10.30468,9.48047 -0.56298,-1.67934 -0.77243,-1.64839 -0.86133,0.1289 -0.1339,2.67725 -3.09571,1.0852 -3.09571,-1.66406 0,-0.98744 0.74184,-1.24401 1.64844,-0.56836 1.09592,0.81674 1.32868,0.0157 0.69531,-2.39062 -0.52395,-1.99067 0.11839,-7.1409 1.42774,-11.44531 4.54412,-14.93877 4.59096,-14.32442 -1.03125,-13.62891 -6.02824,0.74573 -9.07881,2.70601 -7.87305,5.05859 0.47937,0.93531 1.66386,1.12907 2.63086,0.42969 0.97191,-0.70292 0.83073,0.10474 -0.31445,1.80664 -1.81104,2.69144 -1.76337,2.93586 0.37304,1.94727 1.35891,-0.62881 2.44336,-0.24769 2.44336,0.85742 0,1.09308 -0.70897,1.98633 -1.57617,1.98633 -0.86719,0 -1.09491,1.00984 -0.50586,2.24414 0.58905,1.2343 0.51492,1.63726 -0.16406,0.89453 -0.67899,-0.74274 -2.29313,-0.1942 -3.58789,1.21875 -1.29475,1.41295 -3.02488,2.51492 -3.84375,2.44922 -2.10375,-0.16881 -5.36544,7.86196 -4.6543,11.46093 0.39244,1.9861 -0.10524,2.68368 -1.46875,2.05274 -1.13562,-0.52549 -2.0664,-2.01342 -2.0664,-3.30664 0,-1.29323 -0.8131,-2.67878 -1.80664,-3.07813 -1.23195,-0.49519 -0.76795,-2.31567 1.45703,-5.72656 3.43904,-5.27206 2.61148,-10.86501 -1.91797,-12.96094 -4.77793,-2.2109 -24.02401,13.47075 -20.11133,16.38672 1.94078,1.44639 6.32768,-2.36379 5.2168,-4.53125 -0.41378,-0.80733 0.0334,-2.05306 0.99219,-2.76758 1.08868,-0.81136 1.34315,-0.52108 0.67968,0.77344 -1.33669,2.60803 -0.0725,2.63351 3.88477,0.0801 5.63789,-3.63845 11.51006,-5.03384 12.56055,-2.98438 0.63389,1.23679 0.2871,1.41404 -0.95508,0.48829 -1.3717,-1.02227 -1.59189,-0.75564 -0.74414,0.89843 0.75203,1.46729 0.61993,1.91348 -0.35157,1.18946 -0.85582,-0.63781 -2.70264,0.95346 -4.10547,3.53515 -1.41003,2.595 -1.71336,4.0687 -0.67773,3.29688 1.15989,-0.86442 1.49959,-0.66677 0.89258,0.51758 -0.53921,1.05206 -2.15031,1.68521 -3.58008,1.40625 -1.42977,-0.27896 -3.43735,0.29581 -4.46094,1.27734 -1.02358,0.98153 -1.8613,1.14024 -1.86133,0.35352 0,-0.78677 -1.67353,0.46602 -3.7207,2.78515 -4.24463,4.80851 -4.66394,6.58399 -1.55469,6.58399 1.19228,0 1.87025,-0.58199 1.50586,-1.29297 -0.3644,-0.71098 0.35621,-2.31226 1.60157,-3.5586 1.97311,-1.97463 2.07748,-1.67676 0.82031,2.31055 -1.21069,3.83991 -0.97905,4.72115 1.44141,5.48438 2.24803,0.70888 2.88476,-0.0198 2.88476,-3.30469 0,-6.54831 2.9467,-7.18713 6.98438,-1.51367 2.02212,2.84134 3.33442,3.83178 2.91601,2.20117 -0.79334,-3.0918 2.39621,-3.57285 4.57227,-0.68946 0.63785,0.84519 0.29664,0.93595 -0.75977,0.20118 -1.43564,-0.99854 -1.68728,-0.21342 -0.99609,3.10742 0.54758,2.63087 0.20179,4.98105 -0.84571,5.76172 -1.25452,0.93494 -1.50824,0.0769 -0.87695,-2.94727 0.3213,-1.53907 0.43465,-2.46724 0.3457,-2.57422 l -0.002,-0.002 h -0.002 l -0.002,-0.002 h -0.002 -0.002 l -0.002,-0.002 h -0.002 -0.002 -0.002 -0.002 c -0.0546,0.0152 -0.15257,0.1926 -0.28711,0.54492 -0.64205,1.68239 -1.42039,1.53943 -3.17968,-0.58203 -1.90084,-2.29213 -2.5835,-2.37264 -3.70118,-0.43359 -0.90333,1.56717 -1.02485,0.84809 -0.35937,-2.11133 0.68049,-3.02614 0.51595,-3.90382 -0.50195,-2.69336 -2.34249,2.78563 -0.40939,20.64649 2.23437,20.64649 1.19236,0 1.90227,0.96023 1.57813,2.13281 -0.77469,2.8025 -3.62695,3.88493 -4.70313,1.78516 -1.50094,-2.9285 -10.11767,-4.08312 -12.53515,-1.67969 -2.00723,1.99552 -2.03185,1.74121 -0.21876,-2.23828 1.12474,-2.4686 1.87567,-5.49813 1.66797,-6.73242 -0.20769,-1.23431 0.36059,-2.24415 1.26368,-2.24415 0.90309,0 1.22873,0.80944 0.72265,1.79688 -1.77902,3.47107 1.75145,1.74672 5.02344,-2.45313 3.30902,-4.24739 3.30842,-4.2466 -0.11328,-4 -1.88194,0.13563 -4.23879,-0.98386 -5.23633,-2.48632 -1.78736,-2.69206 -2.72463,-0.89075 -2.08398,4.00195 0.097,0.74058 -0.49363,1.3457 -1.3125,1.3457 -0.81886,0 -1.48829,-1.2594 -1.48829,-2.79883 0,-1.53944 -0.68145,-2.2921 -1.51367,-1.67187 -0.83223,0.62022 -1.12737,1.87962 -0.65625,2.79883 0.47112,0.91921 0.1465,1.67187 -0.7207,1.67187 -2.2518,0 -1.95097,-1.91097 0.89648,-5.70508 3.33408,-4.44253 1.38246,-6.25461 -4.06445,-3.77539 -5.91834,2.6938 7.48942,-27.14236 14.53711,-32.34961 2.67636,-1.97746 2.44872,-6.64453 -0.32422,-6.64453 -1.98523,0 -1.96523,-0.55882 0.16992,-4.48828 2.32571,-4.28019 2.29887,-4.48828 -0.58789,-4.48828 -5.12638,0 -8.32698,-2.03377 -6,-3.8125 1.58966,-1.21513 1.53722,-1.52292 -0.26172,-1.54492 -3.81051,-0.0466 -6.65779,-7.15731 -2.97656,-7.4336 1.64467,-0.12342 3.65966,-0.42696 4.47852,-0.67382 0.81887,-0.24686 3.16376,-0.5504 5.21093,-0.67383 3.54439,-0.21371 5.62792,-5.60938 2.16602,-5.60938 -2.49459,0 -8.86523,-8.52817 -8.86523,-11.86718 0,-2.79499 0.21953,-2.81096 2.60742,-0.20508 6.70172,7.3135 19.93172,8.47585 16.82617,1.47851 -1.27257,-2.86732 -0.55964,-3.74558 5.17969,-6.38867 3.65939,-1.68523 6.65234,-3.83293 6.65234,-4.77344 0,-1.01258 -1.21333,-0.92697 -2.97656,0.21094 -1.64506,1.06166 -2.97852,1.18452 -2.97852,0.27344 0,-3.37603 5.81793,-3.43134 8.33399,-0.0781 1.40174,1.86776 3.7066,3.39649 5.12109,3.39649 10.89995,0 13.50637,13.89796 2.92188,15.58008 -13.41844,2.13249 -14.61635,1.68229 -4.9961,-1.88086 5.38545,-1.99466 6.28061,-2.75595 3.50781,-2.98242 -3.72212,-0.30401 -3.72212,-0.30282 0,-1.74024 3.72212,-1.43743 3.72111,-1.43823 -0.1914,-1.61719 -6.76687,-0.30951 -14.99958,4.8183 -13.97656,8.70508 0.69779,2.65114 -0.0729,3.62029 -3.62305,4.56055 -8.14953,2.15841 -7.67739,7.07365 0.87695,9.13672 3.71576,0.89613 4.72219,0.4508 5.33203,-2.36133 0.81674,-3.76613 12.87251,-7.65234 23.74024,-7.65234 3.1389,0 5.70703,-0.787 5.70703,-1.75 0,-1.13764 1.3389,-1.13764 3.82031,0 5.52677,2.53385 11.06836,2.17343 11.06836,-0.71875 0,-1.35773 -2.0102,-2.95247 -4.4668,-3.54493 -2.45745,-0.59267 -4.46484,-2.22987 -4.46484,-3.63867 0,-1.40831 -2.38407,-4.2557 -5.29687,-6.32812 -6.19061,-4.40445 -7.6555,-4.74937 -5.23633,-1.23438 1.21238,1.76155 1.26069,2.89321 0.1582,3.71485 -0.87199,0.64986 -1.11123,2.13471 -0.53125,3.30078 0.59108,1.18839 -0.0601,1.03012 -1.48242,-0.36133 -1.74505,-1.70719 -2.07859,-3.15043 -1.06641,-4.62109 0.98708,-1.43424 0.87088,-2.9208 -0.35351,-4.51368 -1.46911,-1.91125 -1.38894,-2.08078 0.4082,-0.86914 1.9354,1.30486 1.95604,1.09362 0.1582,-1.57812 -1.83543,-2.72761 -2.3536,-2.77789 -4.5,-0.43555 -2.71538,2.96327 -4.46203,2.02223 -7.19726,-3.87891 -2.46294,-5.3137 -2.34829,-7.65429 0.37304,-7.65429 1.2283,0 2.23243,-0.84208 2.23243,-1.8711 0,-1.02902 2.57592,1.39539 5.72461,5.38672 5.45512,6.91505 10.65234,9.50141 10.65234,5.30078 0,-1.07602 -1.30632,-3.29806 -2.90234,-4.9375 -1.59619,-1.63944 -3.34417,-6.21236 -3.88672,-10.16211 -0.93116,-6.77882 -0.85529,-6.9812 1.36523,-3.59179 2.93145,4.47456 3.07035,1.53934 0.21289,-4.48828 -2.95111,-6.22516 -2.77563,-8.96218 0.22656,-3.54102 1.35205,2.44145 4.44228,6.99528 6.86719,10.11914 2.42491,3.12386 3.9875,6.50133 3.47266,7.50586 -0.51485,1.00453 -0.24402,2.34248 0.60156,2.97266 0.84558,0.63018 1.08881,2.0191 0.54102,3.08789 -0.64287,1.25433 -1.70713,0.77204 -3.00196,-1.36328 -1.10331,-1.81947 -2.00586,-2.48842 -2.00586,-1.48438 0,1.00404 1.72912,3.78583 3.84375,6.17969 2.11463,2.39386 3.62179,3.54408 3.34961,2.55664 -0.27218,-0.98743 0.17527,-1.98879 0.99414,-2.22461 0.81886,-0.23582 1.49782,0.73065 1.50782,2.14844 0.0194,2.76487 7.92755,13.54101 9.9375,13.54101 3.44692,0 0.77693,-10.2583 -4.30274,-16.53125 -3.87854,-4.78965 -4.79124,-6.80859 -3.07812,-6.80859 2.98097,0 4.9351,-6.53196 2.85742,-9.55078 -2.58112,-3.75029 -7.54959,-27.53024 -5.84766,-27.67774 z m -287.85156,3.11719 c 2.55087,0 4.56409,4.40403 4.62109,10.11328 0.0319,3.19042 -5.62307,4.23052 -6.58398,1.21094 -1.84521,-5.79843 -0.88766,-11.32422 1.96289,-11.32422 z m 568.62109,7.99219 v 0.002 l 0.002,0.002 c 0.009,0.007 0.0277,0.0181 0.0391,0.0215 h 0.002 0.002 c 0.0699,0.0104 0.14032,0.0152 0.21094,0.0195 -0.0841,-0.0174 -0.16898,-0.0324 -0.2539,-0.0449 z m -282.22851,1.19141 c 0.35836,-0.0145 1.05388,1.80098 1.9082,5.10742 1.13794,4.40411 1.78257,8.35416 1.43164,8.77734 -0.99703,1.20228 -3.71053,-8.4928 -3.59961,-12.86133 0.0174,-0.68389 0.10846,-1.01733 0.25977,-1.02343 z m -222.79492,0.54101 c 0.006,-5.8e-4 0.0133,5e-5 0.0195,0 0.47825,-0.004 0.57812,1.55239 0.57812,4.26953 0,3.46353 -1.28338,7.11832 -3.34961,9.53906 -1.84245,2.15856 -2.61118,3.42853 -1.70703,2.82032 1.19013,-0.80058 1.22323,1.10751 0.1211,6.91601 -1.58728,8.36437 -1.7384,8.53897 -5.66407,6.55078 -2.08916,-1.05807 -1.66667,-3.0816 3.17578,-15.22265 4.16543,-10.44357 6.01891,-14.79928 6.82618,-14.87305 z m -39.01563,2.01563 c 2.0569,-0.0508 4.45502,8.47919 5.56445,25.2207 1.39956,21.11961 2.94917,26.87266 6.75977,25.10937 8.28743,-3.83486 10.81579,0.45653 10.77539,18.28907 -0.029,12.80903 -0.4652,16.58203 -1.73828,15.04687 -2.46767,-2.97566 -5.57031,-2.50815 -5.57031,0.83789 0,1.86981 0.81303,2.50735 2.31054,1.81446 1.27083,-0.58806 1.96669,-0.39918 1.54688,0.41992 -2.98362,5.82141 10.2594,10.43025 16.24219,5.65234 8.66528,-6.92018 34.98828,-4.27827 34.98828,3.51172 0,8.21875 -21.01236,9.13108 -22.49219,0.97656 -0.53758,-2.96232 -1.06635,-4.57923 -1.17578,-3.5918 -0.10942,0.98744 -0.84879,0.58468 -1.64258,-0.89648 -1.07354,-2.00316 -1.4498,-0.96883 -1.4668,4.03906 -0.0125,3.7029 -0.69285,6.73242 -1.51172,6.73242 -0.81887,0 -1.48828,1.05536 -1.48828,2.34571 0,9.7644 -31.96472,37.4309 -41.86132,36.23242 -8.83422,-1.06982 -10.24805,-0.8437 -10.24805,1.63477 0,1.58138 1.00412,2.875 2.23242,2.875 2.58586,0 2.95534,5.79401 0.69336,10.89062 -2.01438,4.53875 -3.56197,4.38599 -5.72266,-0.56641 -0.62965,-1.44318 -0.99029,-2.17985 -1.08984,-2.21289 h -0.002 -0.002 -0.002 -0.002 -0.002 -0.002 -0.002 l -0.002,0.002 -0.002,0.002 -0.002,0.002 c -0.0442,0.0803 0.0991,0.66935 0.42578,1.75782 0.59265,1.97488 1.04601,6.61936 1.00781,10.32226 -0.0382,3.7029 0.50197,6.73242 1.20117,6.73242 0.6992,0 1.27149,-2.05847 1.27149,-4.57422 0,-2.57288 1.62899,-6.39264 3.72265,-8.73242 2.04717,-2.28782 3.72071,-5.88564 3.72071,-7.99414 0,-2.10851 0.65019,-3.83398 1.44336,-3.83398 0.79316,0 1.05533,1.2122 0.58398,2.69336 -0.47134,1.48116 -0.15118,2.69336 0.71094,2.69336 1.06903,0 1.30249,9.84728 0.73437,30.96875 -0.95782,35.60952 2.1046,81.74003 6.94141,104.54492 4.41299,20.80664 4.08914,24.63862 -2.59766,30.71679 -10.37765,9.43313 -22.70507,24.6019 -22.70507,27.93946 0,4.94585 1.7497,4.0971 8.25976,-4.01367 25.39213,-31.63567 43.48379,-39.64934 46.48242,-20.58789 1.02932,6.5431 3.77398,19.03136 6.09961,27.75195 4.22843,15.85561 4.22812,15.85681 -5.60156,16.97656 -14.39472,1.63977 -26.22173,1.38929 -30.66211,-0.64648 -2.15356,-0.98734 -3.52714,-1.0551 -3.06445,-0.15235 0.46133,0.90012 -0.003,2.0123 -1.03125,2.47266 -6.11975,2.7387 8.61418,5.5919 27.16211,5.25976 20.09947,-0.35991 20.09818,-0.35815 22.57812,7.25 4.19535,12.87087 6.05258,21.25574 4.99219,22.53907 -1.45787,1.76436 -52.57432,1.98002 -69.06055,0.29101 -20.5614,-2.10652 -25.64958,-5.00789 -33.2539,-18.95508 -6.16014,-11.2984 -11.32707,-15.48442 -9.66797,-7.83398 0.66123,3.04912 0.42735,3.31935 -1.33985,1.55078 -1.53866,-1.53986 -1.9139,-4.47138 -1.33789,-10.42578 1.282,-13.25231 10.74459,-135.21172 12.55274,-161.78711 3.5094,-51.57974 8.50737,-71.76843 16.72851,-67.58008 7.21085,3.67365 7.21069,3.67352 6.23047,12.58399 -0.84031,7.63857 -0.64813,8.7554 1.35156,7.83008 2.05106,-0.94909 2.23132,0.96691 1.49414,15.86328 -0.81361,16.44502 -0.74337,16.9414 2.35938,16.9414 4.04176,0 4.35255,-9.92451 0.87695,-27.99609 -1.38177,-7.18461 -1.76075,-12.49081 -0.93554,-13.12695 2.54698,-1.96341 0.26076,-12.59423 -2.48243,-11.54297 -1.98633,0.7612 -2.05328,0.59764 -0.35351,-0.85938 1.15404,-0.98923 2.92835,-1.41499 3.94336,-0.94531 1.01502,0.46968 2.28753,-0.008 2.82812,-1.0625 0.54059,-1.05476 0.10707,-1.93021 -0.96484,-1.94531 -1.41617,-0.02 -1.3396,-0.50296 0.2832,-1.76758 1.2283,-0.9572 1.56301,-1.72724 0.74414,-1.71094 -0.81886,0.0163 -2.70971,1.14671 -4.20312,2.51172 -4.57019,4.17723 -15.40155,-1.2863 -18.12305,-9.14062 -3.12193,-9.00998 -5.05289,-54.81123 -2.47656,-58.73438 0.73964,-1.1263 1.11829,-3.66379 0.8418,-5.63867 -3.30799,-23.62819 -0.72372,-50.83199 3.02734,-31.86719 0.53709,2.71546 1.32427,6.35206 1.75,8.08008 0.53886,2.18719 -0.048,3.13238 -1.93164,3.11328 -2.31925,-0.0236 -2.38687,-0.2992 -0.47266,-1.93164 1.81653,-1.54909 1.83565,-1.77454 0.0937,-1.20703 -3.39701,1.10744 -3.63362,4.96289 -0.30469,4.96289 3.37472,0 3.87354,0.70874 5.1875,7.35742 0.73617,3.72466 0.22787,5.045 -2.52343,6.55664 -2.48268,1.36405 -5.17226,7.62891 -3.27539,7.62891 0.0931,0 5.79977,-2.86338 12.68164,-6.36328 6.88188,-3.4999 15.57005,-6.88283 19.30859,-7.51758 5.87465,-0.99743 6.29305,-1.32714 3.07617,-2.4336 -3.72212,-1.28022 -3.72212,-1.28086 0,-1.60156 2.40211,-0.20696 2.92954,-0.68412 1.48828,-1.3457 -3.84504,-1.76498 -4.41982,-4.51382 -4.44336,-21.23828 -0.0217,-15.4964 1.60878,-23.11636 3.54102,-23.16406 z m -20.79492,2.76171 c 2.65239,0.12227 3.21702,4.38434 0.69531,6.26368 -1.18484,0.88301 -1.15273,1.59555 0.11328,2.53906 0.96838,0.7217 2.11947,4.54228 2.5586,8.49023 0.68685,6.17506 0.36766,7.31375 -2.2793,8.14844 -2.70321,0.85243 -3.18518,-0.0415 -3.9668,-7.36719 -0.48932,-4.58616 -1.1438,-9.83251 -1.45508,-11.6582 -0.43142,-2.53029 0.11765,-3.10362 2.31055,-2.41211 3.15314,0.99431 4.00971,-1.49627 1.01563,-2.95312 -1.11179,-0.54096 -0.81236,-0.96413 0.74414,-1.04883 0.0899,-0.005 0.17811,-0.006 0.26367,-0.002 z m 564.27734,1.33789 c 1.14082,0.0137 2.05645,2.75384 2.23438,7.74024 0.11278,3.16068 -6.83223,5.79177 -8.20703,3.10937 -0.43822,-0.85502 -0.23455,-1.55468 0.45312,-1.55468 0.68766,0 2.12056,-2.62482 3.18359,-5.83399 0.78121,-2.35829 1.60465,-3.46968 2.33594,-3.46094 z m -263.65429,0.25 c 0.44295,-0.049 2.05397,2.75268 4.01367,7.38477 h -0.002 c 1.70223,4.02352 2.83434,8.25721 2.51563,9.41016 -0.31871,1.15295 -1.07347,-0.2784 -1.67773,-3.18164 -0.71454,-3.43297 -1.49276,-4.50794 -2.22657,-3.07618 -0.77599,1.51405 -1.67741,0.7474 -2.88672,-2.45312 -1.34573,-3.56217 -1.34473,-4.34777 -0.006,-3.34766 1.18401,0.88239 1.44481,0.33797 0.80274,-1.67968 -0.65946,-2.07231 -0.78593,-3.02868 -0.5332,-3.05665 z m -317.77149,3.66016 c 0.0119,-0.001 0.0232,0 0.0352,0 1.80933,0 3.54009,6.62096 2.34179,8.95899 -1.82122,3.55342 -3.73046,1.72439 -3.73046,-3.57422 0,-2.91603 0.60614,-5.31066 1.35351,-5.38477 z m 550.77149,3.58984 c 3.73839,5e-5 6.9222,8.25478 3.75,9.72266 -3.51687,1.62737 -4.6095,1.27738 -5.58594,-1.79101 -1.61766,-5.08336 -0.95768,-7.93164 1.83594,-7.93165 z m 27.33203,10.08985 c 0.52475,-0.0253 1.17566,0.067 1.96093,0.24805 4.42947,1.02106 4.73205,1.49631 5.41211,8.51367 0.75983,7.84064 -5.34861,8.14514 -7.59375,0.3789 -1.94491,-6.72769 -2.05322,-9.03105 0.22071,-9.14062 z m -24.54688,2.74219 c 0.3059,-0.005 0.19949,0.52917 -0.32812,1.55859 -0.85901,1.67603 -0.55566,2.07249 1.02343,1.3418 2.8969,-1.34049 4.59947,0.19999 6.75,6.10937 1.44014,3.95732 1.34824,4.96895 -0.52539,5.83594 -1.24635,0.57672 -3.13359,1.04687 -4.19531,1.04687 -2.52892,0 -5.57143,-13.92596 -3.39648,-15.54687 0.30752,-0.22919 0.53283,-0.34339 0.67187,-0.3457 z m -487.94726,5.36718 c 0.81885,0.008 1.73784,0.61819 3.01367,1.69532 1.7099,1.44359 1.36155,1.60311 -1.48828,0.68359 -3.38121,-1.09097 -3.48008,-0.97717 -1.07032,1.24609 2.266,2.09065 2.40727,3.29636 0.97071,8.26563 -0.92495,3.19952 -2.1183,5.72392 -2.65235,5.60937 -7.12379,-1.52794 -7.59305,-3.26274 -3.2207,-11.91015 1.99566,-3.94693 3.0825,-5.60373 4.44727,-5.58985 z m 556.74609,0.043 c -0.44343,0.2012 -0.7657,0.34643 -0.99805,0.49024 0.28956,0.5952 0.85117,1.24356 1.50196,1.89843 0.2431,-0.15255 0.45138,-0.29307 0.63086,-0.42773 -0.32057,-0.61352 -0.72354,-1.28461 -1.13477,-1.96094 z m -316.375,0.82031 c 0.86922,-0.0495 1.75531,0.70023 2.99609,2.35352 1.42438,1.89792 2.2749,4.92508 1.88868,6.72656 -0.38622,1.80149 -0.78,2.26555 -0.875,1.03125 -0.095,-1.2343 -1.09658,-2.24414 -2.22461,-2.24414 -3.49486,0 -5.74801,-4.59002 -3.4043,-6.93554 0.5823,-0.58276 1.09761,-0.90178 1.61914,-0.93165 z m 48.85547,0 c -4.46139,-0.12799 -23.16182,11.96171 -23.5586,15.49805 -0.44456,3.96297 -0.87752,4.05971 8.53711,-1.91211 4.3822,-2.77969 10.1453,-5.96919 12.80665,-7.08789 5.09708,-2.1426 6.23933,-4.77933 2.76562,-6.38672 -0.14666,-0.0679 -0.33137,-0.10497 -0.55078,-0.11133 z m -334.85938,2.12891 c 1.8607,-0.007 3.92943,2.1117 5.10547,6.73242 1.51872,5.96714 1.3842,6.49183 -2.08008,8.08008 -5.62747,2.58001 -6.11028,2.22412 -6.83984,-5.03515 -0.6274,-6.24292 1.42213,-9.76782 3.81445,-9.77735 z m 582.48243,2.45899 c 0.0935,-0.001 0.1907,0.008 0.28906,0.0312 1.89078,0.44011 2.64819,2.44757 2.75976,7.31445 0.15486,6.75527 -0.10851,7.16969 -3.5039,5.51758 -3.00547,-1.46239 -2.44456,-12.82093 0.45508,-12.86328 z m -284.24219,0.7832 c -0.29266,0.0355 -0.59025,2.65067 -0.71289,6.56055 -0.2967,9.4587 3.36652,12.3462 5.09961,4.01953 1.08374,-5.20687 -0.23061,-10.5715 -2.22657,-9.08399 -0.75471,0.56246 -1.65096,0.0184 -1.99023,-1.20898 -0.0557,-0.20136 -0.11248,-0.29408 -0.16992,-0.28711 z m 258.54492,5.2363 c 0.70457,0.0317 2.43858,1.77918 6.01758,5.38672 7.581,7.64145 8.79514,12.40053 3.5918,14.08203 -4.92265,1.59078 -8.45248,1.01845 -4.09571,-0.66407 3.72213,-1.43742 3.72325,-1.43822 -0.37109,-1.61718 -2.95802,-0.12929 -4.09375,-1.11291 -4.09375,-3.54493 0,-1.8514 -0.4442,-6.03995 -0.98633,-9.30859 -0.47744,-2.87863 -0.72437,-4.36374 -0.0625,-4.33398 z m -204.0625,2.69726 c 0.89204,0.07 1.33651,0.25822 1.01367,0.59375 -0.3412,0.35461 -3.97012,1.11106 -8.06445,1.68164 -4.78926,0.66742 -6.3825,0.48367 -4.4668,-0.51758 2.13335,-1.11474 8.84146,-1.96765 11.51758,-1.75781 z m -43.38086,1.74414 c -1.88354,0 -9.16269,10.07349 -8.15625,11.28711 1.3115,1.58149 8.52329,-5.44087 8.91797,-8.68359 0.17424,-1.43155 -0.16851,-2.60352 -0.76172,-2.60352 z m 231.89844,0 c 5.7955,0 8.51941,10.68792 3.99023,15.65821 -0.7009,0.76916 -0.79216,0.38859 -0.20312,-0.84571 0.58905,-1.2343 0.65222,-2.24414 0.14062,-2.24414 -0.51159,0 -2.22664,0.83524 -3.81054,1.85742 -2.21437,1.42906 -2.87891,1.27292 -2.87891,-0.67382 0,-1.39248 -0.41985,-5.05488 -0.93164,-8.14063 -0.88241,-5.32031 -0.69179,-5.61133 3.69336,-5.61133 z m 42.64844,8.97657 c 3.14313,0 3.7207,0.83851 3.7207,5.38671 0,2.82347 -0.15223,5.05771 -0.34375,5.14454 h -0.002 l -0.002,0.002 h -0.002 c -7.9e-4,6e-5 -0.005,10e-6 -0.006,0 h -0.002 -0.002 -0.002 l -0.002,-0.002 h -0.002 -0.002 l -0.002,-0.002 -0.002,-0.002 c -0.2047,-0.13447 -1.8802,-0.59356 -3.72265,-1.02148 -5.05461,-1.17403 -4.72753,-9.50586 0.37305,-9.50586 z m 14.09765,0.0801 c 0.39955,0.0107 0.81194,0.24577 1.21875,0.73633 0.53595,0.64629 -0.0122,1.92512 -1.2168,2.84375 -1.20459,0.91862 -1.49732,1.68412 -0.65234,1.69922 0.84498,0.0151 1.67432,2.04703 1.84375,4.51563 0.20206,2.94409 -0.45425,4.48828 -1.9082,4.48828 -1.53345,0 -2.2168,-1.90396 -2.2168,-6.17774 0,-4.75843 1.36419,-8.14752 2.93164,-8.10547 z m -235.86133,0.18164 c -0.84356,0.0374 -2.7054,0.84267 -6.77539,2.4668 -6.69982,2.67358 -6.70079,2.67349 -1.16211,2.13477 5.2067,-0.50643 5.39781,-0.34942 3.16407,2.62695 -1.80214,2.40128 -3.05173,2.73096 -5.16797,1.36523 -1.7759,-1.14609 -2.78906,-1.16526 -2.78906,-0.0547 0,0.9601 -2.17853,1.49919 -4.83985,1.19726 -1.5964,-0.18111 -2.50137,-0.21638 -2.58984,-0.12695 l -0.002,0.002 -0.002,0.002 v 0.002 l -0.002,0.002 v 0.002 0.002 0.002 0.002 0.002 0.002 0.002 l 0.002,0.002 v 0.002 h 0.002 c 0.0425,0.0652 0.35207,0.1734 0.95118,0.31641 1.75906,0.4199 3.53891,2.33296 3.95507,4.25195 1.27213,5.86608 15.92383,-5.23641 15.92383,-12.06641 0,-1.44394 0.1756,-2.17406 -0.66797,-2.13672 z m -72.13867,0.36524 c -0.58459,0.0271 -1.25472,0.13192 -2.00781,0.32422 -8.76743,2.23868 -19.35621,8.4285 -17.2168,10.06445 3.04202,2.32615 9.4341,-0.86279 7.86524,-3.92383 -0.4807,-0.9379 -0.2182,-1.70508 0.58203,-1.70508 0.80022,0 2.48728,-0.47819 3.75,-1.0625 1.70891,-0.79074 2.14367,-0.10186 1.69726,2.69336 -0.7213,4.51643 -0.25364,4.60519 4.49219,0.85547 4.8516,-3.83329 4.93005,-7.43587 0.83789,-7.24609 z M 214.0957,245.5 c -1.66693,-0.0339 -5.80964,1.69415 -12.18945,5.56836 -7.58572,4.60652 -10.34961,7.23595 -10.34961,9.85156 0,4.59472 -0.87988,4.9403 13.23828,-5.18554 8.88475,-6.37236 11.73706,-10.18483 9.30078,-10.23438 z m 270.81641,1.03516 c -1.7137,0 -4.63667,4.64513 -3.66211,5.82031 0.45681,0.55085 0.0135,1.61031 -0.98633,2.35547 -1.1617,0.86577 -1.43471,0.60771 -0.75586,-0.7168 1.87013,-3.64887 0.11185,-2.23571 -4.76367,3.83008 -4.04076,5.02723 -4.33216,5.93962 -1.96875,6.1543 1.5263,0.13864 4.99655,-2.51311 7.71289,-5.89258 4.73314,-5.88865 6.90271,-11.55078 4.42383,-11.55078 z m 270.51562,1.11914 c 10.07871,-0.0539 25.25401,4.03027 39.35352,11.77343 10.84585,5.95632 11.61515,7.41339 11.65625,22.11719 0.0138,4.93719 1.05549,16.08877 2.31641,24.78125 2.29259,15.80452 2.2922,15.80476 -2.36719,25.625 -4.55062,9.591 -4.62185,10.10095 -3.11719,21.89649 2.20936,17.31994 2.93556,25.32366 4.67969,51.57617 2.44935,36.86765 5.79667,66.24275 10.57812,92.83008 5.86899,32.6346 8.86356,55.46189 7.58985,57.83984 -0.56967,1.06355 -1.37435,-0.88526 -1.78907,-4.33008 -1.34708,-11.18926 -5.96484,-9.49407 -5.96484,2.18945 0,17.75951 -19.1894,29.0146 -69.67969,40.86915 -32.17725,7.55486 -35.53889,5.095 -31.59375,-23.10938 1.72328,-12.31999 1.72295,-12.31834 8.23243,-11.43359 7.95089,1.08067 14.13086,-0.5962 14.13085,-3.83203 0,-1.76516 -2.35124,-2.35444 -8.80273,-2.20899 -12.27355,0.27671 -12.27077,0.52885 -0.22656,-38.40234 9.84782,-31.8317 21.68555,-30.36254 21.68555,2.6914 0,18.99534 0.29842,21.52491 2.60546,22.08008 2.29172,0.55149 2.60547,-0.95702 2.60547,-12.53125 0,-17.30217 3.45932,-52.17937 8.13477,-82 2.06776,-13.18844 3.45482,-26.92345 3.08203,-30.52148 -2.24821,-21.6989 -2.31152,-64.88867 -0.0957,-64.88867 1.25342,0 2.27929,1.132 2.27929,2.51562 0,2.43356 10.19315,10.92366 11.38672,9.48438 0.32458,-0.3914 -1.74899,-2.64403 -4.60742,-5.00586 -5.56848,-4.60106 -7.45288,-13.90115 -2.11914,-10.45899 1.72241,1.11157 2.78603,0.92076 3.29492,-0.58984 0.5631,-1.67151 1.17509,-1.55582 2.44922,0.46289 1.36208,2.15805 1.49674,1.80184 0.67383,-1.79492 -1.41928,-6.2033 -1.17065,-6.12348 -9.0293,-2.89453 -3.87516,1.59221 -7.99765,2.89453 -9.16015,2.89453 -4.22578,0 -16.63667,-18.43224 -19.07813,-28.33399 -2.57716,-10.45216 -11.60163,-24.3611 -16.27734,-25.08593 -14.61089,-2.26504 -17.08789,-2.98282 -17.08789,-4.95899 0,-6.23438 15.67074,-12.30102 18.73242,-7.25195 1.38154,2.2783 1.55541,4.28087 0.56445,6.51367 -1.94964,4.39285 -1.81652,5.00696 0.9707,4.51367 1.32033,-0.23368 3.09381,-1.98017 3.94141,-3.88086 0.84761,-1.90069 1.69358,-3.69129 1.88086,-3.98047 0.91635,-1.41489 10.71593,5.84348 13.08984,9.69532 2.63001,4.26741 2.6161,4.55655 -0.49414,10.625 -2.31741,4.52155 -2.64986,6.27178 -1.21289,6.36328 1.09037,0.0694 0.64165,0.82129 -0.99609,1.66992 -2.97769,1.54297 -2.97769,1.54252 0,1.64648 1.82015,0.0635 4.28046,-2.32081 6.32812,-6.13281 3.39986,-6.32927 4.36556,-11.67187 2.10938,-11.67187 -0.68239,0 -1.24219,-1.2122 -1.24219,-2.69336 0,-4.68802 5.87376,-2.94642 15.13672,4.48828 4.9132,3.94347 10.10604,7.17278 11.53906,7.17578 4.85875,0.0107 2.63312,-4.46195 -4.6875,-9.41992 -7.9529,-5.38619 -9.82509,-6.04133 -8.19726,-2.86524 0.66347,1.29451 0.40704,1.58675 -0.68164,0.77539 -0.95879,-0.71452 -1.37535,-2.01737 -0.92579,-2.89453 1.33201,-2.59891 -8.24232,-7.53687 -12.98632,-6.69726 -3.86491,0.68402 -4.27007,0.33464 -3.44727,-2.97266 3.6375,-14.6211 0.90835,-24.94734 -3.24414,-12.27539 -1.61787,4.93719 -1.61704,4.93604 -1.92383,-1.34766 -0.16874,-3.45604 -0.77896,-8.30288 -1.35547,-10.77148 -1.23095,-5.27097 3.52429,-7.81554 11.36328,-7.85742 z m 4.95704,2.5 c -2.04199,0.0242 -2.05175,0.23634 -0.0859,1.76758 1.98513,1.54696 1.98513,1.74806 0,1.82226 -1.22831,0.0459 0.44523,2.07509 3.7207,4.50781 7.31314,5.43154 11.16602,5.72587 11.16602,0.85157 0,-2.50986 -1.00805,-3.60854 -3.34961,-3.64844 -1.84245,-0.0314 -4.65071,-1.2436 -6.24024,-2.69336 -1.58953,-1.44975 -3.93442,-2.62252 -5.21093,-2.60742 z m -304.50782,0.71484 c -7.12559,0.44979 -16.42414,6.5449 -20.94726,14.86914 -1.27036,2.33794 -2.90455,3.80692 -3.63086,3.26563 -0.72631,-0.54129 -1.74693,-0.14856 -2.26953,0.87109 -0.52259,1.01966 -1.57959,1.38491 -2.34766,0.8125 -1.59573,-1.18924 -3.71114,4.14938 -2.3125,5.83594 0.50557,0.60966 2.2635,-0.35768 3.90625,-2.15039 1.69077,-1.84512 2.98633,-2.35937 2.98633,-1.18555 0,3.57758 3.58296,2.27739 9.25195,-3.35742 3.00524,-2.98713 8.35135,-7.42162 11.87891,-9.85352 3.52755,-2.4319 5.36829,-4.43146 4.0918,-4.44336 -1.27653,-0.0119 -3.62141,1.16549 -5.21094,2.61524 -3.63917,3.31917 -6.0261,3.5306 -3.83008,0.33984 0.91203,-1.32515 1.2185,-2.94011 0.67969,-3.58984 -0.53881,-0.64972 -0.36587,-1.22881 0.38476,-1.28711 0.75063,-0.0583 3.92188,-0.34162 7.04688,-0.62891 3.46153,-0.31822 4.91656,0.0636 3.72265,0.97656 -1.07783,0.82417 -1.36683,1.5103 -0.64062,1.5254 0.7262,0.0151 -1.67094,3.8849 -5.32813,8.5996 -8.64519,11.14505 -12.14824,17.71595 -11.13671,20.89454 0.85901,2.69935 3.40599,2.84326 6.68164,0.37695 1.56741,-1.18014 1.44656,-2.15507 -0.60352,-4.88672 -1.63382,-2.177 -1.90701,-3.41211 -0.75391,-3.41211 0.99408,0 1.45017,-0.70117 1.01172,-1.55664 -0.80817,-1.57685 3.38207,-7.10075 5.49219,-7.24023 2.22441,-0.14704 14.88533,-12.7482 12.83594,-12.77539 -1.67915,-0.0222 -1.6489,-0.39732 0.1582,-1.96485 1.85461,-1.60875 1.76943,-1.75423 -0.50586,-0.86328 -1.50692,0.59007 -3.51711,0.48648 -4.4668,-0.22852 -1.63481,-1.23082 -3.76933,-1.70852 -6.14453,-1.55859 z m 126.16407,1.19336 c 0.97894,0.0147 0.54839,0.8668 -1.89454,2.55078 -2.04717,1.41118 -5.06148,2.56455 -6.69921,2.56055 -2.05605,-0.005 -1.42785,-0.81991 2.03125,-2.63086 3.19495,-1.67265 5.58355,-2.49521 6.5625,-2.48047 z m -46.5625,8.89062 h 0.002 0.002 c 1.92866,10e-6 1.93707,0.22438 0.0762,1.64454 -2.42096,1.84691 1.01392,3.22315 10.23047,4.09961 2.93552,0.27916 5.40431,1.62654 5.82422,3.17773 0.64799,2.3938 0.42401,2.3938 -2.0293,0 -2.00646,-1.95777 -1.80546,-1.12029 0.73829,3.07031 1.92448,3.1704 4.02822,5.36932 4.67578,4.88672 0.64756,-0.4826 1.9191,0.96349 2.82422,3.21289 0.77682,1.93054 1.17554,2.93646 1.10742,3.06836 l -0.002,0.002 v 0.002 0.002 h -0.002 l -0.002,0.002 -0.002,0.002 -0.002,0.002 h -0.002 l -0.002,0.002 h -0.002 c -0.002,3e-4 -0.007,1.5e-4 -0.01,0 -0.15105,-0.0226 -0.77459,-0.8999 -1.95313,-2.58203 -1.27689,-1.82252 -1.90924,-2.71896 -2.07031,-2.6914 h -0.002 -0.002 l -0.002,0.002 h -0.002 v 0.002 h -0.002 l -0.0117,0.008 c -0.0942,0.12931 0.18526,1.02461 0.70898,2.67969 2.92367,9.23981 2.9102,12.75001 -0.0371,9.87305 -1.51748,-1.48116 -2.30317,-1.77569 -1.74609,-0.6543 0.61738,1.24278 -0.43319,2.37397 -2.69141,2.89453 -2.03762,0.4697 -3.70508,0.15715 -3.70508,-0.69336 0,-0.85051 1.0505,-1.54687 2.33399,-1.54687 3.97923,0 0.97351,-6.78551 -7.22657,-16.31641 -9.53049,-11.07725 -11.54427,-9.91781 -2.61523,1.50586 1.73654,2.22174 2.54347,4.03906 1.79297,4.03906 -0.7505,0 -2.23804,-1.26855 -3.30469,-2.81836 -1.06665,-1.5498 -3.15903,-2.43317 -4.65039,-1.96289 -1.51118,0.47653 -2.31851,0.0894 -1.82422,-0.875 2.08747,-4.07292 1.64922,-10.50219 -0.7168,-10.52929 -2.09384,-0.024 -2.11377,-0.2497 -0.16601,-1.76758 1.2283,-0.9572 3.23849,-1.74019 4.4668,-1.74024 z m 24.57617,3.59766 c -0.67667,0.0303 -0.24459,0.94083 1.57031,2.63477 2.8469,2.6572 2.84563,2.68241 -0.0879,1.62695 -2.42626,-0.87302 -2.56384,-0.71322 -0.74414,0.86523 2.77318,2.40555 4.04207,2.47627 5.16406,0.28711 0.4807,-0.93789 -0.44004,-2.55481 -2.04687,-3.59179 -1.87648,-1.211 -3.18661,-1.80092 -3.78711,-1.82227 -0.0241,-8.6e-4 -0.0465,-9.8e-4 -0.0684,0 z m -65.71094,2.2168 h 0.002 c 0.004,-1.8e-4 0.008,0 0.0117,0 0.24727,0.008 0.5145,0.79686 0.95313,2.30469 0.61174,2.10294 2.38905,3.49609 4.46289,3.49609 8.14223,0 17.29715,30.36892 10.2832,34.11133 -3.93544,2.09982 -6.96689,7.31943 -5.36914,9.24609 0.61149,0.73737 5.52512,-1.28149 10.91797,-4.48828 9.98346,-5.93652 11.99938,-6.17675 10.42969,-1.24414 -0.50858,1.59819 -2.67319,2.76953 -5.11524,2.76953 -8.18764,0 -15.29799,17.37995 -9.01953,22.04688 4.51108,3.35318 25.66482,2.16093 24.53711,-1.38282 -0.39511,-1.24159 0.90297,-3.30306 2.88477,-4.58203 4.14294,-2.67367 4.60407,-4.9605 1.30664,-6.48633 -2.03212,-0.94032 -2.00524,-1.45397 0.23828,-4.44336 3.19373,-4.25552 2.15919,-5.51171 -4.54102,-5.51171 -5.29336,0 -6.85468,-1.86915 -3.59179,-4.30079 1.06497,-0.79369 1.31443,-0.49124 0.65624,0.79297 -0.58428,1.14001 -0.7043,2.07227 -0.26757,2.07227 3.21599,0 5.23379,-11.16681 3.63476,-20.10938 -1.34979,-7.54868 -1.9433,-8.77263 -2.87304,-5.92382 -1.01759,3.11796 -1.18449,3.16971 -1.27539,0.39257 -0.29918,-9.14277 10.72928,-2.30784 12.56835,7.78907 0.50454,2.77008 2.005,6.10176 3.33399,7.40429 2.10636,2.06444 2.2759,1.91928 1.32812,-1.12304 -1.0137,-3.25393 -0.90558,-3.29302 1.58399,-0.57618 1.91161,2.08612 2.59119,5.19434 2.39453,10.93946 -0.16672,4.87041 0.59771,9.33084 1.94336,11.34765 0.93478,1.40101 1.45186,2.14334 1.5918,2.14063 h 0.002 l 0.002,-0.002 h 0.002 0.002 0.002 0.002 0.002 l 0.002,-0.002 0.002,-0.002 0.002,-0.002 c 0.002,-0.002 0.006,-0.007 0.008,-0.01 0.0752,-0.15867 -0.29296,-1.21896 -1.05469,-3.28711 -0.76231,-2.06974 -1.11648,-3.10604 -1.01953,-3.23633 7.8e-4,-8.7e-4 0.005,-0.005 0.006,-0.006 l 0.002,-0.002 c 3e-5,-1e-5 0.01,-0.003 0.0117,-0.004 h 0.002 0.002 0.0117 0.0117 l 0.002,-0.002 h 0.01 0.002 0.002 0.002 0.002 c 0.13545,-0.007 0.60733,0.64418 1.43359,1.875 1.14972,1.71264 2.68685,2.52015 3.41602,1.79492 0.14242,-0.14164 0.2291,-0.2069 0.26562,-0.20312 l 0.002,0.002 h 0.002 0.002 l 0.002,0.002 h 0.002 l 0.002,0.002 0.002,0.002 0.002,0.002 v 0.002 0.002 l 0.002,0.002 v 0.002 c 0.0278,0.1661 -0.67054,1.31508 -1.86719,3.02539 -3.32411,4.75081 -7.08568,1.38027 -6.63086,-5.94336 0.47599,-7.66475 -0.15829,-11.85136 -1.63086,-10.75391 -0.83916,0.62539 -1.3422,0.0675 -1.11718,-1.24023 0.225,-1.30769 -0.42953,-2.17655 -1.45313,-1.92969 -1.02359,0.24686 -1.69299,-0.45944 -1.48828,-1.57031 0.20471,-1.11086 -0.43008,-2.37663 -1.41211,-2.8125 -1.34641,-0.5976 -1.41958,0.67219 -0.29297,5.16211 0.82168,3.27475 1.71317,8.37752 1.98047,11.33984 1.68238,18.64446 6.55076,28.39143 10.73437,21.49219 1.10988,-1.83033 2.01758,-2.36563 2.01758,-1.18946 0,1.17617 0.67137,2.13868 1.49024,2.13868 0.81885,0 1.48828,-1.16501 1.48828,-2.58789 0,-1.42289 0.75653,-3.15041 1.68164,-3.83985 1.02791,-0.76603 1.3953,-0.28389 0.94531,1.24024 -0.40503,1.37174 -0.0946,3.99604 0.68945,5.83007 0.98244,2.29805 0.85219,3.97102 -0.41992,5.38477 -1.42237,1.58075 -1.64939,1.37416 -0.98828,-0.9043 0.61274,-2.1117 -0.17502,-3.19564 -2.75781,-3.79101 -2.45649,-0.56626 -3.61719,-0.0153 -3.61719,1.71679 0,1.40251 0.62445,2.08373 1.38672,1.51563 2.0072,-1.49589 3.41861,2.08886 2.37891,6.03906 -0.60672,2.30514 -1.82893,3.0961 -3.81836,2.46875 -3.17012,-0.99966 -3.80876,-3.22546 -1.43555,-4.99414 0.81886,-0.61027 1.48828,-0.25274 1.48828,0.79297 0,1.04572 0.66941,1.90039 1.48828,1.90039 0.81887,0 1.49024,-1.08728 1.49024,-2.41602 0,-2.10133 -2.79664,-2.51265 -9.16602,-1.35156 -0.53731,0.0979 -1.43209,4.41946 -1.98828,9.60352 -1.81602,16.92645 -6.35779,35.45766 -10.13476,41.35156 -7.65202,11.9409 -26.41119,33.60352 -29.09961,33.60352 -1.53691,0 -5.73559,0.41173 -9.33008,0.91406 -8.49982,1.18785 -11.57298,-0.67224 -29.70899,-17.9707 -16.2749,-15.52329 -17.69884,-17.88201 -23.77343,-39.41797 -2.21603,-7.85636 -4.78665,-14.58864 -5.71289,-14.96094 -2.07646,-0.83464 -2.21152,6.69373 -0.23243,12.9707 1.96913,6.24541 -1.36541,6.19373 -6.95117,-0.10742 -1.53468,-1.73124 -2.35199,-2.79659 -2.29297,-2.93945 v -0.002 l 0.002,-0.002 0.002,-0.002 v -0.002 l 0.002,-0.002 0.002,-0.002 h 0.002 0.002 l 0.002,-0.002 v -0.002 h 0.002 0.002 0.002 c 0.0761,-0.008 0.31849,0.1577 0.73633,0.51758 3.80207,3.27488 4.97179,0.72775 2.72461,-5.93555 -3.57651,-10.60502 -3.64353,-13.26516 -0.35937,-14.30078 1.672,-0.52725 3.32357,-0.0338 3.66992,1.09571 1.70357,5.5557 3.85937,-1.91 2.39648,-8.29883 -1.04746,-4.57445 -1.03857,-7.74444 0.0293,-10.15039 0.85407,-1.92435 1.55469,-5.8545 1.55469,-8.73438 0,-6.2687 2.61698,-16.07582 5.61328,-21.0332 2.11032,-3.49153 2.14759,-3.47276 1.35351,0.64258 -1.66961,8.65262 4.17532,17.64644 6,9.23242 0.42826,-1.97488 1.64732,-3.5918 2.70899,-3.5918 1.50629,0 1.5776,1.13022 0.32226,5.14063 -1.11131,3.55027 -2.40116,4.8898 -4.16992,4.33203 -3.23989,-1.02166 -4.86253,2.04197 -3.60742,6.81055 0.76353,2.90095 1.81223,3.4609 4.93555,2.63671 2.97131,-0.78408 4.43395,-0.13666 5.83789,2.58399 1.03053,1.997 1.23237,3.63086 0.44726,3.63086 -0.78512,0 -2.08075,-1.40717 -2.8789,-3.12696 -0.79813,-1.71979 -1.93199,-2.54638 -2.51953,-1.83789 -0.58754,0.70849 -0.14764,2.72078 0.97851,4.47266 0.89339,1.38978 1.36863,2.1457 1.3418,2.26953 l -0.002,0.002 v 0.002 0.002 0.002 l -0.002,0.002 -0.002,0.002 -0.002,0.002 -0.002,0.002 h -0.002 -0.002 -0.002 l -0.002,0.002 c -0.13351,0.006 -0.88061,-0.74247 -2.3457,-2.24219 -1.6881,-1.72802 -4.02173,-3.13033 -5.18555,-3.11523 -1.75038,0.0227 -1.73015,0.32797 0.11719,1.76758 1.98514,1.54699 1.98514,1.75246 0,1.85156 -1.22829,0.0613 1.11662,1.70854 5.21094,3.66015 5.47413,2.60931 9.02109,3.2125 13.40039,2.27735 5.95539,-1.2717 5.95483,-1.27286 1.48828,-2.52344 -4.46655,-1.25058 -4.4657,-1.25048 -0.40821,-1.46289 3.61481,-0.18925 3.91303,-0.66829 2.73633,-4.40039 -0.99717,-3.16262 -0.80573,-4.18945 0.78125,-4.18945 2.15945,0 2.64161,1.5555 2.17969,7.03125 -0.14575,1.72802 0.38405,3.14257 1.17773,3.14257 0.79368,0 1.09234,1.61497 0.66407,3.58985 -0.88199,4.06701 2.31615,4.94705 5.22656,1.4375 3.68311,-4.4413 -2.1988,-24.27677 -6.5957,-22.24219 -1.12136,0.51889 -2.03907,0.34115 -2.03907,-0.39453 0,-0.73572 -2.51324,-1.06085 -5.58398,-0.72266 -3.43116,0.37788 -6.7306,-0.44588 -8.56055,-2.13867 -2.94482,-2.72412 -2.93988,-2.756 0.37305,-2.8125 1.84244,-0.0314 3.34961,-0.86412 3.34961,-1.85156 0,-0.98744 0.70898,-1.79492 1.57617,-1.79492 0.8672,0 1.11891,0.8931 0.55859,1.98633 -0.67262,1.31236 -0.0287,1.60986 1.89649,0.87304 1.60375,-0.61379 5.79167,0.10612 9.30664,1.60156 10.76076,4.57819 16.14224,1.91982 9.49609,-4.6914 -2.24609,-2.23428 -2.31193,-2.08673 -0.69336,1.57617 1.18254,2.67616 1.25511,4.03906 0.21289,4.03906 -0.86522,0 -2.33679,-2.01968 -3.26953,-4.48828 -0.93275,-2.4686 -2.7942,-4.48828 -4.13672,-4.48828 -1.34252,0 -3.23005,-0.94974 -4.19336,-2.11133 -1.34267,-1.61909 -2.42719,-1.37342 -4.65039,1.05274 -2.77485,3.02815 -2.88076,3.02181 -2.44336,-0.13282 0.25142,-1.81332 1.18583,-3.10226 2.07618,-2.86523 0.89036,0.23703 2.39224,-1.37989 3.33789,-3.5918 3.13657,-7.33661 7.72889,-12.37825 9.00586,-9.88672 0.7192,1.40326 -0.64587,4.59592 -3.62305,8.46875 -2.62838,3.41906 -3.44049,5.03974 -1.80274,3.60157 1.35458,-1.18952 2.0635,-1.78178 2.20508,-1.73243 h 0.002 l 0.002,0.002 0.002,0.002 0.002,0.002 0.002,0.002 h 0.002 v 0.002 h 0.002 v 0.002 l 0.002,0.002 c 0.0681,0.12707 -0.38514,0.86221 -1.28516,2.24609 -1.12386,1.72802 -1.43465,3.14258 -0.68945,3.14258 1.52605,0 13.21216,-14.33645 18.12305,-22.23438 2.91068,-4.68109 4.62608,-10.58012 2.24023,-7.70312 -0.53882,0.64973 -1.87959,0.28141 -2.97852,-0.81836 -2.31488,-2.31669 -2.73725,0.4181 -0.48437,3.13476 1.02331,1.23395 -0.20456,4.10572 -3.79883,8.88672 -2.09799,2.7907 -3.33276,4.16691 -3.54687,4.00977 -0.10641,-0.0925 0.0689,-0.61195 0.55078,-1.57617 1.27325,-2.54742 1.81038,-5.30298 1.19336,-6.12305 -0.61703,-0.82007 -0.17057,-0.82618 0.99218,-0.0117 1.56024,1.0923 1.87159,0.72139 1.19141,-1.41601 -0.69034,-2.16935 -0.28547,-2.60962 1.60938,-1.75391 2.08635,0.94218 2.21399,0.67393 0.73046,-1.53125 -0.99842,-1.48411 -1.38463,-4.58655 -0.86718,-6.97266 0.42883,-1.97728 0.67808,-2.99534 0.93945,-3.10937 z m -19.32031,4.91797 c -0.82858,0.0458 -2.54101,1.22072 -4.08008,3.27148 -1.35739,1.80815 -1.96164,3.89593 -1.3457,4.63867 0.61593,0.74297 0.11306,1.08111 -1.11524,0.75196 -1.3535,-0.36269 -2.03711,0.46162 -1.73633,2.09375 0.27295,1.48116 -3.8e-4,2.09529 -0.60742,1.36328 -1.17889,-1.42158 -5.09961,1.71813 -5.09961,4.08398 0,0.77916 1.00062,1.24006 2.22461,1.02344 2.60797,-0.46157 11.47751,-10.29467 10.42774,-11.56055 -0.39379,-0.47485 0.0313,-1.94633 0.94336,-3.27148 1.11311,-1.61732 1.08533,-2.3727 0.46679,-2.39453 -0.0249,-8.8e-4 -0.0514,-10e-4 -0.0781,0 z m 305.29297,1.07617 c -0.72463,0.0324 -1.28146,0.15171 -1.61524,0.37695 -1.89391,1.27808 0.0437,2.67074 8.55664,6.15039 10.16663,4.15562 14.84332,4.14342 12.70313,-0.0312 -1.35222,-2.63834 -14.57212,-6.72304 -19.64453,-6.49609 z M 232.64062,275.375 c -5.34549,-0.21442 -21.60024,17.53034 -21.68554,23.67383 -0.0718,5.16551 3.4343,3.5514 7.35351,-3.38672 2.02101,-3.57777 6.20973,-8.52867 9.30664,-11 5.78621,-4.6174 7.34688,-6.99009 3.39649,-5.16211 -1.22831,0.56837 -2.23242,0.62931 -2.23242,0.13477 0,-0.49455 1.50716,-1.63041 3.34961,-2.52344 2.89615,-1.40375 2.96458,-1.63793 0.51171,-1.73633 z m 282.79688,2.39258 c 0.6134,-0.0484 2.35124,3.36607 5.07812,10.1543 2.49407,6.20861 4.36792,11.39176 4.16602,11.51757 -7.04128,4.38766 -7.92223,4.18811 -7.35547,-1.66601 0.30801,-3.18141 -0.15237,-8.89695 -1.02344,-12.70117 -1.10977,-4.84667 -1.37348,-7.26459 -0.86523,-7.30469 z m -248.76953,6.36328 h 0.002 0.002 0.002 0.002 c 0.004,-4e-4 0.008,0 0.0117,0 0.23717,-0.002 0.41552,0.34215 0.53906,1.02734 0.26476,1.46835 1.14012,2.66992 1.94727,2.66992 0.80716,10e-6 1.05492,0.80749 0.54883,1.79493 -2.24322,4.3768 -6.48611,1.96616 -4.69922,-2.66993 0.71127,-1.84539 1.25262,-2.78086 1.64062,-2.82031 h 0.002 z m 195.79297,6.16211 c -0.30187,0.002 -0.65145,0.039 -1.04883,0.10937 -2.44952,0.43352 -2.70683,1.29892 -2.03711,6.85157 0.16784,1.39152 1.09968,0.92066 2.45508,-1.24024 2.51827,-4.01486 2.74393,-5.73156 0.63086,-5.7207 z m -31.28906,21.78906 c 0.24054,0.005 0.51621,0.0854 0.83398,0.23242 1.2283,0.56838 2.2135,1.55257 2.1875,2.1875 -0.21738,5.29971 -4.41992,7.6303 -4.41992,2.45117 0,-3.49772 0.356,-4.89181 1.39844,-4.87109 z m 355.20117,1.7207 c -0.12027,0.0101 -0.23396,0.17329 -0.33789,0.51758 -0.37445,1.24045 -1.12572,1.92655 -1.66993,1.52539 -0.85284,-0.62868 -1.27055,15.02471 -0.51367,19.25977 0.61887,3.46278 4.03027,-0.38679 4.48438,-5.06055 0.52227,-5.37542 -0.94281,-16.32811 -1.96289,-16.24219 z m -345.25782,0.19922 c 0.51041,0.006 0.557,1.63018 0.54688,4.39649 -0.015,4.0958 -0.45616,5.4131 -1.2832,3.83984 -1.83468,-3.4901 -3.40163,2.22635 -2.29493,8.3711 0.66879,3.71332 0.50606,4.18728 -0.72265,2.10156 -0.87256,-1.48116 -1.59688,-1.77735 -1.60938,-0.65821 -0.0125,1.11913 -1.35307,2.45424 -2.97851,2.9668 -2.7316,0.86138 -2.65414,0.30045 1.01758,-7.41992 4.60237,-9.67721 6.52798,-13.60682 7.32421,-13.59766 z m 92.56446,6.2793 c 0.69914,-0.0181 0.18542,3.97628 -1.22852,7.16211 -1.78522,4.02241 -7.39062,4.70529 -7.39062,0.90039 0,-1.41462 1.50716,-3.13868 3.34961,-3.83203 1.84245,-0.69334 3.84175,-2.16246 4.44336,-3.26367 0.36622,-0.67035 0.63927,-0.96196 0.82617,-0.9668 z m -42.41211,2.16211 c -0.23908,0.008 -0.39111,0.29507 -0.4043,0.94922 -0.026,1.29255 -0.71626,1.8505 -1.53516,1.24023 -2.11261,-1.57445 -1.8551,5.12572 0.29688,7.72071 2.64805,3.19318 5.6582,2.61107 5.6582,-1.09375 0,-3.09346 -2.92417,-8.8551 -4.01562,-8.81641 z m 46.94726,1.38476 c 0.0417,-0.002 0.0826,-0.002 0.12305,0 1.75551,0.0702 1.50223,0.81061 -0.99609,2.91211 -1.84245,1.54981 -3.34961,3.93225 -3.34961,5.29297 0,1.56132 -1.50988,2.38281 -4.09375,2.22852 -3.17907,-0.18984 -3.39233,-0.41004 -0.95508,-0.98828 1.72643,-0.40959 4.01657,-2.72433 5.08984,-5.14258 1.03973,-2.34269 2.89,-4.23397 4.18164,-4.30274 z m -21.89843,0.70508 c 1.57384,0.0632 3.80841,5.46108 3.15234,8.48633 -0.81679,3.76641 -1.70522,4.00331 -4.83203,1.29102 -1.9005,-1.64855 -1.85424,-1.79193 0.30859,-0.95703 2.12999,0.82223 2.3274,0.2985 1.21289,-3.23633 -0.73142,-2.3198 -0.93594,-4.69159 -0.45508,-5.27149 0.16442,-0.19826 0.34545,-0.29706 0.53907,-0.31054 0.0246,-0.002 0.0492,-0.003 0.0742,-0.002 z m -92.94141,5.00977 c 1.14246,-0.0209 2.19235,0.42829 2.72461,1.4668 0.47362,0.9241 -0.28328,1.13642 -1.70508,0.47851 -1.91656,-0.88685 -2.24944,-0.5452 -1.33789,1.36719 2.35965,4.95045 5.63991,8.73717 6.8125,7.86328 0.65285,-0.48654 1.61765,-0.0436 2.14453,0.98437 0.52688,1.02801 0.40548,1.75469 -0.26953,1.61329 -3.09793,-0.64893 -4.94922,0.38045 -4.94922,2.7539 0,1.42288 -0.75428,3.14917 -1.67578,3.83594 -1.16163,0.86572 -1.48165,-0.73767 -1.04687,-5.22852 0.58248,-6.01646 -1.41476,-9.54089 -4.94141,-8.72265 -0.53017,0.12301 -0.65569,-1.19602 -0.2793,-2.93164 0.45632,-2.10419 2.61934,-3.44567 4.52344,-3.48047 z m 369.67773,12.14453 c -5.58831,0 -7.26395,1.41469 -4.96289,4.18945 2.05813,2.48181 10.91797,1.26775 10.91797,-1.49609 0,-1.94496 -1.65396,-2.69336 -5.95508,-2.69336 z m -6.90429,4.77539 c -1.61325,0.0852 -2.45558,16.37377 -1.24024,35.17188 0.95806,14.81875 2.95856,19.67383 5.8125,14.10546 0.8064,-1.5734 -1.51539,-36.68223 -2.95117,-44.62695 -0.5872,-3.2492 -1.13794,-4.67591 -1.62109,-4.65039 z M 431.54102,356.9043 c 1.48894,-0.0814 2.95774,4.37003 1.87109,6.49023 -1.30933,2.55466 -2.94278,1.95184 -6.01367,-2.21875 -2.83004,-3.84352 -2.82852,-3.84605 0.69336,-1.61523 1.94127,1.22964 3.10364,1.40248 2.58203,0.38476 -0.52161,-1.01773 -0.33822,-2.30505 0.4082,-2.86133 0.15167,-0.11303 0.30496,-0.17126 0.45899,-0.17968 z m 62.56054,4.5332 c -1.98268,0 -3.81416,6.49473 -2.53515,8.99023 1.35115,2.63627 4.07464,0.11391 3.11914,-2.88867 -1.14939,-3.61188 1.65299,-3.10014 3.45507,0.63086 0.83468,1.72801 1.51663,2.33314 1.51563,1.3457 -0.003,-2.67032 -3.72192,-8.07812 -5.55469,-8.07812 z m 13.63867,0.83008 c -0.0686,-0.002 -0.13797,-0.002 -0.20898,0.002 -2.46154,0.14193 -6.29297,4.11956 -6.29297,7.35742 0,2.83095 5.20676,1.34637 7.63086,-2.17578 1.32109,-1.91958 1.34125,-3.09369 0.082,-4.61133 -0.31348,-0.378 -0.73101,-0.55556 -1.21094,-0.57226 z m 9.28516,22.60156 c -0.41628,-0.0124 -0.87943,-0.004 -1.39258,0.0254 -2.4631,0.13869 -6.09666,0.74848 -11.41797,1.77344 -15.41175,2.96851 -20.84375,5.12603 -20.84375,8.27734 0,2.17182 0.97373,2.59218 4.09571,1.76953 7.6313,-2.01087 10.23644,-2.65612 10.375,-2.45117 0.001,0.002 0.003,0.007 0.004,0.01 0.0118,0.0771 -0.22147,0.24337 -0.61914,0.47461 -0.97759,0.56847 -1.39156,2.24445 -0.91992,3.72656 1.4585,4.58322 15.35352,1.02692 15.35352,-3.92969 0,-1.67762 1.5704,-2.58789 4.46679,-2.58789 3.47398,0 4.4668,-0.79708 4.4668,-3.58984 0,-2.30004 -0.65442,-3.41116 -3.56836,-3.49805 z m 20.63672,24.65234 c 0.42907,0.007 0.77037,0.29138 1.04883,0.82032 1.65894,3.15121 1.54675,19.76151 -0.125,18.51562 -0.74893,-0.55815 -1.76154,-2.1e-4 -2.25,1.24024 -0.48845,1.24045 -0.62917,0.53992 -0.31446,-1.55664 1.58426,-10.55433 -9.37029,2.62635 -11.7539,14.14257 -1.00179,4.8401 -15.67862,12.59669 -18.16406,9.59961 -0.47808,-0.57651 -1.89624,-0.0441 -3.15235,1.18164 -1.82589,1.78175 -2.05869,1.77352 -1.15625,-0.0371 0.62083,-1.24577 4.7162,-5.03084 9.09961,-8.41211 5.31891,-4.10289 10.0609,-9.91894 14.25781,-17.48437 7.14652,-12.88243 10.65048,-18.04119 12.50977,-18.00977 z m -99.13672,2.38477 c 1.61913,0.003 3.18415,0.10767 4.30273,0.3125 2.23724,0.40966 0.048,0.73666 -4.86523,0.72656 -4.9132,-0.0101 -6.74435,-0.34456 -4.06836,-0.74414 1.33799,-0.19979 3.01174,-0.29824 4.63086,-0.29492 z m 134.70899,0.19336 c 22.54565,0.39205 22.54478,0.39208 2.44531,0.91797 -21.79791,0.57033 -25.96304,1.34426 -22.29102,4.14453 1.88953,1.44096 1.86842,1.67552 -0.16406,1.69922 -3.14873,0.0367 -4.31151,-1.57718 -3.33789,-4.63672 0.64631,-2.03104 5.15886,-2.44129 23.34766,-2.125 z m -165.42188,0.082 c 3.88962,-0.36984 10.25491,-0.36984 14.14453,0 1.06357,0.10113 1.59765,0.1989 1.6543,0.28516 l 0.002,0.002 v 0.002 0.002 l 0.002,0.002 v 0.002 0.002 0.002 l 0.002,0.002 v 0.002 0.002 0.002 l -0.002,0.002 v 0.002 c -0.13219,0.21347 -3.32146,0.36328 -8.73046,0.36328 -5.40901,0 -8.59633,-0.14786 -8.72852,-0.36133 v -0.002 -0.002 l -0.002,-0.002 v -0.002 -0.002 -0.002 -0.002 -0.002 -0.002 -0.002 -0.002 l 0.002,-0.002 v -0.002 c 0.0566,-0.0863 0.59268,-0.18598 1.65625,-0.28711 z m 55.29102,3.11719 c 1.36784,0.008 7.29215,4.90742 13.8496,11.91992 5.57788,5.96494 11.6236,11.79499 13.43555,12.95508 2.19032,1.40234 2.97784,3.10032 2.35156,5.06836 -0.63164,1.98488 -0.36719,2.53256 0.80079,1.66211 0.95802,-0.71398 1.74218,-0.4422 1.74218,0.60351 0,1.04572 -1.34078,1.90039 -2.97851,1.90039 -1.63774,0 -2.97654,-0.80748 -2.97657,-1.79492 0,-0.98744 -0.81662,-1.79492 -1.81445,-1.79492 -3.24733,0 -17.365,-18.21178 -16.41992,-21.18164 0.5724,-1.79869 0.27146,-2.29926 -0.86914,-1.44922 -1.05579,0.78684 -1.74219,0.15528 -1.74219,-1.60547 0,-1.59771 -0.59227,-2.46299 -1.31836,-1.92187 -0.72608,0.54113 -2.10515,-0.15393 -3.0625,-1.54493 -1.34226,-1.95026 -1.57558,-2.81958 -0.99804,-2.8164 z m -31.23633,0.34179 c 20.98236,0.34364 20.98374,0.34461 -8.04883,1.57422 -15.96791,0.67629 -33.12917,1.83545 -38.13477,2.57618 -5.56572,0.82362 -9.44959,0.66775 -9.99804,-0.40235 -1.14899,-2.24182 28.27046,-4.20518 56.18164,-3.74805 z m 26.94336,2.09376 c 1.04117,-0.0401 4.64104,4.10385 12.5625,14.16796 7.57712,9.62663 14.38163,17.05306 15.12109,16.50196 0.73946,-0.55109 1.34375,0.6602 1.34375,2.69336 0,4.27624 -1.43609,4.39133 -9.86523,0.78711 -5.30716,-2.26929 -6.25957,-3.49212 -7,-8.99415 -0.98238,-7.29984 -3.35556,-11.43554 -6.56641,-11.43554 -1.49122,0 -1.96899,1.18407 -1.44727,3.58984 0.42807,1.9739 0.26024,3.97532 -0.37304,4.44727 -0.63327,0.47196 -1.56206,-2.75964 -2.06446,-7.17969 -0.50241,-4.42005 -1.36683,-10.25848 -1.91992,-12.97461 -0.20914,-1.02708 -0.16761,-1.58904 0.20899,-1.60351 z m -91.32032,1.15429 c 3.41195,0 5.82466,0.45692 5.36133,1.01563 -1.46486,1.76643 -11.56445,2.28993 -11.56445,0.59961 0,-0.88917 2.79117,-1.61524 6.20312,-1.61524 z m 187.98047,4.46094 c -0.45627,0.0138 -0.63476,0.25086 -0.63476,0.66211 0,1.67137 29.38913,19.375 34.96484,21.0625 2.06046,0.6236 3.74605,1.90446 3.7461,2.84766 0,2.3081 35.57563,1.44838 36.77343,-0.88868 0.60532,-1.18105 -4.97244,-1.4141 -16.30664,-0.68164 -14.09598,0.91093 -17.55461,0.63688 -19.02929,-1.50586 -0.99128,-1.44028 -2.56413,-2.61914 -3.4961,-2.61914 -0.93197,0 -8.05364,-3.72742 -15.82422,-8.28515 -13.37728,-7.84625 -18.56383,-10.64111 -20.19336,-10.5918 z m 123.90821,3.46289 c 2.61098,0.0339 10.94336,2.78211 10.94336,3.83008 0,1.34408 -4.97091,0.70129 -8.77735,-1.13477 -1.96134,-0.94606 -3.26417,-2.08551 -2.89453,-2.53125 0.0985,-0.11878 0.35552,-0.16891 0.72852,-0.16406 z m -374.79493,1.60547 c 0.96698,0.028 1.61524,0.35009 1.61524,0.89844 0,0.83558 -4.33322,2.48156 -9.62891,3.6582 -5.29569,1.17664 -10.76471,2.66559 -12.15429,3.30859 -1.59934,0.74008 -2.16592,0.46349 -1.54297,-0.75195 0.85191,-1.66218 6.05657,-3.46139 19.97656,-6.90625 0.46061,-0.11399 0.90036,-0.17922 1.30078,-0.20117 0.15016,-0.008 0.29545,-0.01 0.43359,-0.006 z m 131.73243,3.67187 c -1.59536,0.0419 -6.24336,2.37711 -18.26563,9.02735 -1.94399,1.07534 -4.28889,1.98985 -5.21094,2.03125 -0.92205,0.0414 -4.83489,1.94456 -8.69336,4.23047 -7.01541,4.15619 -7.0152,4.15706 -20.63671,0.30078 -7.49183,-2.12096 -13.99419,-3.40808 -14.44922,-2.85938 -1.24172,1.49734 -0.61628,1.77864 13.07031,5.89258 15.52252,4.66579 16.43443,4.72995 20.31641,1.45117 1.71237,-1.4463 3.44148,-2.23467 3.84179,-1.75195 0.40031,0.48272 1.57551,-0.35239 2.61133,-1.85742 1.03583,-1.50502 3.34187,-2.73633 5.125,-2.73633 1.78313,0 3.87833,-0.66863 4.65625,-1.48438 0.77792,-0.81574 4.09368,-2.49544 7.36914,-3.73242 6.56456,-2.4791 12.15572,-6.75637 10.86524,-8.3125 -0.1134,-0.13673 -0.30418,-0.20697 -0.59961,-0.19922 z m 27.88281,1.30469 c 0.14489,-0.01 0.4864,0.19298 1.02539,0.58399 1.0741,0.77918 2.60131,3.46889 3.39258,5.97851 1.48986,4.72531 0.91958,7.57386 -0.83203,4.15625 -0.54801,-1.06924 -1.62053,-1.48021 -2.38282,-0.91211 -0.76228,0.5681 -1.38476,-0.22619 -1.38476,-1.76562 0,-1.53944 0.75079,-2.79883 1.66992,-2.79883 1.08898,0 0.96043,-1.05768 -0.37109,-3.03711 -1.00534,-1.4945 -1.37548,-2.18718 -1.11719,-2.20508 z m 73.05273,0.0215 c 0.22825,0.004 0.42555,0.0879 0.57617,0.26953 1.87446,2.26031 -6.10746,10.02606 -8.94726,8.70507 -2.06472,-0.96041 -2.35992,-1.72505 -1.04492,-2.70507 1.00844,-0.75155 2.84064,-0.89998 4.07226,-0.33008 1.23161,0.56991 1.87655,0.32908 1.4336,-0.53516 -0.80054,-1.56195 2.31246,-5.43415 3.91015,-5.40429 z m -98.19336,7.10937 c -2.53557,-0.0416 -6.87191,1.51633 -12.55859,4.87891 -9.38463,5.5492 -19.60334,15.85208 -18.28125,18.43164 1.5162,2.95829 9.08251,0.72642 14.28125,-4.21289 2.77163,-2.63332 4.29206,-4.7976 3.37891,-4.8086 -0.91316,-0.011 -3.25805,1.47441 -5.21094,3.30078 -4.15189,3.88291 -9.65757,4.6345 -7.13867,0.97461 0.86573,-1.25792 2.63864,-1.79423 3.9414,-1.1914 1.45389,0.67277 1.99327,0.36362 1.39649,-0.80078 -0.53475,-1.04336 0.15477,-2.99757 1.53125,-4.34375 2.12634,-2.07953 2.31297,-2.06791 1.24218,0.0742 -0.86187,1.7245 -0.70972,2.11112 0.48243,1.22266 0.95879,-0.71452 1.35784,-2.05149 0.88672,-2.9707 -0.47111,-0.91921 0.89719,-1.67188 3.04101,-1.67188 2.18934,0 3.4992,0.77854 2.98828,1.77539 -0.52858,1.03134 0.0939,1.31034 1.48633,0.66602 1.31789,-0.60983 2.06495,-2.14986 1.66016,-3.42188 -0.40479,-1.27201 0.28182,-2.78393 1.52539,-3.35937 4.25945,-1.97098 4.99399,-1.04422 2.01758,2.54492 -4.81376,5.80471 -3.40761,8.34952 1.48828,2.69336 5.40471,-6.244 5.54763,-9.72047 1.84179,-9.78125 z m 70.63086,0.30469 c 1.18523,0.0247 1.97071,0.23734 1.97071,0.70703 0,0.18424 -2.51324,2.04934 -5.58399,4.14453 -2.92245,1.994 -4.3154,2.94498 -4.44531,2.83398 l -0.002,-0.002 -0.002,-0.002 -0.002,-0.002 v -0.002 -0.002 c -0.0482,-0.15335 0.87417,-1.13182 2.58984,-2.94336 3.56694,-3.76628 3.17132,-3.80271 -3.92382,-0.35547 -1.69033,0.82128 -2.22141,0.40782 -1.73243,-1.34765 0.41288,-1.48224 7.57519,-3.10356 11.13086,-3.0293 z m 59.11328,2.3164 v 0.002 h -0.002 c -0.16091,0.0195 -0.17118,0.18915 -0.002,0.52148 0.60562,1.18164 0.39259,2.14844 -0.47461,2.14844 -2.58328,0 -1.78674,6.8535 1.0293,8.85742 7.38777,5.2572 10.25536,-2.92919 3.16015,-9.02148 -1.84365,-1.58305 -3.21419,-2.49756 -3.67187,-2.50782 -0.007,-1.6e-4 -0.0147,-3.2e-4 -0.0215,0 -10e-4,9e-5 -0.006,6e-5 -0.008,0 h -0.002 -0.002 -0.002 -0.002 z m 70.1543,2.89258 c -7.44425,0.21802 -7.44468,0.21777 1.13477,1.73242 11.00719,1.94325 27.64684,12.03202 38.4414,23.3086 4.65939,4.86745 9.90158,8.84961 11.65039,8.84961 1.94683,0 3.83663,1.74017 4.875,4.48828 1.79547,4.75186 29.50782,7.2923 29.50782,2.70508 0,-1.09654 -4.88591,-1.5086 -12.69141,-1.07032 -12.69099,0.7126 -12.692,0.71346 -14.92773,-4.5 -1.4589,-3.40196 -3.39461,-5.21289 -5.57227,-5.21289 -1.83549,0 -6.67559,-3.4735 -10.75586,-7.71875 -13.87969,-14.44086 -29.5541,-22.93665 -41.66211,-22.58203 z m -275.26172,7.88867 c -2.42868,0.0881 -5.16254,0.35799 -7.61914,0.78907 -8.9331,1.56755 -8.93423,1.56758 1.86328,1.27148 8.06573,-0.22119 10.79789,0.30158 10.79493,2.06836 -0.002,1.42869 1.02768,1.97925 2.60156,1.38867 1.43302,-0.53772 3.60958,-0.13603 4.83789,0.89258 1.63876,1.37234 0.64938,1.58833 -3.72071,0.8125 -12.43079,-2.20687 -25.26629,-3.1258 -24.15429,-1.72851 0.63646,0.79973 3.98743,1.37007 7.44531,1.26562 3.45789,-0.10445 5.17189,0.18747 3.80859,0.65039 -5.70998,1.93886 -4.28179,6.02113 2.15235,6.15039 4.87418,0.0979 5.61353,0.47252 3.30273,1.66992 -2.85809,1.48099 -2.84459,1.54685 0.32227,1.66797 3.5945,0.13747 13.23491,4.97687 16.80078,8.4336 1.2283,1.1907 4.24261,2.51497 6.69922,2.94335 11.09261,1.93435 12.29683,1.47334 15.34765,-5.86523 1.02627,-2.4686 1.53211,-3.07372 1.12305,-1.3457 -0.40906,1.72802 -0.0959,3.14258 0.69727,3.14258 2.8458,0 1.28219,-6.3742 -2.69336,-10.97852 -5.60801,-6.49499 -10.33297,-9.17408 -13.82422,-7.83789 -2.01553,0.7714 -2.82785,0.37478 -2.54883,-1.24609 0.28844,-1.67555 -1.5732,-2.43646 -6.29102,-2.57032 -3.6849,-0.10456 -8.70941,-0.67675 -11.16601,-1.27148 -1.2283,-0.29737 -3.35061,-0.39086 -5.7793,-0.30274 z m -14.25781,10.22461 c -1.85154,-0.0527 -4.21389,0.0654 -7.04688,0.375 -12.4067,1.35571 -14.40553,2.11249 -12.97265,4.90821 1.07738,2.1021 17.92185,1.56965 21.81836,-0.68946 4.7148,-2.73354 3.75577,-4.43551 -1.79883,-4.59375 z m 29.3418,1.54102 c 1.84245,-0.0694 3.35156,0.79045 3.35156,1.91211 0,1.38419 2.15182,1.68324 6.69922,0.93164 3.71112,-0.61338 6.69922,-0.37698 6.69922,0.5293 0,0.89987 1.50716,1.98613 3.34961,2.41406 1.84245,0.42792 -1.3402,1.031 -7.07227,1.33984 -10.42195,0.56153 -10.42195,0.56228 0,1.63672 10.42194,1.07444 10.42241,1.07307 0.38867,1.92578 -7.76512,0.6599 -10.7937,0.18955 -13.39843,-2.08593 -1.85125,-1.61717 -4.70601,-3.342 -6.34376,-3.83204 -1.71156,-0.51214 -0.44659,-1.03237 2.97657,-1.22461 4.76694,-0.26771 5.36198,-0.64385 2.97851,-1.8789 -2.84126,-1.47227 -2.82531,-1.54757 0.3711,-1.66797 z m 105.70898,3.39453 c -0.63431,-0.0174 -1.21504,0.16177 -1.6914,0.58399 -2.72402,2.41354 -2.70348,2.63268 0.68359,7.33007 3.48596,4.83455 7.33006,5.64903 8.39844,1.7793 1.05099,-3.80672 -3.96534,-9.59957 -7.39063,-9.69336 z m 102.5586,4.05273 c -1.85582,0.0583 -5.91603,1.83422 -14.64258,5.62891 -7.61515,3.3114 -16.52532,6.60558 -19.80078,7.32031 -6.49148,1.4165 -17.66471,5.32896 -26.38282,9.23828 -3.04643,1.36611 -6.55896,2.01198 -7.80468,1.43555 -2.76443,-1.27919 -4.54869,3.47162 -2.94922,7.85156 1.04984,2.87485 1.4418,4.21898 1.96289,6.73243 1.34985,6.51089 70.76826,-27.24453 71.07422,-34.56055 0.10091,-2.41316 0.18043,-3.69792 -1.45703,-3.64649 z m -264.47461,1.88086 c -0.79173,-0.0124 -1.01237,0.79403 -0.74024,2.5254 0.28363,1.80443 0.56816,3.90271 0.63086,4.6621 0.14643,1.77488 7.83631,-0.38356 9.79102,-2.74804 0.99527,-1.2039 -0.23924,-1.42507 -3.72266,-0.66797 -3.6728,0.79826 -4.55062,0.61144 -2.97656,-0.63281 1.22831,-0.97094 1.78545,-1.77787 1.23828,-1.79297 -0.54718,-0.0151 -2.00421,-0.49432 -3.23633,-1.06446 -0.39406,-0.18234 -0.72047,-0.2771 -0.98437,-0.28125 z m 320.26562,0.19727 c -1.81127,-0.0205 -2.78497,0.35434 -2.33594,1.23047 0.47482,0.92644 2.66754,1.74817 4.8711,1.82617 2.20356,0.0779 3.21068,0.53229 2.23828,1.00977 -1.24548,0.61156 -1.02575,1.8127 0.74414,4.0625 3.04284,3.86785 5.68732,2.8147 2.95703,-1.17774 -1.72568,-2.52343 -1.55475,-2.58332 1.5957,-0.55859 2.21,1.42033 3.1512,1.52925 2.51758,0.29297 -1.43189,-2.79379 -0.32008,-2.49853 7.22852,1.92382 5.42403,3.17769 6.40464,4.46254 5.30273,6.94532 -0.74362,1.67549 -0.87245,3.70391 -0.28711,4.50586 0.58533,0.80195 -1.48791,-0.30375 -4.60547,-2.45703 -5.79223,-4.00066 -10.29023,-5.33414 -7.65625,-2.26954 2.87416,3.34405 15.14346,10.30743 17.44336,9.90039 1.30706,-0.23133 2.7241,0.67043 3.14844,2.00391 0.53032,1.66649 -0.021,2.07787 -1.75977,1.31445 -2.19142,-0.96216 -2.1504,-0.59109 0.30665,2.78321 3.17538,4.36088 6.16479,5.02464 7.44921,1.65234 0.14461,-0.37969 0.24731,-0.56665 0.30469,-0.57812 h 0.002 0.002 0.002 0.002 0.002 l 0.002,0.002 h 0.002 l 0.002,0.002 0.002,0.002 0.002,0.002 c 0.0893,0.097 -0.008,0.94122 -0.30078,2.36523 -0.96619,4.69662 -1.06397,4.66103 5.29883,1.98633 4.88581,-2.05382 4.88684,-2.05515 1.33984,-4.47656 -3.12363,-2.1324 -1.68103,-2.36809 12.08594,-1.98438 15.22222,0.42426 15.64438,0.32826 16.10938,-3.62109 0.57982,-4.92457 -30.56216,-4.39576 -32.89844,0.55859 -1.59434,3.38099 -5.54297,1.19647 -5.54297,-3.0664 0,-5.42061 -8.95153,-15.23149 -17.68555,-19.38282 -5.86421,-2.78728 -13.90387,-4.75174 -17.88867,-4.79687 z m -459.73047,0.0742 c -0.3192,0.0533 -0.60953,1.78215 -1.19531,5.26367 -1.38106,8.20826 5.93198,37.68007 12.03906,48.51758 6.81224,12.0889 9.1655,5.84316 2.83203,-7.51563 -3.34584,-7.05715 -8.87392,-25.70255 -12.34179,-41.6289 -0.67343,-3.09276 -1.0139,-4.66306 -1.32618,-4.63672 h -0.002 -0.002 -0.002 z m 451.46485,0.0859 c -1.2263,-0.0733 -2.81306,-0.0451 -4.91407,0.01 -9.75205,0.23425 -13.34442,5.18475 -5.3164,7.32617 8.67343,2.31358 19.15953,6.22189 21.31445,7.94336 4.10391,3.27844 6.26227,2.08739 3.25977,-1.79882 -1.54603,-2.00109 -3.77545,-3.19234 -4.95508,-2.64649 -1.44181,0.66717 -2.73543,-0.97836 -3.94727,-5.01953 -1.32861,-4.43057 -1.76252,-5.59444 -5.4414,-5.81445 z m -51.16797,3.40234 c 0.0149,-3.4e-4 0.0267,0.002 0.0351,0.006 h 0.002 c 4.2e-4,2.8e-4 0.003,0.003 0.004,0.004 h 0.002 l 0.002,0.002 0.002,0.002 0.002,0.002 v 0.002 0.002 l 0.002,0.002 v 0.002 c 6e-5,0.003 4e-5,0.006 0,0.008 -0.0266,0.2371 -2.16292,1.72255 -5.44727,3.75391 -8.26173,5.1098 -8.2832,5.1164 -8.2832,3.0332 0,-1.30317 3.19958,-2.91295 13.40039,-6.74219 0.13435,-0.0504 0.22708,-0.075 0.2793,-0.0762 z m -17.75977,8.32227 c 1.0065,-0.0232 1.26952,0.32424 0.32617,1.15625 -1.61972,1.42857 -4.61565,3.10284 -6.65625,3.7207 -2.04061,0.61785 -7.56116,2.94385 -12.26757,5.16797 -4.77843,2.25816 -8.93077,3.31258 -9.4043,2.38867 -1.28293,-2.50317 0.76462,-5.45314 3.55469,-5.12305 1.36047,0.16092 2.80736,0.13587 3.21679,-0.0527 0.40944,-0.18926 1.96984,-0.62274 3.4668,-0.96485 1.49696,-0.34211 3.84187,-1.22604 5.21094,-1.96289 4.52052,-2.43298 10.33844,-4.27903 12.55273,-4.33007 z m -196.0293,0.0312 c -1.33612,-0.0389 -2.37304,0.47417 -2.37304,1.64062 0,0.91504 1.17246,2.03281 2.60547,2.48438 5.63598,1.77604 6.81721,1.42083 4.83789,-1.45508 -1.14074,-1.65745 -3.35245,-2.61986 -5.07032,-2.66992 z m 443.53711,5.36328 c -2.90885,0 -2.85963,1.098 1.03516,23.21093 4.21501,23.93099 7.35864,17.34921 3.48242,-7.29101 -1.25641,-7.98672 -2.28515,-14.83606 -2.28515,-15.2207 0,-0.38463 -1.00413,-0.69922 -2.23243,-0.69922 z m -519.82422,0.14648 c -1.21649,-0.005 -2.01757,0.57079 -2.01757,1.94727 0,1.15201 0.4397,1.56378 0.97851,0.91406 1.07309,-1.294 4.97658,1.98868 4.97656,4.18555 0,1.77999 -15.22625,4.19084 -23.82226,3.77148 -4.33916,-0.2117 -6.00291,0.23693 -4.72461,1.27539 1.08556,0.88189 6.9726,1.44487 13.08398,1.25 6.11139,-0.19487 11.46082,0.32527 11.88672,1.15625 2.65477,5.17977 12.33014,1.19024 11.39649,-4.69922 -0.71967,-4.53969 -8.10807,-9.78494 -11.75782,-9.80078 z m 90.4043,0.0996 c -0.59837,0.0298 -1.13664,0.26899 -1.54687,0.76367 -1.0288,1.24059 -0.78968,3.08008 0.74414,5.72071 2.47826,4.26659 7.08492,3.59148 6.3457,-0.92969 -0.48641,-2.97493 -3.17732,-5.45511 -5.2832,-5.55469 -0.0877,-0.004 -0.17429,-0.004 -0.25977,0 z m 68.48438,1.82813 c -0.93693,-0.0553 -1.88848,0.0265 -2.62891,0.25781 -2.02938,0.63408 -1.77618,0.95004 1.0293,1.28515 3.14487,0.37565 2.91454,0.65005 -1.48828,1.76758 -5.15204,1.30771 -5.16018,1.32476 -0.74414,1.53125 5.77331,0.26995 10.0272,-2.5875 6.37109,-4.27929 -0.68112,-0.31518 -1.60214,-0.50725 -2.53906,-0.5625 z m -163.56641,2.15039 c -1.58699,-0.0132 -3.54014,0.28645 -5.91211,0.89648 -3.82929,0.98479 -7.48236,1.40281 -8.11719,0.92969 -0.63484,-0.47312 -2.33197,0.0452 -3.77148,1.15039 -2.05391,1.57688 -1.04879,1.79031 4.66406,0.99414 4.00391,-0.55801 10.03254,-1.04031 13.39844,-1.07031 4.96877,-0.0443 5.61946,-0.40503 3.45508,-1.92383 -0.90819,-0.63729 -2.12981,-0.96338 -3.7168,-0.97656 z m 195.8457,1.16015 c -0.81887,0 -0.56916,1.36326 0.55469,3.0293 1.78939,2.65266 1.71915,2.88268 -0.5625,1.85156 -2.57275,-1.16267 -3.54015,0.57686 -1.61328,2.90039 1.49957,1.80828 4.66535,1.43475 5.74805,-0.67773 1.0765,-2.10039 -1.83003,-7.10352 -4.12696,-7.10352 z m 45.22071,0.81641 c 1.96861,-0.0609 4.27539,1.11596 4.27539,2.77539 0,1.8817 -4.40662,3.84528 -5.98633,2.66797 -0.68839,-0.51303 -1.67315,-0.11097 -2.1875,0.89258 -1.27161,2.48107 -2.64937,2.29712 -6.05664,-0.81055 -2.74618,-2.50469 -2.66454,-2.63906 1.65039,-2.69336 2.49754,-0.0314 5.2324,-0.8923 6.07812,-1.91211 0.50589,-0.61002 1.33174,-0.89224 2.22657,-0.91992 z m 264.29492,2.85742 c -1.22958,-0.0185 -2.65424,1.34389 -3.13477,3.95703 -1.92436,10.4649 -6.74534,43.06054 -6.65234,44.97461 0.0576,1.18417 0.67905,0.53738 1.38281,-1.4375 1.22271,-3.43116 1.28477,-3.43859 1.38477,-0.15039 0.24461,8.0437 9.03711,-34.7445 9.03711,-43.97851 0,-2.25698 -0.93266,-3.34893 -2.01758,-3.36524 z m -91.7793,0.11524 c 2.29376,0 4.58804,0.0942 6.32813,0.2832 0.98134,0.10658 1.45972,0.21046 1.48437,0.30078 v 0.002 0.002 0.002 c -4e-5,7.5e-4 1.1e-4,0.005 0,0.006 v 0.002 l -0.002,0.002 c -0.11828,0.21818 -2.97092,0.3711 -7.81055,0.3711 -4.83963,0 -7.69032,-0.15097 -7.80859,-0.36914 l -0.002,-0.002 v -0.002 -0.002 c -1.1e-4,-7.5e-4 3e-5,-0.005 0,-0.006 v -0.002 -0.002 -0.002 c 0.0244,-0.0905 0.50106,-0.1942 1.48242,-0.30078 1.74009,-0.18899 4.03436,-0.28326 6.32812,-0.2832 z m -227.82422,1.01367 c -0.80284,0.0129 -1.85292,0.65051 -2.65234,1.69336 -1.61522,2.10704 -1.36585,2.80368 1.49023,4.18554 5.13437,2.48416 6.90004,2.09019 2.82813,-0.63086 -2.4257,-1.62096 -2.92832,-2.64826 -1.5625,-3.19726 1.10722,-0.44505 1.37603,-1.2768 0.59766,-1.84766 -0.19464,-0.14271 -0.43356,-0.20744 -0.70118,-0.20312 z m -94.4375,9.67383 c -2.97625,0.11095 -2.97157,0.15287 0.14649,1.66992 3.522,1.71358 6.03217,5.39843 3.67773,5.39843 -0.81887,0 -1.90406,-0.80748 -2.41015,-1.79492 -0.50609,-0.98744 -1.57609,-1.79687 -2.37891,-1.79687 -0.80283,0 -0.59493,1.18141 0.46094,2.625 2.39582,3.27561 7.1289,3.55976 7.1289,0.42773 0,-3.51215 -3.19092,-6.65737 -6.625,-6.52929 z m 262.00977,1.26953 c -20.01352,0.18329 -28.31666,6.03154 -25.65235,18.06836 1.52166,6.87442 8.48438,11.67657 8.48438,5.85156 0,-3.98832 15.11138,-4.28892 18.36523,-0.36524 1.72729,2.08287 4.49968,3.67744 6.16016,3.54297 1.34044,-0.10855 2.03312,-0.18299 2.05859,-0.30859 1.2e-4,-10e-4 -3e-5,-0.005 0,-0.006 -5e-5,-10e-4 1.5e-4,-0.005 0,-0.006 -0.0298,-0.13533 -0.78377,-0.33403 -2.28125,-0.68555 -7.38123,-1.73263 -7.21141,-5.92968 0.24024,-5.92968 5.74338,0 6.87934,0.51123 6.1582,2.77734 -1.50781,4.73818 4.91674,-1.60223 8.17969,-8.07227 5.98674,-11.87096 1.30413,-15.07798 -21.71289,-14.86718 z m 2.1875,2.33789 c 8.90604,-0.16782 20.8086,2.07535 19.94531,3.75976 -0.74536,1.45428 -7.65158,0.74561 -14.36328,-1.47461 -1.43302,-0.47404 -2.60547,-0.0597 -2.60547,0.92188 0,0.98158 1.17245,2.15584 2.60547,2.60742 3.88173,1.22323 -11.24756,0.87275 -18.98242,-0.43945 -6.69983,-1.13661 -6.69994,-1.13718 -0.67774,-2.51953 3.62517,-0.83212 7.70712,-0.60797 10.25586,0.56054 2.32871,1.06763 4.57353,1.53138 4.98828,1.03125 0.41475,-0.50014 -0.84921,-1.68284 -2.81054,-2.6289 -3.30991,-1.59655 -3.19212,-1.72726 1.64453,-1.81836 z m -300.11328,0.11718 c -1.24086,0.0695 -2.12305,0.61525 -2.12305,1.42383 0,1.05612 -1.67549,1.91992 -3.72266,1.91992 -2.04717,0 -3.72265,0.78185 -3.72265,1.73829 0,0.95645 -0.93656,1.30544 -2.08203,0.77539 -2.83847,-1.31345 -4.76395,2.89245 -2.20313,4.8125 1.38348,1.0373 0.65009,1.40927 -2.25195,1.14453 -2.36717,-0.21594 -4.58069,0.54872 -4.91992,1.69922 -0.79482,2.6957 4.47326,4.70318 12.94726,4.93359 3.6849,0.1002 6.76455,0.98453 6.84375,1.96484 0.0792,0.9803 -1.1678,1.51471 -2.76953,1.1875 -1.7939,-0.36647 -2.52894,0.14981 -1.91601,1.34571 1.57935,3.08149 5.88518,2.26244 8.66211,-1.64844 2.13211,-3.00274 2.18548,-3.58984 0.33007,-3.58984 -1.22029,0 -2.21875,-0.78379 -2.21875,-1.74024 0,-0.95645 -1.17245,-1.29147 -2.60547,-0.74609 -1.88559,0.71762 -1.63353,-0.0427 0.91016,-2.75 3.5757,-3.80572 8.58257,-5.21604 6.90625,-1.94531 -0.50609,0.98743 -0.209,1.79492 0.6582,1.79492 2.16688,0 1.98443,-3.09679 -0.28515,-4.84766 -1.02358,-0.78964 -1.86133,-2.64775 -1.86133,-4.12891 0,-1.48116 -1.50716,-2.95204 -3.34961,-3.26757 -0.23031,-0.0394 -0.45628,-0.0646 -0.67383,-0.0762 -0.19035,-0.0101 -0.37547,-0.01 -0.55273,0 z m 22.87695,3.76368 c -0.78072,0.0451 -1.17969,0.74294 -1.17969,2.08007 0,1.5868 0.71093,2.88477 1.57813,2.88477 0.86719,0 1.09795,0.93421 0.51367,2.07422 -0.64582,1.26007 -0.41038,1.5862 0.60156,0.83203 0.91552,-0.6823 2.86133,0.29121 4.32422,2.16406 2.29924,2.94359 2.89954,3.05091 4.41992,0.78907 2.37522,-3.53356 1.00515,-7.10308 -3.21679,-8.38086 -1.91185,-0.57862 -4.54329,-1.54682 -5.84766,-2.1504 -0.39081,-0.18083 -0.73564,-0.27808 -1.03125,-0.29296 -0.0554,-0.003 -0.11006,-0.003 -0.16211,0 z m 192.74805,1.73242 c -0.96783,0.0202 -2.15801,0.22285 -3.58789,0.60156 -3.40806,0.90263 -4.08664,1.6408 -2.57032,2.79883 1.1326,0.86498 1.38919,1.64206 0.57032,1.72656 -0.81886,0.0845 -0.14945,0.84863 1.48828,1.69727 4.72157,2.4466 6.29728,2.05087 7.13086,-1.79297 0.75852,-3.49772 -0.12776,-5.09193 -3.03125,-5.03125 z m 61.57226,0.54492 c 1.2835,-0.006 3.00672,0.33012 5.18164,1.00195 2.44122,0.7541 3.70958,1.14853 3.74805,1.29883 3e-4,0.002 3.3e-4,0.006 0,0.008 -6.6e-4,0.002 -0.003,0.008 -0.004,0.01 -0.10305,0.12637 -1.50007,0.009 -4.24804,-0.22656 -3.07075,-0.26304 -5.58399,0.10375 -5.58399,0.81445 0,1.73913 8.50319,3.90539 10.24219,2.60937 2.98225,-2.22253 31.44531,-3.38928 31.44531,-1.28906 0,1.32534 -3.56143,2.09819 -10.04882,2.17969 -7.28107,0.0914 -9.22963,0.57413 -7.07227,1.75586 1.99044,1.0903 -1.56244,1.49528 -10.7168,1.2207 -12.42616,-0.37271 -13.83181,-0.77048 -15.17187,-4.29883 -1.29208,-3.40198 -0.59517,-5.07123 2.22851,-5.08398 z m -277.13672,0.1875 c 0.91039,-0.0417 0.80041,0.95317 -1.13671,3.28906 -1.06177,1.28035 -3.5429,2.9469 -5.51368,3.70117 -3.10285,1.18753 -3.28491,1.0371 -1.36132,-1.11132 3.17149,-3.54219 6.68114,-5.81794 8.01171,-5.87891 z m 20.64649,6.08984 c -1.1269,-0.0565 -3.5479,1.22246 -5.87695,3.43164 -2.46814,2.3411 -3.01395,3.71914 -1.72266,4.34571 3.12807,1.5178 5.01031,1.25592 2.84766,-0.39649 -3.24783,-2.48158 0.73886,-4.26141 4.33984,-1.9375 1.71864,1.10914 4.11972,1.55497 5.33594,0.99219 3.14203,-1.45392 0.77633,-5.13332 -2.61328,-4.06445 -1.54644,0.48766 -2.43741,0.15316 -1.97852,-0.74219 0.55396,-1.08084 0.34411,-1.595 -0.33203,-1.62891 z m 41.35937,3.5918 c -0.72576,5.1e-4 -3.23699,1.20895 -5.58203,2.68359 -2.34548,1.47507 -3.38406,2.68541 -2.30664,2.69141 1.07741,0.006 3.33681,-0.87693 5.01953,-1.96289 2.46486,-1.59071 2.81477,-1.5031 1.80078,0.44922 -3.04801,5.86857 -2.26325,10.23549 1.97852,11.00781 2.27235,0.41374 7.14713,0.75195 10.83203,0.75195 3.6849,0 5.02373,-0.31822 2.97656,-0.70703 -2.12346,-0.4033 -4.46154,-2.60124 -5.44336,-5.11718 -2.02452,-5.18793 -1.98529,-5.20085 4.92969,-1.7168 2.93974,1.48116 6.76927,2.66696 8.51172,2.63476 1.74244,-0.0322 -0.51576,-1.68634 -5.01953,-3.67578 -12.65543,-5.59026 -13.00136,-5.68017 -14.05469,-3.625 -0.60011,1.17089 -0.12427,1.53206 1.20703,0.91602 1.51054,-0.69897 2.0654,0.007 1.77735,2.26367 -0.23029,1.80444 0.32287,3.87415 1.23047,4.59961 1.19923,0.95858 1.19377,1.32766 -0.0274,1.34766 -0.92332,0.0151 -2.5138,-1.18486 -3.5332,-2.66602 -1.01939,-1.48116 -2.94458,-2.75598 -4.27735,-2.83398 -1.54293,-0.0902 -1.74554,-0.47224 -0.56054,-1.04883 2.1101,-1.02683 2.55773,-5.9911 0.54101,-5.99219 z m 149.95703,0.18555 c -0.91953,-0.01 -1.04111,0.5492 -0.42968,1.74219 0.82404,1.60779 0.43995,1.93787 -1.3125,1.12695 -6.06299,-2.80554 -1.64318,1.16431 6.4082,5.75586 4.88725,2.78711 8.40461,5.70982 7.81641,6.49414 -0.5882,0.78433 0.15821,0.89323 1.6582,0.24219 1.49999,-0.65105 3.67851,-1.1836 4.83984,-1.1836 3.62592,0 2.30733,-5.00622 -1.98437,-7.53711 -2.25189,-1.32798 -6.2155,-2.3963 -8.8086,-2.375 -2.59307,0.0214 -4.60327,-0.72159 -4.46679,-1.65039 0.13648,-0.92879 -1.00313,-2.01755 -2.53321,-2.41797 -0.48666,-0.12737 -0.88094,-0.19395 -1.1875,-0.19726 z m -27.75976,2.73633 c -5.64309,0.0166 -9.21484,2.16067 -9.21484,6.28906 0,3.79502 -0.26232,3.71758 14.88867,4.41406 6.1415,0.28233 13.1762,1.30295 15.63281,2.26758 14.77044,5.79989 10.02846,-2.67124 -5.08398,-9.08203 -6.19167,-2.62655 -11.83359,-3.90158 -16.22266,-3.88867 z m 2.35547,1.125 c 0.37698,-0.009 0.85636,0.14002 1.45703,0.43359 1.43302,0.70037 4.51295,2.10487 6.84375,3.12109 3.14513,1.37125 3.72205,2.242 2.23437,3.37891 -2.69435,2.05906 -3.08987,1.99729 -6.68945,-1.04297 -1.71237,-1.44625 -3.5503,-2.10252 -4.08398,-1.45898 -2.11559,2.5511 -6.89962,1.81602 -5.10938,-0.78516 1.38331,-2.00991 1.93494,-2.03744 2.92969,-0.14648 0.89607,1.7034 1.23135,1.43236 1.24805,-1.00586 0.0116,-1.69094 0.34056,-2.47463 1.16992,-2.49414 z m 105.46875,26.84765 c -0.41874,0.015 -1.46567,0.25998 -3.14063,0.65235 -6.01341,1.40866 -13.57602,5.84474 -15.9375,9.3496 -1.62867,2.41724 -1.56202,2.69969 0.42774,1.80274 1.44998,-0.65362 2.35742,-0.0922 2.35742,1.45898 0,1.38702 -0.28664,2.17606 -0.63672,1.75391 -0.35008,-0.42215 -2.65289,2.00225 -5.11719,5.38672 -2.46431,3.38447 -5.58345,6.10166 -6.93164,6.03906 -1.64923,-0.0766 -1.32407,-0.65815 0.99414,-1.7793 2.07263,-1.00237 3.01871,-2.49988 2.375,-3.75585 -0.66579,-1.29904 -0.41904,-1.60366 0.65039,-0.80665 1.01462,0.75615 1.71875,0.15093 1.71875,-1.47851 0,-4.97704 -7.17869,0.59075 -8.23437,6.38672 -0.51472,2.82592 -1.55284,5.13867 -2.30664,5.13867 -0.75381,0 -1.3711,1.61496 -1.3711,3.58984 0,2.39379 0.99339,3.5918 2.97852,3.5918 1.63774,0 2.97852,-0.77081 2.97852,-1.71094 0,-0.94014 4.15691,-4.6471 9.23828,-8.23828 5.08138,-3.59119 10.881,-8.08786 12.88867,-9.99219 2.12204,-2.01281 4.80304,-3.02029 6.40234,-2.4082 3.21878,1.23191 5.48898,-3.77587 3.04688,-6.7207 -1.10576,-1.33338 -2.93672,-1.32434 -6.1543,0.0273 -5.25232,2.20788 -6.27504,1.02417 -1.22852,-1.42187 3.09269,-1.49902 3.12016,-1.6405 0.3711,-1.82032 -2.39942,-0.15695 -2.1089,-0.70342 1.49023,-2.8164 2.7916,-1.6389 3.83853,-2.2535 3.14063,-2.22852 z m -8.04297,12.23438 c 1.05815,0.022 0.24834,1.63711 -1.79883,3.58984 -7.76266,7.40457 -14.9326,11.67745 -8.93164,5.32227 7.79231,-8.25225 8.63771,-8.95551 10.73047,-8.91211 z m -47.79102,13.46875 c 0.0114,0.0205 0.0217,0.0395 0.0293,0.0566 0.0426,0.005 0.0683,0.006 0.0801,0.004 l 0.002,-0.002 h 0.002 0.002 v -0.002 h 0.002 v -0.002 -0.002 h -0.002 v -0.002 c -0.0123,-0.0108 -0.0559,-0.03 -0.11524,-0.0508 z m -180.25781,12.64843 c -0.0571,0.21075 -0.0804,0.41535 -0.0566,0.60743 0.19056,0.0271 0.37057,0.0543 0.53125,0.0801 -0.0903,-0.28009 -0.26176,-0.49757 -0.47461,-0.6875 z m 0.52734,0.91602 c -0.10088,0.0146 -0.20557,0.0261 -0.3125,0.0352 0.0198,0.0286 0.0395,0.0566 0.0605,0.084 -0.15118,0.0938 0.17153,0.19951 0.25195,0.15625 h 0.002 l 0.002,-0.002 0.002,-0.002 0.002,-0.002 h 0.002 v -0.002 h 0.002 v -0.002 -0.002 l 0.002,-0.002 v -0.002 l 0.002,-0.002 v -0.002 -0.002 -0.002 -0.002 c 3.5e-4,-0.0883 -0.004,-0.17131 -0.0156,-0.25 z m -132.86132,0.5957 h 0.002 c 0.001,-1.3e-4 0.005,1.4e-4 0.006,0 0.05,-0.003 0.10107,0.0533 0.1543,0.16797 0.78618,1.69401 0.98328,8.33981 0.44336,14.98242 -0.67919,8.35618 -0.51459,11.13101 0.54882,9.2461 1.07482,-1.90512 1.24652,0.11615 0.58789,6.9082 -0.66657,6.87382 -0.39065,10.00351 0.97266,11.01953 1.04732,0.78053 1.44548,2.31818 0.88281,3.41602 -1.69831,3.31362 -3.81083,2.24864 -4.05859,-2.04492 -0.95331,-16.52026 -0.62283,-43.46354 0.45898,-43.69336 h 0.002 z m 320.22656,3.50196 c -0.05,-3.4e-4 -0.10369,0.002 -0.1543,0.002 h -0.002 c -0.007,10e-4 -0.0139,0.002 -0.0195,0.004 -0.10819,0.0303 -0.21475,0.0612 -0.32227,0.0937 0.20214,-0.0178 0.40261,-0.0415 0.60352,-0.0723 h 0.002 l 0.002,-0.002 h 0.002 0.002 0.002 0.002 0.002 l 0.002,-0.002 h 0.002 v -0.002 h 0.002 v -0.002 h -0.002 v -0.002 h -0.002 c -0.0158,-0.007 -0.0665,-0.0135 -0.12109,-0.0176 z m 126.28906,1.17578 c 3.92662,0.17199 3.50487,1.64285 3.26758,5.84765 -0.23446,4.15451 -4e-4,4.85848 0.83008,2.48828 1.03126,-2.94321 1.33862,22.0165 0.32812,26.64258 -0.72082,3.29993 -1.08194,5.36948 -1.31054,7.50586 -0.12472,1.16562 -1.73373,2.51 -3.57618,2.98828 -0.96205,0.24972 -1.44803,0.42739 -1.45703,0.53321 0,9.6e-4 -8e-5,0.005 0,0.006 v 0.002 0.002 0.002 0.002 l 0.002,0.002 v 0.002 c 0.0697,0.12365 0.92728,0.13325 2.57226,0.0234 3.93244,-0.26051 4.41507,0.23862 4.04688,4.17578 -0.23,2.45955 0.44895,5.28672 1.50781,6.28321 1.05886,0.99649 2.89976,4.23495 4.0918,7.19726 1.19204,2.96232 2.41366,5.99184 2.71289,6.73242 0.29923,0.74058 -0.51792,1.34766 -1.81446,1.34766 -1.29654,0 -2.35742,-0.7677 -2.35742,-1.70508 0,-0.93739 -2.17658,-4.31872 -4.83789,-7.51562 -1.70491,-2.04802 -2.61934,-3.27773 -2.59375,-3.44141 v -0.002 -0.002 -0.002 l 0.002,-0.002 v -0.002 l 0.002,-0.002 0.002,-0.002 0.002,-0.002 h 0.002 l 0.002,-0.002 h 0.002 0.002 0.002 c 0.08,-0.003 0.38909,0.25039 0.93945,0.79102 2.55156,2.50644 3.43086,2.6665 4.33203,0.78516 0.62199,-1.29864 0.59385,-1.77666 -0.0605,-1.0625 -1.70703,1.86036 -11.93898,-8.39786 -15.70313,-15.74219 -1.75519,-3.4246 -3.8038,-5.76909 -4.55273,-5.21094 -0.74893,0.55815 -1.36133,0.29325 -1.36133,-0.58789 0,-0.88114 -1.00608,-1.73582 -2.23438,-1.90039 -1.2283,-0.16457 -3.23849,-0.43504 -4.46679,-0.59961 -1.2283,-0.16457 -2.23242,-0.97206 -2.23242,-1.79492 0,-0.82287 -1.00608,-1.4961 -2.23438,-1.4961 -1.2283,0 -2.23242,-1.18248 -2.23242,-2.6289 0,-5.78464 -18.28891,-7.58768 -27.54297,-2.71485 -5.35804,2.82131 -8.90079,2.83018 -10.80273,0.0234 -1.55547,-2.29472 -1.6455,-1.99431 -0.53125,1.79297 1.12948,3.83903 0.89721,4.55273 -1.48047,4.55273 -1.55075,0 -2.81836,-0.6343 -2.81836,-1.41015 0,-0.77584 -1.28597,-1.41016 -2.85547,-1.41016 -1.56949,0 -3.23207,-1.00984 -3.69531,-2.24414 -0.46323,-1.23429 -0.66112,-0.62918 -0.43946,1.3457 0.23897,2.12923 1.44006,3.48966 2.95117,3.3418 1.40166,-0.13715 2.54883,0.78695 2.54883,2.05274 0,3.33411 -4.07352,4.71466 -5.03125,1.70507 -0.4462,-1.40216 -1.75532,-2.1125 -2.91015,-1.57812 -1.59604,0.73854 -1.91799,-0.2382 -1.3418,-4.07031 0.96422,-6.41283 -0.38326,-4.9298 -1.75,1.92578 -0.9431,4.7306 -0.73866,5.08027 2.39648,4.12695 3.29806,-1.00288 3.3185,-0.94333 0.53711,1.5625 -4.22214,3.80383 -7.16061,3.33258 -6.14453,-0.98633 0.46462,-1.97488 1.256,-5.40912 1.75781,-7.63086 1.8184,-8.04913 11.26225,-23.46197 12.76954,-20.83984 0.97631,1.69842 1.11574,1.21394 0.45898,-1.60156 -0.51825,-2.22174 -0.73059,-4.10801 -0.4707,-4.19141 0.2599,-0.0834 10.85833,-0.46375 23.55078,-0.8457 12.69244,-0.38195 29.10675,-1.18165 36.47656,-1.77735 6.46631,-0.52267 10.38817,-0.88835 12.74414,-0.78515 z m -359.13476,5.66211 c -2.13153,-0.0166 -1.33367,5.799 1.83789,12.07226 2.30634,4.56187 2.62366,6.43712 1.26562,7.44922 -1.21546,0.90584 -0.99497,1.55394 0.75195,2.14258 1.44144,-0.10363 2.87731,-0.30444 4.31446,-0.4707 0.71995,-0.0865 1.44048,-0.16071 2.16211,-0.22657 2.35104,-1.23052 2.07703,-1.68455 -1.04102,-2.19726 -0.75063,-0.12343 -1.92308,-0.96049 -2.60547,-1.85938 -0.72084,-0.94954 -0.46213,-1.09408 0.61914,-0.34375 1.02358,0.71031 1.85139,0.6387 1.83789,-0.16015 -0.0481,-2.85042 -6.70975,-15.54886 -8.53711,-16.27344 -0.22305,-0.0884 -0.42483,-0.13141 -0.60546,-0.13281 z m 328.07812,27.73242 c -0.0266,4.6e-4 -0.0672,0.002 -0.12109,0.004 -0.02,0.0136 -0.0418,0.0259 -0.0625,0.0391 0.14227,-0.0251 0.21209,-0.0364 0.21875,-0.041 l -0.002,-0.002 c -0.005,-6.8e-4 -0.0166,-2.9e-4 -0.0332,0 z m -272.50195,4.44336 c -0.0338,0.0868 -0.0662,0.17103 -0.0977,0.2539 0.48557,0.71509 0.85138,1.4724 1.13086,2.25977 0.243,-0.10638 0.47988,-0.21185 0.71094,-0.31641 -0.004,-0.0217 -0.008,-0.043 -0.0117,-0.0644 -0.29021,-0.45004 -0.64638,-0.93687 -1.06641,-1.44336 -0.21536,-0.2597 -0.44028,-0.49017 -0.66601,-0.68945 z m -99.8125,1.29883 c 0.0234,-0.0158 -0.0839,0.0186 -0.40235,0.14062 0.005,0.006 0.0105,0.0113 0.0156,0.0176 0.20934,-0.0776 0.36331,-0.14241 0.38672,-0.1582 z m 0.68359,3.24609 v 0.002 0.002 c 0.004,0.0345 0.008,0.0684 0.006,0.0801 l -0.002,0.002 v 0.002 h -0.002 l -0.002,-0.002 c -0.002,-0.005 -0.008,-0.0157 -0.0117,-0.0293 -0.0482,0.23958 -0.0486,0.4882 0.0254,0.74609 v 0.002 0.002 l 0.002,0.002 h 0.002 v 0.002 0.002 0.002 h 0.002 v 0.002 h 0.002 0.002 0.002 v -0.002 l 0.002,-0.002 c 0.0243,-0.0612 0.0422,-0.45496 0.0391,-0.49023 -10e-4,0.007 -0.003,0.0276 -0.006,0.0664 -0.0303,-0.20171 -0.0489,-0.32145 -0.0586,-0.38867 z m 378.54297,1.68555 c -0.35757,0.28077 -0.80545,0.58763 -1.34766,0.95507 0.58505,0.13283 1.16198,0.2981 1.73829,0.4668 -0.1406,-0.50924 -0.27136,-0.98292 -0.39063,-1.42187 z m -86.31445,0.38086 c 0.0372,0.0405 0.0733,0.0794 0.11133,0.11914 0.0708,0.074 0.29436,0.21198 0.3457,0.22265 8.9e-4,1.1e-4 0.005,0 0.006,0 h 0.002 0.002 v -0.002 -0.002 -0.002 -0.002 c -0.002,-0.004 -0.008,-0.0116 -0.0137,-0.0176 -0.11122,-0.11843 -0.30521,-0.2218 -0.4375,-0.3125 -0.006,-0.002 -0.01,-0.002 -0.0156,-0.004 z M 368.2207,654.625 c 0.15061,2.19096 0.38315,4.37355 0.56055,6.5625 0.24144,2.79466 0.46951,5.58952 0.625,8.39062 0.1769,3.13375 0.27624,6.27305 0.24414,9.41211 -7.3e-4,0.45103 -9.5e-4,0.90249 -0.002,1.35352 0.002,-0.0134 0.004,-0.0276 0.006,-0.041 0.41667,-3.25817 1.35548,-6.40593 2.37109,-9.51953 -0.0605,-0.50773 -0.12978,-1.01575 -0.20898,-1.52148 -0.41374,-2.55876 -0.87545,-5.10789 -1.28125,-7.66797 -0.43132,-1.92946 -0.96957,-3.84852 -1.74024,-5.67187 -0.19184,-0.42604 -0.37689,-0.86387 -0.57422,-1.29688 z m -49.52539,5.46094 c -0.079,0.0375 -0.15892,0.0737 -0.23828,0.10937 0.14172,0.17451 0.28333,0.35442 0.42383,0.53907 -0.0619,-0.21619 -0.12356,-0.4323 -0.18555,-0.64844 z m 291.60352,2.26172 c -0.007,0.01 -0.0295,0.0699 -0.0742,0.21484 0.0439,-0.0923 0.0747,-0.19425 0.0762,-0.21289 v -0.002 z m 82.92773,0.28515 c 0.023,0.69983 -0.004,1.4001 -0.0996,2.09961 -0.0238,0.17469 -0.088,0.32031 -0.18164,0.44531 0.96885,8.61952 2.92419,8.15876 -1.87109,8.56836 -0.10415,0.004 -0.20835,0.008 -0.3125,0.0117 1.97233,0.24291 3.94387,0.49439 5.91211,0.76758 -1.27764,-4.37276 -2.43964,-8.38324 -3.44727,-11.89258 z m -305.95898,3.0586 c -0.45874,2.19342 -0.95935,4.37775 -1.57617,6.53125 0.0857,1.16869 0.1482,2.33883 0.19921,3.50976 0.16474,-1.04798 0.3179,-2.09593 0.41797,-3.15234 0.2634,-2.30303 0.55739,-4.60531 0.95899,-6.88867 z m 323.10351,1.78125 h 0.002 0.002 0.002 0.002 c 10e-4,5e-5 0.002,0 0.004,0 0.32502,-0.0153 1.42952,1.12666 3.55274,3.52929 2.55419,2.89033 4.32566,5.63931 3.9375,6.10743 -0.38817,0.46807 0.39085,1.81684 1.73047,2.99804 1.63676,1.44321 1.89679,2.54796 0.79492,3.36914 -0.90183,0.6721 -2.3671,-0.41544 -3.25586,-2.41797 -0.88877,-2.00254 -1.08827,-3.66531 -0.44531,-3.69531 0.64296,-0.03 0.005,-0.87335 -1.41797,-1.87305 -1.42298,-0.9997 -3.35403,-3.59985 -4.28907,-5.77929 -0.61413,-1.43147 -0.86032,-2.19528 -0.62304,-2.23633 h 0.002 z m -19.41992,6.11328 c 5e-5,10e-4 -1.7e-4,0.003 0,0.004 v 0.002 c 1.8e-4,9.7e-4 0.002,0.005 0.002,0.006 v 0.002 0.002 l 0.002,0.002 0.002,0.002 c 8.3e-4,4.9e-4 0.003,0.002 0.004,0.002 0.0203,0.006 0.0645,-0.003 0.0801,-0.01 h 0.002 l 0.002,-0.002 h 0.002 v -0.002 h -0.002 v -0.002 h -0.002 c -0.0272,-0.002 -0.0587,-0.004 -0.0918,-0.006 z m -163.85156,2.01758 c -1.14202,0.14436 -2.28603,0.27803 -3.43164,0.39453 -0.78047,0.0756 -1.56067,0.1462 -2.3418,0.21093 0.25193,0.0218 0.50378,0.042 0.75586,0.0625 1.67606,0.0992 3.35073,0.22993 5.02344,0.3711 -0.003,-0.34636 -0.006,-0.69324 -0.006,-1.03906 z m 169.9043,0.0488 c -0.22395,0.0628 -0.43401,0.15699 -0.61719,0.29493 0.22754,-0.0222 0.45445,-0.0448 0.68164,-0.0703 -0.0219,-0.0748 -0.0426,-0.15003 -0.0644,-0.22461 z m -404.96094,4.21485 c -0.21102,0.17746 -0.42835,0.34768 -0.65235,0.50976 0.16092,0.34147 0.29896,0.69758 0.41797,1.06446 0.0703,-0.52892 0.14851,-1.05346 0.23438,-1.57422 z m -0.53516,5.80273 c -0.0229,0.1018 -0.0492,0.19822 -0.0684,0.30664 0.0159,-0.009 0.0309,-0.0199 0.0469,-0.0293 h 0.002 c 0.004,-0.0934 0.0149,-0.18414 0.0195,-0.27735 z m -26.63086,8.4668 c 0.35551,-0.0171 0.74652,0.48969 1.19336,1.45312 0.63128,1.3611 0.48723,6.9187 -0.32031,12.34961 -2.27251,15.28334 -4.75872,15.92192 -3.48828,0.89649 0.86819,-10.26797 1.59181,-14.6501 2.61523,-14.69922 z m 438.78516,4.04492 c -0.0715,0.0918 -0.14529,0.17921 -0.2207,0.26367 0.10412,0.0147 0.20839,0.0301 0.3125,0.0449 -0.0306,-0.10262 -0.0611,-0.20549 -0.0918,-0.30859 z m -367.12109,2.67188 -0.002,0.002 h -0.002 -0.002 -0.002 l -0.002,0.002 c -0.0333,0.0267 -0.0832,0.1343 -0.0977,0.1836 -0.0442,0.15104 -0.0777,0.30472 -0.10937,0.45898 0.0561,-0.10066 0.11184,-0.20098 0.17187,-0.29883 0.0202,-0.11041 0.10055,-0.22725 0.0606,-0.33203 v -0.002 -0.002 h -0.002 v -0.002 l -0.002,-0.002 -0.002,-0.002 -0.002,-0.002 -0.002,-0.002 h -0.002 -0.002 z m 263.24414,6.97265 -0.002,0.002 -0.002,0.002 c -0.0263,0.039 -0.0643,0.24525 -0.0508,0.60156 0.0786,-0.36261 0.0822,-0.55792 0.0645,-0.59766 v -0.002 l -0.002,-0.002 v -0.002 h -0.002 v -0.002 h -0.002 -0.002 z m -139.64454,4.64844 c -2.4649,-0.0957 -4.92839,0.0323 -7.37304,0.37109 -0.46027,0.0688 -0.91822,0.14654 -1.375,0.23047 1.28291,0.0614 2.56593,0.10215 3.84765,0.14453 3.15996,0.0882 6.32146,0.13388 9.48243,0.16407 -1.49768,-0.44223 -3.01322,-0.82935 -4.58204,-0.91016 z m -60.61523,3.32812 v 0.002 0.002 c 0.006,0.0241 0.0542,0.10703 0.0684,0.14258 0.031,0.0598 0.0618,0.11987 0.0918,0.17969 -0.021,-0.0489 -0.0427,-0.0979 -0.0645,-0.14649 -0.0229,-0.0266 -0.0328,-0.0701 -0.0469,-0.10937 -0.002,-0.005 -0.004,-0.0105 -0.006,-0.0156 -0.004,-0.01 -0.008,-0.0191 -0.0137,-0.0273 -0.005,-0.008 -0.0105,-0.0152 -0.0176,-0.0215 l -0.002,-0.002 -0.002,-0.002 -0.002,-0.002 h -0.002 -0.002 z m 0.79688,1.79688 c 0.5623,1.55414 0.75504,3.12893 0.4082,4.83008 -0.18093,1.47493 -0.4265,2.94692 -0.94141,4.34765 -0.1674,0.46804 -0.33485,0.94838 -0.51953,1.42383 2.36232,-0.11436 4.72604,-0.19927 7.08789,-0.32031 -0.74531,-1.16269 -1.23768,-2.4159 -1.55078,-3.72656 -1.05182,-1.1486 -2.06134,-2.32986 -2.85352,-3.68946 -0.57785,-0.93485 -1.12836,-1.88929 -1.63085,-2.86523 z m -138.00391,7.58203 h 0.002 c 0.002,2e-5 0.009,0.001 0.0117,0.002 0.0804,0.0304 0.17297,0.40314 0.26758,1.15625 0.34113,2.71546 0.34113,7.15955 0,9.875 -0.0946,0.75312 -0.18519,1.12581 -0.26563,1.15625 -0.003,8.8e-4 -0.0103,0.002 -0.0137,0.002 h -0.002 l -0.002,-0.002 h -0.002 -0.002 -0.002 c -0.1951,-0.11557 -0.33203,-2.33878 -0.33203,-6.09375 0,-3.75497 0.13497,-5.97427 0.33007,-6.08984 0.002,-0.001 0.008,-0.005 0.01,-0.006 z m 7.92187,1.31055 c 0.002,0.0169 0.0362,0.0926 0.0937,0.22265 9.1e-4,-0.031 8.4e-4,-0.063 0.002,-0.0937 -0.0534,-0.0802 -0.0827,-0.12248 -0.0918,-0.1289 h -0.002 z m 434.76172,1.41601 c 0.0643,0.0219 0.12999,0.0449 0.19727,0.0684 0.0872,-0.0102 0.1335,-0.0195 0.14844,-0.0273 h 0.002 l 0.002,-0.002 h 0.002 v -0.002 -0.002 l -0.002,-0.002 -0.002,-0.002 h -0.002 c -0.0343,-0.0133 -0.17614,-0.0249 -0.34571,-0.0312 z m -382.10156,4.12891 -0.002,0.002 v 0.002 h -0.002 c -0.0865,0.63675 -0.18268,1.2721 -0.29101,1.90625 -0.0207,0.11928 -0.0414,0.23938 -0.0625,0.35937 0.63291,0.002 1.26558,0.003 1.89844,0.004 0.12281,1.8e-4 0.24632,-1.8e-4 0.36914,0 -0.23977,-0.2197 -0.49446,-0.45368 -0.77149,-0.70117 -0.49543,-0.65081 -0.79401,-1.00595 -1.13672,-1.57227 z m 291.14063,7.45703 c -0.87908,0.27681 -1.76066,0.54582 -2.65625,0.77344 -0.50951,0.1291 -1.02274,0.24433 -1.53711,0.34961 1.24337,0.43503 2.74732,0.70559 4.56836,0.86523 -0.13196,-0.70262 -0.2568,-1.36543 -0.375,-1.98828 z m -178.4004,1.97852 c 1.65934,0.55152 4.17398,0.61716 8.58008,0.64843 12.12434,0.0861 10.03858,2.2524 -10.4707,10.87305 -14.56964,6.12405 -14.96311,6.6369 -5.19727,6.77148 6.57566,0.0907 10.52038,-1.41392 23.22657,-8.86132 4.86938,-2.85407 10.26956,-5.09948 15.56836,-6.72266 -2.76442,-0.27605 -5.52362,-0.61026 -8.28125,-0.94531 -3.33957,-0.41348 -6.69019,-0.74269 -10.04493,-1.00391 -3.73271,-0.23167 -7.46816,-0.34956 -11.19921,-0.61133 -0.72673,-0.0535 -1.45444,-0.10313 -2.18165,-0.14843 z m -173.57617,2.9707 c 1.53059,0 1.74305,1.4858 0.875,6.12695 -1.65862,8.86804 -2.89453,9.31851 -2.89453,1.05469 0,-4.85047 0.65482,-7.18164 2.01953,-7.18164 z m 246.90821,0.5957 c -3.21881,0.17467 -6.44011,0.2936 -9.66211,0.38477 -1.24472,0.0341 -2.48971,0.0602 -3.73438,0.082 -0.17905,1.26781 -1.13725,2.80857 -3.04492,4.62305 -8.55276,8.13495 -9.25016,9.875 -3.95117,9.875 2.16855,0 7.51487,-3.55817 12.81836,-8.5293 3.34941,-3.13951 5.52177,-5.12848 7.57422,-6.43555 z"/></svg>
              wammale cinema
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
              <svg viewBox="-781.1 -506.07695400000006 1477.2 1230.7828080000002" className="w-5 h-5 fill-current"><path fill="currentColor" d="m 485.85846,167.75233 c -5.52918,0.055 -10.68466,1.09531 -15.06055,3.57617 -7.29483,4.13568 -6.55325,12.86121 -3.13477,19.31836 6.77842,12.80365 15.32901,23.8446 5.72852,37.99805 -6.89771,10.16882 -18.87223,15.82049 -27.67969,24.14062 -18.36368,17.34748 -21.72519,38.80835 -11.01953,60.86133 -29.60733,2.77142 -59.91504,17.93494 -75.50195,44 -4.43253,7.41223 -8.01835,15.56775 -9.95508,24 -0.8411,3.66211 -0.51301,10.42017 -4.04102,12.69922 -2.85474,1.84412 -7.33777,0.43146 -10.50195,0.34375 -7.51068,-0.20825 -15.49167,0.5683 -23,1.09375 -27.40524,1.91785 -60.0018,9.65137 -76.19922,33.86328 -16.41968,24.54419 -14.159,63.22217 -9.16601,91 1.94873,10.84155 2.87834,27.84875 16.36523,29 -2.33041,-37.98907 -22.54609,-95.63238 15.00781,-124.17188 5.62193,-4.27246 12.35611,-7.70471 18.99219,-10.09374 10.82721,-3.8979 22.59027,-5.49769 34,-6.51758 12.73038,-1.13794 25.42075,-2.03211 38,0.7832 v 1 c -9.65176,3.16803 -20.77328,5.39026 -28,13 l 31,-5 4,10 c -30.88101,13.29755 -58.6791,40.22095 -65.52148,74 -3.04956,15.05493 -7.06849,57.44617 17.52148,51 -2.74146,-12.81287 -5.86206,-24.73535 -4.86133,-38 2.16632,-28.71429 21.16055,-53.34161 44.86133,-68.27734 14.46658,-9.11652 31.15726,-12.65039 46,-20.72266 -8.27725,-4.7655 -20.60654,1.99225 -27.24023,-6.14844 -10.07257,-12.36078 -6.74974,-31.41809 -1.26367,-44.85156 14.59811,-35.74585 54.30337,-51.66559 90.5039,-52 l -23,11 v 1 c 28.20889,-2.63049 58.99377,-9.18603 85,-20.58203 11.82709,-5.18261 24.55054,-13.95014 27,-27.41797 -22.5011,16.58893 -45.17892,27.40845 -74,26.97852 -14.89639,-0.22223 -30.86953,-8.8711 -29.46289,-25.97852 3.0969,-37.66376 58.36673,-41.95789 47.9082,-85 -2.01767,-8.30371 -7.18173,-14.78882 -11.44531,-22 41.50751,-5.50305 87.92255,26.24273 116,54.00781 8.12701,8.03656 16.05335,16.34308 22.26758,25.99219 4.58258,7.11554 8.62458,14.75934 10.75,23 9.15461,35.49402 -17.62622,61.69238 -49.01758,72 v 1 c 16.83887,2.2074 32.0575,-4.11254 43.98242,-16.01953 4.42743,-4.42077 9.54761,-15.72626 15.54297,-17.57813 7.98584,-2.46674 23.27222,3.52979 30.47461,6.88868 23.1485,10.79553 42.6211,33.77758 40.86133,60.70898 -0.74481,11.39868 -5.5055,20.39227 -8.86133,31 9.21252,1.68573 16.0351,-0.52026 25,4.01953 32.13617,16.27368 58.87042,67.55792 35,100.98047 -1.58337,-9.11908 -6.76013,-19.48353 -17,-20.71094 -7.41339,-0.88861 -14.69695,2.97259 -19.95898,7.86914 -2.68829,2.50158 -5.90576,7.9383 -10.08203,7.72266 -7.1084,-0.36706 -16.72443,-10.08502 -22.95899,-13.5332 -19.24506,-10.64404 -59.86151,-21.48841 -65.81055,10.65234 -0.82073,4.43433 -0.73803,8.55273 -0.18945,13 -11.89337,2.3374 -23.10925,7.47333 -35,9.98828 -45.49731,9.62286 -102.10092,14.30518 -146,-3.98828 l 24,-7 v -1 c -15.02319,0 -33.76074,-2.09754 -44.37695,11.04883 -2.66358,3.2984 -7.18386,10.05724 -5.57031,14.59765 0.99817,2.80871 3.6322,1.44307 5.17968,0.002 4.93888,-4.60034 8.0434,-9.97796 14.76758,-4.41992 38.35355,31.70191 77.55878,74.72869 133,59.47265 11.51978,-3.16992 21.82031,-8.52661 32,-14.70117 3.33691,9.81561 11.89893,15.07141 21,19 l -38,27 c 11.70056,-0.41626 22.7688,-3.69232 33,-9.34961 5.64813,-3.12311 11.60864,-9.64075 18,-10.82812 27.86859,-5.17737 44.625,32.20617 59.1543,48.17773 9.68316,10.64429 19.90985,13.72943 31.70898,20.57617 6.27209,3.63953 10.35156,9.68976 17.13672,12.87891 10.93958,5.14179 19.30573,5.87413 29,13.9043 5.1734,4.28534 20.27741,10.86938 21.58203,17.72656 2.17865,11.45117 -15.49054,25.53369 -23.58203,30.65234 -29.5246,18.67706 -67.21558,20.70795 -101,24.69727 -60.18372,7.10656 -119.89557,-2.75953 -180,-3.42774 -53.72583,-0.59729 -111.08801,8.99885 -164,-2.91601 -40.36197,-9.0888 -70.4875,-40.57276 -72,-83.0918 7.20576,0.41565 14.96591,-1.6258 22,-0.58594 34.35123,5.07843 75.64178,17.87012 108,-1.93164 26.31915,-16.10608 38.45218,-54.14258 17.58203,-79.48047 -8.67551,-10.53271 -22.3172,-13.07129 -30.95898,-22.32422 -13.20829,-14.1426 -17.85306,-33.31702 -38.62305,-39.83984 -15.2222,-4.78058 -30.52658,2.10705 -46,1.02539 -26.55873,-1.85657 -52.61674,-6.87585 -79,-10.16406 -14.9433,-1.86242 -32.67346,-4.1377 -47,1.80664 -18.18503,7.54535 -19.61675,29.06616 -6.8418,42.41406 13.41916,14.021 35.1189,19.30835 53.8418,21.08008 -8.97382,5.78906 -22.63455,4.12036 -33,5.21289 -14.6156,1.54053 -29.62306,5.85389 -42,13.95313 -28.61714,18.72667 -30.16611,52.0721 -29.99805,82.83394 0.0951,17.41052 4.24042,36.4649 23.99805,40 0,18.47107 -2.31592,38.63532 0.14844,56.92969 0.79722,5.91822 10.19035,7.13703 12.7832,1.78711 4.47969,-9.24316 0.98254,-29.64637 0.48438,-39.9336 -0.1985,-4.09912 -1.79014,-12.81012 2.08593,-15.52343 4.79526,-3.35682 15.86719,-1.25977 21.49805,-1.25977 18.93381,0 38.14435,-0.84064 57,1 0.15866,17.3147 -19.20913,25.56995 -25.27539,42 -1.37681,3.729 -4.10383,9.70966 -2.67773,13.7168 2.00197,5.62525 10.71827,3.21801 12.86914,-0.86524 10.00839,-19.00018 18.00309,-32.39368 39.08398,-41.04297 4.64473,-1.9057 11.50626,-5.57782 16.67969,-4.34765 4.25323,1.01141 7.94049,5.68945 11.32031,8.26953 6.3089,4.81616 13.26831,8.16766 20,12.26953 -19.18225,3.04602 -36.12411,4.09827 -53,15 v 1 c 15.30684,-0.5498 30.62051,-4.78821 46,-5.86328 25.6636,-1.79394 52.57083,0.8736 78,4.30078 41.10199,5.53943 85.5087,23.07184 127,15.5625 v -1 l -40,-7.3418 -17,-5.6582 c 68.64194,-4.10944 136.27893,2 205,2 v 1 l -38,9 v 1 c 29.54083,6.33862 62.99432,-10.28961 92,-15.07812 43.19092,-7.13032 85.00238,-4.02033 128,2.07812 -12.10632,-15.31268 -44.52124,-15 -62,-15 7.5907,-5.93738 17.84967,-8.72705 26,-14.11719 3.95923,-2.61834 8.09857,-7.31922 13,-7.9082 13.3891,-1.60889 33.86926,11.39557 42.7793,20.25 10.46936,10.40399 10.86688,29.74066 27.2207,29.77539 -1.69995,-11.97632 -5.62958,-24.50689 -13.41992,-34 -4.92133,-5.99701 -16.18005,-11.1297 -15.40234,-19.9707 0.7456,-8.47583 12.87579,-6.0293 18.82226,-6.0293 h 62 c 0,16.33295 -0.0579,32.66711 0.002,49 0.0232,6.33521 2.3244,13.99756 10.63282,10.63672 5.07898,-2.05444 3.36523,-11.33051 3.36523,-15.63672 v -46 c 16.44946,-2.94324 20.85303,-15.14355 22.56055,-30 2.70526,-23.53735 -0.33283,-52.46234 -12.78516,-73 -11.44642,-18.87854 -31.42877,-30.58837 -52.77539,-34.98242 -8.61688,-1.77368 -31.55353,0.3443 -36.37695,-7.16602 -5.62671,-8.76104 -9.19074,-18.93884 -14.7168,-27.85156 -2.99103,-4.8241 -8.62561,-10.24255 -9.46484,-16 -1.57983,-10.8385 5.75787,-26.03748 7.41211,-37 6.54693,-43.38605 7.67242,-99.45923 -37.85352,-122.22266 -10.54932,-5.27478 -22.42535,-7.95173 -34,-9.85546 -14.31482,-2.35443 -29.59918,-3.83118 -44,-1.92188 0,-46.43097 -34.88928,-81.56439 -82,-82 11.5824,-62.18378 -53.77417,-110.13757 -104,-131.99414 -12.3021,-5.35346 -32.24646,-14.06528 -48.83398,-13.90039 z m 131.81836,9.0625 c 0.11197,0.57179 0.30554,1.12134 0.57226,1.64844 -0.17226,-0.55706 -0.4096,-1.08758 -0.57226,-1.64844 z m 15.48828,203.74023 c -23.34046,-0.42293 -46.65377,9.25362 -59.05664,30.0918 -17.4721,29.35504 -4.5246,77.30237 30.58398,86 v 2 c -4.64331,2.9552 -7.13324,6.55048 -8,12 16.82214,-7.34998 30.8634,-17.67846 49,-22.36133 23.93097,-6.17895 46.05304,-2.67566 70,-4.63867 v -1 l -23,-6 c 8.38214,-13.30035 12.49133,-28.21216 9.08399,-44 -2.78669,-12.91193 -9.53083,-24.34387 -19.22071,-33.27734 -13.06689,-12.04685 -31.23693,-18.48551 -49.39062,-18.81446 z m 2.62304,9.31836 c 6.59848,0.25697 13.31507,1.5372 19.9043,3.91797 12.09155,4.36883 23.28497,13.03662 30.25195,23.85547 1.99975,3.10535 6.34333,9.53296 4.74805,13.45898 -1.0614,2.61218 -4.84613,1.77418 -7.0039,1.66602 -6.96096,-0.34893 -14.02808,-0.24889 -20.9961,-0.10742 -28.67328,0.58222 -57.33081,4.98193 -86,4.98242 4.13139,-30.80632 30.50229,-48.88698 59.0957,-47.77344 z m -176.17773,3.22461 c -6.96747,-0.0164 -14.01125,0.87711 -20.91797,2.73047 -35.04462,9.40393 -62.86441,46.18097 -50,82.81836 l 3,-1 c 19.34778,65.8866 139.95526,57.7099 140,-15 0.005,-7.5769 -0.6087,-14.76471 -3.01953,-22 -10.09902,-30.30867 -38.87011,-47.47761 -69.0625,-47.54883 z m -2.48047,9.73242 c 27.48606,-0.87913 55.16611,14.09394 62.5625,42.81641 -30.26279,0.27954 -61.12045,7.68054 -91,12 -5.59125,0.80829 -25.65478,7.03497 -29.60937,2.16992 -2.5112,-3.08936 -0.59568,-9.70898 0.18554,-13.16992 2.98795,-13.23724 11.23679,-24.97156 22.42383,-32.59375 10.49068,-7.14773 22.94384,-10.82305 35.4375,-11.22266 z m 269.51172,4.64649 c 2.00137,-0.0335 4.10423,0.16992 6.05078,0.16992 13.14008,0 26.06445,0.82159 39,3.27344 12.02948,2.28009 24.30554,6.62444 34,14.28515 24.97717,19.7373 25.10285,59.62708 21.69141,88.44141 -1.57471,13.3009 -10.04663,32.2782 -5.69141,45 -15.82324,-9.72119 -27.78625,-25.09387 -47,-29 2.11237,-12.45831 6.3617,-24.12323 5.95899,-37 -1.02288,-32.70654 -26.33759,-76.94678 -61.95899,-81 1.56189,-3.40138 4.61361,-4.11412 7.94922,-4.16992 z m -33.94922,34.16992 c -1.8e-4,10.2973 -0.28821,24.68317 -10.08789,31.06055 -8.96296,5.83282 -26.39313,4.1079 -36.91211,6.50781 -10.0329,2.289 -21.91266,9.75812 -32,9.83008 -21.94788,0.15661 -32.67175,-23.57398 -36,-41.39844 l 8,-1 c 7.00244,26.72766 41.90051,22.57159 45,-4 z m -172,12 c 17.19763,67.96161 -111.25473,83.40686 -119,17 l 13,-3 c 6.7446,18.33734 27.22168,26.3952 41.81445,10.91406 4.44522,-4.71582 5.3614,-16.09765 11.33204,-18.34961 15.6969,-5.92041 36.28753,-3.60705 52.85351,-6.56445 z m -346.5039,32.47266 c -0.68711,0.0121 -1.42541,0.17294 -2.2168,0.51757 -4.50603,1.96228 -2.3795,7.73035 -0.89453,11.00977 4.03451,8.90979 9.06616,19.63727 16.61523,26 -0.36365,-10.12347 -3.28853,-20.41547 -6.4707,-29.99219 -1.10037,-3.31155 -3.32284,-7.60046 -7.0332,-7.53515 z m -53.9961,5.38281 c -3.63187,-0.0679 -7.06184,2.041 -8.92773,6.1582 -2.49337,5.50177 3.60589,8.75275 7.42968,11.31836 10.2727,6.89252 23.35881,17.61316 35.99805,18.66797 -5.16261,-12.00537 -17.95893,-25.45887 -28.04101,-33.63477 -2.02872,-1.64515 -4.27987,-2.46903 -6.45899,-2.50976 z m 535.83984,16.03515 c 4.01913,0.12487 8.04868,0.87785 11.66016,1.89649 23.84955,6.72699 46.26837,25.28797 65,40.85547 6.36542,5.29017 11.89484,12.07226 19,16.35742 -5.55786,-15.68304 -17.80115,-25.4668 -30,-36 v -1 c 4.67065,-5.67249 13.30255,-17.26953 21.81445,-11.81445 10.69049,6.85132 8.54706,29.78967 12.30274,40.81445 5.71234,16.76855 19.16491,29.05591 26.40234,45 6.66089,14.67395 5.23511,30.99823 0.48047,46 9.29309,-7.57935 13.88824,-17.07605 14,-29 h 1 c 7.14899,9.58948 12.72229,19.56598 11.84961,32 -2.3573,33.58716 -39.28149,55.80304 -68.84961,38 l 22,-16 c -11.36182,2.90881 -22.05334,6.59051 -34,4.47656 -30.4679,-5.39124 -39.53711,-43.46685 -65,-57.72656 -14.09241,-7.89196 -46.45062,-9.54163 -51.31445,-27.75 -3.43585,-12.86261 10.44226,-16.90002 20.31445,-17.77734 22.34027,-1.98547 43.08856,12.33593 62,21.77734 -13.00128,-29.59442 -55.38739,-32.51172 -82,-28 -3.39868,-19.21313 10.24225,-30.95886 29,-30.96289 25.79639,-0.006 52.25897,15.08343 73,28.96289 -7.21204,-19.7937 -37.10828,-31.36872 -56,-36.08008 -5.07568,-1.26581 -21.72209,-0.67865 -24.66016,-4.74219 -2.66282,-3.68298 1.51026,-10.34692 3.98438,-12.99023 4.64863,-4.96651 11.31711,-6.50497 18.01562,-6.29688 z m 105.66016,30.10938 c 52.63885,5.46851 80.55793,68.99353 92.4336,113 4.22447,15.6543 8.24298,32.86694 5.06054,49 -8.56457,43.4176 -59.99426,28.89294 -83.49414,9 26.03455,-11.21906 37.862,-25.58899 44,-53 12.10144,3.97363 25.31665,8.32178 32,20 h 1 c -2.78412,-19.96326 -21.26379,-19.667 -32.10156,-31.75977 -5.68964,-6.34851 -6.74933,-17.90918 -12.09961,-25.24023 -17.25598,-23.64453 -45.66577,-49.45691 -46.79883,-81 z M 89.534238,546.6117 c -5.775124,-0.2098 -11.095149,4.43661 -9.296875,10.82813 1.266571,4.50177 6.726948,4.17994 10.455078,4.20508 10.842969,0.0732 23.443539,1.3042 33.999999,-0.99805 -7.67168,-7.35852 -23.5591,-12.36102 -33.999999,-13.92773 -0.38709,-0.0581 -0.773195,-0.0934 -1.158203,-0.10743 z m 516.158202,2.03516 c -4.34601,7.39136 -5.49365,13.55603 -4,22 -34.59595,2.07483 -66.1759,8.96667 -101,2.37695 -12.98911,-2.45789 -30.18423,-6.95117 -39,-17.37695 47.86679,6.34619 97.11084,4.29272 144,-7 z m -422.11133,8.76172 c 2.93006,0.0725 5.71141,0.2194 8.11133,0.24609 19.92111,0.22143 40.30716,5.05767 60,7.85157 13.09094,1.85724 27.27301,1.67785 40,5.14062 v 1 c -16.3418,8.56213 -34.91072,12.23547 -35,34 -27.056,0 -57.27368,1.12683 -82,-11.82031 -9.24788,-4.84235 -24.59612,-18.34314 -15.19726,-29.85742 5.1683,-6.33152 15.29576,-6.77814 24.08593,-6.56055 z m 137.11133,9.35937 c 31.10739,-0.62622 48.76706,47.66022 49,72.87891 7.40686,-8.6507 6.02029,-15.49023 5,-26 25.50165,10.96301 32.37225,41.5885 15.4043,63 -10.39344,13.11523 -25.50385,18.87518 -41.4043,22 10.87415,-12.11218 20.37598,-19.461 21,-37 -5.84869,7.4314 -9.81167,16.0357 -17.07812,22.35156 -16.66751,14.48706 -43.32886,17.10181 -63.92188,10.64844 7.04333,-6.34863 14.93884,-11.06812 17.25195,-21 1.604,-6.88721 -4.12813,-13.95215 -2.44921,-19.77539 1.01331,-3.51459 5.45367,-6.10877 8.19726,-8.22461 9.90195,8.7359 20.17145,11.19312 33,10 v -2 c -12.40332,-1.28851 -36.42456,-13.56811 -31.03516,-29.86133 2.98258,-9.01696 12.65418,-13.47827 15.03516,-24.13867 -14.27313,10.65454 -25.81271,21.01507 -45,16.76758 -8.63089,-1.91059 -21.94825,-9.96265 -16.37305,-20.70508 3.93914,-7.58997 15.54419,-9.08007 22.37305,-13.17578 10.19574,-6.11505 18.26639,-15.50928 31,-15.76563 z m 211.51172,23.60157 c 15.06495,-0.32934 31.17414,2.75657 41.48828,9.27734 v 1 c -18.69287,9.23218 -49.3335,6.70465 -66,-6 6.80953,-2.65304 15.47275,-4.07974 24.51172,-4.27734 z m -403.51172,9.27734 c -4.7081,0.0435 -9.33928,0.52899 -14,1.19531 -4.53199,0.64789 -31.078423,6.62843 -16.755858,14.50196 8.246008,4.53315 26.743718,-9.14759 30.755858,-15.69727 z m 106.85938,14.67969 c 7.60885,-0.0466 15.44786,0.69708 20.14062,0.91992 6.92433,0.32873 12.58115,6.38995 19,8.6582 7.01019,2.47724 21.90657,-0.30285 27.17774,4.00196 7.53653,6.1549 -4.15241,16.46875 -9.17774,18.83203 -17.59577,8.27472 -37.82535,9.90912 -57,8.82812 -16.86285,-0.95062 -37.12025,-23.2265 -18.90039,-37.41797 3.77186,-2.93792 11.15091,-3.77566 18.75977,-3.82226 z m 622.14062,10.32031 c 15.64661,0.29779 32.5788,1.90161 47,8.34961 27.52325,12.30621 39.97394,40.70221 40,69.65039 0.0104,11.58075 2.84009,32.00848 -8.18555,39.73438 -6.53668,4.58042 -15.29516,3.8125 -22.81445,4.48242 -18.20624,1.62207 -36.71814,0.79956 -55,0.7832 -7.57019,-0.007 -20.82678,1.11243 -23,-8 30.08612,-5.35168 37.4931,-34.04346 37,-60 24.53577,0 59.56866,-4.52576 69,25 h 1 c -1.27344,-34.44928 -44.11938,-39.76782 -71,-34 z m -658,3 c -2.63805,16.71155 9.02815,21.0351 15.70703,33.48047 2.11466,3.94043 0.69959,10.99286 1.29297,15.51953 -31.33423,-8.03296 -96.49877,-20.50439 -101,27 4.0022,-5.79663 7.15169,-11.88721 13.00781,-16.11523 16.21377,-11.706 44.20803,-9.22406 62.99219,-6.94336 8.92479,1.08362 24.08933,2.127 30.39649,9.40429 5.52532,6.37512 2.60351,21.71875 2.60351,29.6543 0,6.67261 0.93785,14.68731 -2.125,20.87109 -3.88451,7.84265 -16.51671,7.12677 -23.875,7.12891 -18.27702,0.005 -36.80066,0.87635 -55,-0.7832 -7.41267,-0.6759 -16.64183,-0.0432 -22.79687,-5.00196 -9.58918,-7.72546 -6.92864,-26.39856 -7.3418,-37.21484 -0.55705,-14.58362 1.02269,-30.99182 8.10156,-44 14.6577,-26.93506 50.02985,-32.98669 78.03711,-33 z m 88.22852,31.82227 c 0.56771,-0.0162 1.12374,0.007 1.66406,0.0801 11.26758,1.52417 3.4715,17.76404 -0.98047,21.79297 -10.22982,9.25781 -26.70906,11.7406 -39.91211,9.53907 -7.27049,-1.21228 -32.14889,-14.57264 -18.43359,-23.97461 4.16323,-2.85395 12.61544,-1.2555 17.43359,-1.25977 9.4677,-0.009 18.72137,-1.49213 28,-3.2832 3.71047,-0.71623 8.25455,-2.78096 12.22852,-2.89453 z m -51.22852,40.17773 3,1 c 1.87779,20.15845 7.04359,36.5174 15,55 l -20,5 1,-38 z m 573,40 c 12.6886,3.51111 10.92157,9.26709 13,21 l -20,-5 z"/></svg>
              MalamCult
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
              <svg viewBox="-149.836912 -1290.2398171999998 1018.6758239999999 2656.6358783999995" className="w-5 h-5 fill-current"><path fill="currentColor" d="m 558.36328,200.9019 -4.08008,2.29297 -4.08203,2.29297 -1.53515,3.23828 -1.53711,3.23828 v 1.97265 1.97266 l 1.39062,3.875 1.39063,3.87695 4.02148,6.83203 4.01953,6.83204 1.73047,6.39648 1.73242,6.39453 -1.15625,5.75586 -1.15625,5.75586 -3.42383,5.15625 -3.42382,5.1582 -5.17579,4.35938 -5.17578,4.35937 -4.63672,3.88672 -4.63671,3.88867 -4.19727,4.88086 -4.19726,4.88281 -3.05274,6.23047 -3.05273,6.23047 -1.10938,6 -1.10742,6 0.63477,7 0.63476,7 2.94141,6 2.93945,6 1.52344,2.05274 1.52344,2.05078 -9.72852,2.73437 -9.72852,2.73633 -10.14257,4.84375 -10.14063,4.84375 -6.37109,4.30078 -6.36914,4.30078 -6.86133,6.56836 -6.86133,6.56836 -4.27148,6 -4.26954,6 -3.02539,6.03516 -3.02343,6.03515 -2.34375,7.46485 -2.34375,7.46484 0.01,12.5 0.0117,12.5 1.75586,5.71289 1.75781,5.71289 0.5293,1.38086 0.53125,1.38281 -23.29883,0.67188 -23.29687,0.67383 -17.5,1.05078 -17.5,1.05273 -9.00977,1.80078 -9.00976,1.80274 -7.49024,3.13281 -7.49023,3.13281 -6.60743,4.96875 -6.60742,4.96875 -3.68945,4.50196 -3.68945,4.5039 -4.41407,8.29493 -4.41211,8.29492 -2.55664,10.48047 -2.55859,10.47851 -1.16797,21.28516 -1.16601,21.28515 -5.91211,-5.78515 -5.91211,-5.78516 -10.47852,-12.48242 -10.47851,-12.48242 -8.32032,-12.51758 -8.32031,-12.51758 -5.08398,-9.54492 -5.08399,-9.54492 3.58985,-5.32813 3.58789,-5.32812 2.33398,-5.27539 2.33203,-5.27735 1.54297,-5.34961 1.54297,-5.35156 1.54101,-12 1.53907,-12 1.56054,-5.44726 1.5586,-5.44922 3.05664,-6.05078 3.05469,-6.05274 2.59961,-3.5 2.59961,-3.5 6.39843,-7.95117 6.39844,-7.94922 1.83984,-4.05078 1.83985,-4.04883 0.0215,-4.30078 0.0215,-4.29883 -1.46485,-2.83203 -1.46289,-2.83008 -3.01172,-2.5332 -3.00976,-2.5332 -3.63086,-1.19922 -3.63086,-1.19727 -5.81055,0.41992 -5.81054,0.41993 -6.83399,3.43554 -6.83398,3.4336 -7,7.08398 -7,7.08203 -6.51368,10.90625 -6.51367,10.9043 -2.8457,1 -2.8457,1.00195 -2.30469,-2.89062 -2.30469,-2.89063 -3.95312,-8.08984 -3.95313,-8.0918 -4.72851,-13 -4.73047,-13 -6.29297,-18 -6.29492,-18 -3.16211,-8 -3.16211,-8 -3.55469,-5.22851 -3.55469,-5.23047 -5.41406,-2.64844 -5.41406,-2.64844 -4.48828,0.50586 -4.49024,0.50586 -3.33008,2.28125 -3.32812,2.28125 -2.41016,3.51563 -2.41015,3.51367 -0.34375,9.23633 -0.34375,9.23828 2.00586,7.83984 2.0039,7.83789 0.68164,2 0.68164,2 -5.21289,-9.5 -5.21289,-9.5 -4.26172,-6.59961 -4.26172,-6.59765 -3.46484,-3.46485 -3.46484,-3.46484 -3.90235,-1.86719 -3.90429,-1.86719 -4.583988,-0.0117 -4.583984,-0.0117 -4.484376,2.6289 -4.486328,2.62891 -1.929687,4.28711 -1.931641,4.28906 0.0293,6.02539 0.0293,6.02539 2.408203,7.5 2.40625,7.5 11.064453,22.1211 11.062508,22.12304 -16.130867,-15.64844 -16.128906,-15.64843 -5.371094,-2.94336 -5.369141,-2.94141 -6.074218,-0.0312 -6.074219,-0.0312 -3.78125,2.88086 -3.783203,2.88281 -1.392578,3.33594 -1.394532,3.33594 v 4.52148 4.52149 l 1.927735,5.07422 1.929687,5.07617 4.263672,5.68554 4.263672,5.68555 5.572266,6 5.572265,6 1.775391,2.12305 1.77539,2.12305 -5.289062,-2.54883 -5.291016,-2.54688 -5.15625,-0.4414 -5.158203,-0.44141 -4.195312,2.35742 -4.197266,2.35938 -1.896484,3.71679 -1.896485,3.71875 0.0098,3.78907 0.0098,3.79101 2.333984,5 2.335937,5 6.449219,6 6.449219,6 14.457031,10.45703 14.455078,10.45703 5.548828,5.54297 5.548828,5.54297 5.328126,10.5 5.328118,10.5 5.36719,8.14453 5.36719,8.14649 7.65234,7.14648 7.65235,7.14649 8.10351,3.86718 8.10352,3.86914 5.29882,1.08985 5.29883,1.08984 h 6.36328 6.36328 l 6.68946,12.71094 6.68945,12.71094 7.54102,12.53906 7.54101,12.53906 9.21485,14 9.21484,14 8.9707,12 8.97071,12 9.33203,11.5 9.33008,11.5 19.35156,19.38867 19.35156,19.38867 -0.67383,23.99805 -0.67383,23.99805 -2.27734,-4.48242 -2.27734,-4.48242 -5.81055,-5.31641 -5.80859,-5.31445 -5,-2.20899 -5,-2.20898 -5.29883,-1.13086 -5.29883,-1.12891 -38.20117,0.0117 -38.20117,0.0117 -5.24414,1.39648 -5.24415,1.39649 -4.75585,2.28125 -4.75586,2.28125 -6.08789,6.06054 -6.0879,6.06055 -2.4121,6 -2.41211,6 v 23.5 23.5 l 1.77148,3.24024 1.76953,3.24023 2.64258,1.73047 2.64062,1.73047 9.8379,0.39648 9.83789,0.39453 v 32.2168 32.2168 l 0.66601,0.66601 0.66797,0.66797 h 3.72656 3.72657 l 0.60546,-1.58203 0.60743,-1.58203 v -31.41797 -31.41797 h 55.11718 55.11524 l -0.36524,18.71484 -0.36718,18.71485 2.80273,0.99609 2.80274,0.9961 1.69726,-1.06836 1.69727,-1.06836 0.63476,-5.39258 0.63672,-5.39258 1.125,-50.5 1.12305,-50.5 0.60937,-14.18945 0.60742,-14.1875 6.13086,5.10351 6.13282,5.10352 -0.0293,0.58398 -0.0293,0.58594 -1.35742,8.97656 -1.35547,8.97852 0.56055,12.02148 0.56055,12.02344 2.5,9.67578 2.49804,9.67578 4.43555,8.92578 4.43555,8.92579 4.31836,5.89843 4.31836,5.89844 6.41601,6.24805 6.41797,6.25 8.27148,5.5039 8.27149,5.50391 7.38476,3.40039 7.38282,3.40039 10,3.04883 10,3.04883 7.5,1.5039 7.5,1.50391 12,1.17578 12,1.17578 20.5,-0.5664 20.5,-0.56836 20.5,-2.28321 20.5,-2.2832 34.5,0.041 34.5,0.0391 42.5,4.12109 42.5,4.1211 16,1.30664 16,1.30859 38,-0.0254 38,-0.0254 14.69921,-1.75586 14.69922,-1.75391 14.30078,-2.5 14.30079,-2.5 12,-3.02148 12,-3.02148 11.5,-3.83399 11.5,-3.83203 9.36523,-4.2207 9.36524,-4.22071 8.92578,-5.0957 8.92578,-5.0957 8.6582,-7.04883 8.6582,-7.04883 6.55078,-7.60156 6.55079,-7.60156 3.61914,-6.15625 3.62109,-6.15625 0.60547,5.75781 0.60351,5.75781 0.63868,29.5 0.63672,29.5 1.41015,2.25 1.41211,2.25 h 2.4043 2.40625 l 1.58789,-1.58789 1.58789,-1.58789 -0.67383,-17.91211 -0.67187,-17.91211 h 54.65627 54.6562 v 31.79883 31.80078 l 1.1992,1.19922 1.2012,1.20117 h 3.0996 3.0996 l 1.2012,-1.20117 1.1992,-1.19922 v -31.70312 -31.70313 l 9.4297,-0.34766 9.4277,-0.3457 2.8223,-2.08984 2.8203,-2.08985 1.5,-2.91015 1.5,-2.91016 v -24 -24 l -3.1191,-6.5 -3.1211,-6.5 -4.8789,-4.81836 -4.8809,-4.8164 -6,-2.82813 -6,-2.82812 -5.2988,-1.10352 -5.2989,-1.10547 h -37.7421 -37.7403 l -5.72651,1.49219 -5.72657,1.49023 -4.88086,2.47266 -4.88086,2.47461 -4.98828,4.85742 -4.98828,4.85938 -1.95117,3.80273 -1.95117,3.80469 -0.64844,-23.78125 -0.64844,-23.78125 10.66211,-10.09571 10.66211,-10.0957 10.94136,-12 10.9395,-12 9.166,-11.5 9.166,-11.5 6.543,-9 6.5429,-9 7.1583,-10.69336 7.1582,-10.69336 10.3418,-17.30664 10.3417,-17.30664 5.9239,-11.23828 5.9238,-11.23828 6.1133,-0.0117 6.1133,-0.0117 5.3867,-0.99414 5.3867,-0.99414 8.3789,-4.11719 8.377,-4.11914 7.9043,-7.55078 7.9023,-7.55078 4.4668,-6.7168 4.4648,-6.71875 5.7754,-10.86914 5.7774,-10.86914 2.3301,-3.13672 2.33,-3.13476 6.6465,-5.41016 6.6465,-5.4082 12.5,-9.09961 12.5,-9.10156 5.7852,-6.06836 5.7871,-6.06641 1.4629,-3.50586 1.4648,-3.50391 v -4.88476 -4.88477 l -2.2695,-3.39843 -2.2696,-3.39649 -3.4804,-1.8125 -3.4805,-1.8125 -5.5625,0.44922 -5.5625,0.45117 -5.3281,2.70117 -5.3281,2.69922 7.8964,-8.83789 7.8965,-8.83789 3.6192,-5 3.6172,-5 2.0058,-4 2.0059,-4 0.7051,-4.23047 0.7031,-4.22851 -1.2031,-3.77149 -1.2051,-3.76953 -2.6309,-2.87305 -2.6289,-2.87304 -3.2187,-1.37696 -3.2168,-1.37695 h -3.2832 l -3.2813,0.002 -6.082,2.87696 -6.0821,2.87695 -9.9179,9.30859 -9.918,9.3086 -6.8105,7.0625 -6.8086,7.06445 0.3222,-1 0.3223,-1 10.6445,-21.5 10.6446,-21.5 2.5937,-8.30273 2.5918,-8.30078 -0.021,-5.19922 -0.022,-5.19727 -1.9004,-4.18359 -1.9003,-4.18555 -4.0938,-2.70898 -4.0918,-2.70899 h -5.4043 -5.4023 l -4.416,2.58789 -4.4161,2.58789 -3.416,3.80469 -3.416,3.80664 -4.1328,7 -4.1309,7 -4.707,8.5 -4.7051,8.5 0.6817,-2 0.6816,-2 2.4063,-9.3789 2.4062,-9.37891 v -5.18945 -5.18946 l -1.4766,-4.97265 -1.4765,-4.97266 -2.7735,-2.65625 -2.7734,-2.65625 -3.7187,-1.55273 -3.7168,-1.55274 -3.2832,0.0215 -3.2813,0.0215 -4.0078,1.82227 -4.0098,1.82031 -3.4121,3.88672 -3.4121,3.88672 -3.2129,7.01953 -3.2148,7.02148 -7.6699,22 -7.67,22 -5.5234,14.56641 -5.5234,14.56445 -4.2188,7.93555 -4.2187,7.93359 -2.4532,0.24219 -2.4531,0.24414 -1.5977,-1.24414 -1.5976,-1.24219 -5.9024,-9.89648 -5.9023,-9.89649 -6.8262,-7.33008 -6.8261,-7.33007 -8.1739,-4.10743 -8.1738,-4.10742 -7.08982,0.34571 -7.08984,0.34375 -4.13281,2.73437 -4.13086,2.73438 -1.7168,3.25586 -1.7168,3.2539 -0.0195,5 -0.0176,5 2.73633,5 2.73633,5 5.53516,6.5 5.53515,6.5 3.95117,6 3.95119,6 2.9589,7.65234 2.961,7.6543 1.4687,11.86719 1.4688,11.86719 1.0449,4.66406 1.0449,4.66406 2.1621,5.77735 2.1621,5.77929 2.9493,5.03711 2.9472,5.03711 1.5762,1.77149 1.5742,1.77148 -1.7695,3.72852 -1.7676,3.72851 -6.5586,11 -6.5586,11 -6.9707,9.85938 -6.97066,9.85937 -7.28125,8.64063 -7.2832,8.64062 -6.96484,7.5 -6.9668,7.5 -0.69141,-16.5 -0.69336,-16.5 -0.92773,-7.89844 -0.92578,-7.89843 -1.59961,-6.60157 -1.59766,-6.60156 -4.51172,-9.41211 -4.51172,-9.41211 -7.73828,-7.73633 -7.73828,-7.73828 -9.41015,-4.51562 -9.41211,-4.51758 -7,-1.51953 -7,-1.51953 -9.5,-1.00781 -9.5,-1.00977 -16.5,-0.58008 -16.5,-0.58203 -9.25,-0.56836 -9.25,-0.56836 v -8.5918 -8.59375 l -1.59571,-6.56445 -1.59375,-6.5625 -3.96093,-8.30469 -3.96094,-8.30664 -7.19336,-7.57617 -7.19531,-7.57617 -5.87891,-3.99219 -5.87695,-3.99219 -7.31641,-3.38085 -7.31445,-3.38086 -9.30664,-2.49024 -9.30664,-2.49219 -6.5,-0.58593 -6.5,-0.58594 -1.125,-0.33789 -1.12305,-0.33985 1.43164,-5.32812 1.43164,-5.33008 -0.40039,-14 -0.40039,-14 -2.77539,-8.5 -2.77735,-8.5 -3.79296,-7.55469 -3.79297,-7.55273 -6.00391,-8.94727 -6.00195,-8.94531 -8.91211,-10 -8.91016,-10 -8.92383,-8.08203 -8.92382,-8.08203 -8,-6.31641 -8,-6.31445 -11.5,-7.69922 -11.5,-7.69726 -11,-5.99414 -11,-5.99219 -9.31641,-4.19141 -9.31836,-4.1914 -7.18164,-2.40039 -7.18359,-2.40039 -8,-2.15625 -8,-2.15625 -9.13282,-0.54297 z m 3.65039,10.84179 8.8086,1.26172 8.80664,1.25977 13.90429,4.61523 13.90625,4.61328 13.59375,6.74219 13.59571,6.74414 12.55664,7.88282 12.55468,7.88476 10.38868,7.95703 10.38867,7.95703 11.3457,10.90039 11.3457,10.90235 6.29297,7.59765 6.29102,7.59961 4.0332,6 4.03125,6 3.63281,7.2168 3.63086,7.2168 2.63672,7.7832 2.63477,7.7832 0.47265,11.5 0.47266,11.5 -1.64453,7 -1.64453,7 -3.89453,8 -3.89649,8 -5.60156,6.70313 -5.60156,6.70312 -7.97657,6.00977 -7.97656,6.01172 -7.23633,4.26367 -7.23632,4.26367 -12.90235,5.21094 -12.90234,5.20898 -1.44531,1.44531 -1.44532,1.44532 1.13282,2.11718 1.13281,2.11719 h 2.58789 2.58789 l 10.45312,-3.49805 10.45313,-3.49804 10.67383,-5.49024 10.67578,-5.48828 6.98242,-5.26367 6.98438,-5.26172 5.87304,-6 5.87305,-6 5.14258,-7.88086 5.14453,-7.88086 8,0.58594 8,0.58398 8,2.05079 8,2.05078 9,4.35351 9,4.35352 6,4.53906 6,4.53711 3.20703,3.99219 3.20703,3.99218 3.4668,6.36133 3.4668,6.36133 1.7539,6 1.75196,6 -0.004,10 -0.004,10 -3.13672,9 -3.13476,9 -3.53906,2.8457 -3.53711,2.84766 v 2.20313 2.20312 l 1.19921,1.19922 1.20118,1.20117 h 2.7207 2.71875 l 8.83008,3.11524 8.83008,3.11718 8.5,4.27344 8.5,4.27344 6.09179,4.49219 6.09375,4.49218 5.73828,5.86719 5.74024,5.86914 4.63867,6.96484 4.63672,6.96485 3.25195,8.6543 3.25,8.65625 1.15625,7.3789 1.1543,7.38086 -0.60352,10 -0.60546,10 -1.61133,6 -1.61328,6 -3.3086,7.17383 -3.31055,7.17578 -3.06835,4.46094 -3.07032,4.46289 -5.08984,5.56836 -5.08984,5.56836 1.0957,2.04492 1.09375,2.04492 h 2.28711 2.28711 l 3.92773,-2.97266 3.92774,-2.97265 1.30078,-0.0274 1.30078,-0.0273 9.69922,4.10547 9.69922,4.10547 7.86523,4.64453 7.86719,4.64453 8.12695,6.50586 8.12891,6.50586 6.82422,8.49414 6.82421,8.49414 4.4668,9 4.4668,9 1.49023,5.5 1.48828,5.5 0.5918,10 0.59375,10 -1.49023,8.51367 -1.49024,8.51367 -3.23633,7.77735 -3.23828,7.77539 -4.92187,7.54102 -4.92383,7.54101 -7.2168,7.20703 -7.21679,7.20508 -10.07618,6.70117 -10.07812,6.70117 -10.53711,4.96875 -10.53711,4.97071 -12.88672,4.40234 -12.88476,4.40234 -13,3.10547 -13,3.10743 -12,2.03124 -12,2.03321 -14,1.58594 -14,1.58789 -33,0.32812 -33,0.33008 -13,-0.87305 -13,-0.87109 -19,-1.58984 -19,-1.58985 -24.5,-2.39453 -24.5,-2.39453 -16.24024,-1.18164 -16.23828,-1.18164 -27.26172,0.5332 -27.25976,0.5332 -19,2.27735 -19,2.27539 -27,0.0625 -27,0.0625 -12,-2.29688 -12,-2.29687 -10.17188,-3.39844 -10.17187,-3.39844 -6.32813,-3.1914 -6.32812,-3.18946 -6,-4.05468 -6,-4.05274 -5.86719,-5.55859 -5.86719,-5.56055 -4.40625,-6.16016 -4.40625,-6.16015 -3.53125,-7.64063 -3.5293,-7.64257 -2.10156,-7.69922 -2.09961,-7.69727 -0.0351,-16 -0.0352,-16 2.13867,-8.61719 2.14063,-8.61718 3.91601,-9.08399 3.91602,-9.08398 4.5664,-7.29883 4.56641,-7.29883 5.56055,-6.71484 5.55859,-6.71289 7.75781,-6.61914 7.75782,-6.6211 8,-4.82422 8,-4.82617 5.875,-2.58984 5.87304,-2.5918 h 0.97461 0.97266 l 8.15234,3.98438 8.15235,3.98437 4.67187,1.20117 4.67383,1.20313 1.625,-1.34961 1.625,-1.34961 -0.29688,-2.08594 -0.29882,-2.08594 -8.7793,-4.50195 -8.78125,-4.5 -5.04297,-4 -5.04297,-4 -4.57226,-6 -4.57032,-6 -2.84961,-6.03516 -2.84961,-6.0371 -2.13281,-8.43946 -2.13476,-8.4375 0.51172,-11.52539 0.51171,-11.52539 3.09766,-9.5 3.09961,-9.5 4.76758,-8.42383 4.76758,-8.42578 9,-9.18359 9,-9.18164 6.36914,-4.26172 6.37109,-4.26172 10.12891,-4.82422 10.13086,-4.82617 8.86132,-2.55664 8.86329,-2.55469 h 2.48828 2.48828 l -5.26563,5.75 -5.26757,5.75 -2.92774,4 -2.92969,4 -3.54492,7 -3.54297,7 -1.90429,5.5 -1.90235,5.5 -1.02539,4.5 -1.02344,4.5 -0.92382,8 -0.92579,8 1,8.0957 1,8.09571 2.05079,7.90429 2.04882,7.9043 3.88672,8.07813 3.88672,8.07617 5.49024,7.01758 5.49023,7.01757 7.31445,5.59375 7.31446,5.5918 7.5,3.54688 7.5,3.54687 8,2.13477 8,2.13672 13.5,0.1289 13.5,0.13086 8,-1.85547 8,-1.85351 6.88476,-2.90821 6.88477,-2.9082 6.80664,-4.52539 6.80664,-4.52539 6.30859,-6.8457 6.3086,-6.84375 3.35547,-5.58789 3.35351,-5.58985 2.43945,-6.03515 2.4375,-6.03711 2.00586,-7.74219 2.00586,-7.74219 0.59375,-12.05078 0.59375,-12.04883 -1.17773,-2.20117 -1.17774,-2.19922 h -2.26562 -2.26367 l -1.20118,1.19922 -1.19921,1.20117 v 4.57617 4.57813 l -10.25,-0.90039 -10.25,-0.90039 -48.5,-0.12696 -48.5,-0.12695 -17.07032,0.85547 -17.07031,0.85742 0.74024,-6.92773 0.74023,-6.92774 1.68164,-5.78515 1.68164,-5.78516 2.49219,-5.64453 2.49219,-5.64453 4.375,-6.58789 4.375,-6.58594 7.78125,-7.41406 7.78125,-7.41602 7,-4.13672 7,-4.13672 6.1289,-2.57226 6.12891,-2.57422 7.87109,-2.01953 7.8711,-2.01758 9,-1.01172 9,-1.00976 5.16797,-0.01 5.16796,-0.008 1.58204,-0.60547 1.58203,-0.60742 v -2.19336 -2.19336 l -1.19922,-1.19922 -1.20117,-1.20117 -11.54883,0.008 -11.55078,0.01 -6.5,1.03906 -6.5,1.03906 -7,2.05469 -7,2.05469 -7.5,3.54882 -7.5,3.54688 -11.5,1.17773 -11.5,1.17969 -3.87305,-4 -3.875,-4.00195 -2.84375,-6.01172 -2.84375,-6.01367 -1.1543,-5.56446 -1.15625,-5.56445 0.48438,-9 0.48633,-9 2.5664,-7.33594 2.56836,-7.33398 3.32031,-5.55469 3.32032,-5.55469 7.21093,-7.70898 7.21094,-7.70898 7.57617,-5.23633 7.57617,-5.23828 9.59766,-4.48438 9.59766,-4.48437 11.11523,-3.01368 11.11524,-3.01367 15.1875,0.1211 15.18554,0.12109 9.46875,-1.52344 9.47071,-1.52344 8.33398,-2.63281 8.33399,-2.63476 8.31445,-3.83985 8.3125,-3.83984 5.94531,-3.61328 5.94727,-3.61133 v -2.37891 -2.37695 l -1.70899,-0.95703 -1.71094,-0.95703 -6.53906,3.26562 -6.54101,3.26758 -8,3.12891 -8,3.1289 -9.5,2.50782 -9.5,2.50781 -10.52539,1.14258 -10.52344,1.14257 -7.63477,-0.71679 -7.63672,-0.71485 -4.02929,-3.44921 -4.0293,-3.44922 -2.81055,-5.72266 -2.81054,-5.72461 0.0176,-7 0.0195,-7 1.24414,-4.15625 1.24609,-4.15625 4.13281,-6.18945 4.13282,-6.18945 11.20703,-9.33008 11.20703,-9.33008 3.52734,-5.32422 3.52734,-5.32422 1.52149,-4.5 1.52148,-4.5 0.67969,-4.54101 0.67969,-4.53906 -1.14844,-6.33008 -1.14648,-6.33008 -2.36719,-5.35156 -2.36719,-5.35157 -3.0664,-4.45703 -3.06641,-4.45898 -0.25195,-2.17774 -0.25,-2.17968 1.69336,-1.10157 z m -417.43945,96.41797 h 3.20117 3.19922 l 3.10742,3.10547 3.10547,3.10547 1.58789,3.07422 1.58984,3.07226 3.97461,10.57032 3.97266,10.57226 6.44531,18.33984 6.44727,18.33985 4.03515,10.66015 4.03321,10.66016 4.33008,8.17969 4.33203,8.17969 -5.6543,2.76172 -5.65234,2.76171 -5.0586,5.0586 -5.06054,5.05859 -3.61719,7.23633 -3.61719,7.23828 -1.19531,5.75781 -1.19531,5.75782 0.45898,9.51562 0.45703,9.51367 1.13672,2.12305 1.13672,2.12109 1.6543,0.63477 1.65429,0.63476 1.44727,-1.20117 1.44726,-1.20117 -0.67187,-8.06641 -0.66992,-8.06445 1.01562,-5.5 1.01758,-5.5 2.15039,-5.74414 2.14844,-5.74414 4.41601,-5.41992 4.41602,-5.42188 6.06836,-3.03125 6.06641,-3.0332 4.69726,-0.60742 4.69727,-0.60742 2.27539,-0.47071 2.27539,-0.4707 3.87695,-3.50391 3.87695,-3.50195 5.33594,-9.22266 5.33594,-9.2207 6.53515,-6.5 6.53321,-6.5 4.96094,-2.4375 4.96289,-2.4375 5.01562,-0.41016 5.01563,-0.4121 2.75,2.17187 2.75,2.16992 v 3.89453 3.89454 l -7.82227,9.7832 -7.82226,9.7832 -3.04102,4.5 -3.04102,4.5 -2.0332,4.00586 -2.0332,4.00781 -2.08399,6.34961 -2.08398,6.35156 -1.54297,12.14258 -1.54297,12.14258 -2.06836,7 -2.06836,7 -3.40234,6.5 -3.40039,6.5 -4.53516,5.5 -4.53515,5.5 0.27734,2.5 0.2793,2.5 3.19531,0.3086 3.19531,0.31054 4.96485,9.20703 4.96484,9.20899 6.91797,10.48242 6.91992,10.48242 7.99609,10 7.99414,10 9.50586,10.5 9.50782,10.5 11.71484,10.44141 11.71484,10.4414 9.73047,7.5586 9.73047,7.55859 9.97461,6.56836 9.97266,6.57031 8.72265,4.92969 8.72266,4.93164 0.006,0.5 0.006,0.5 -5.56446,3.98633 -5.56445,3.98828 -8.22851,8.53516 -8.22852,8.53515 -5.29883,7.47657 -5.29883,7.47851 -4.74218,9.61524 -4.74219,9.61523 -1.0918,3.13477 -1.09375,3.13476 h -0.81054 -0.8086 l -12.49219,-10.74023 -12.49218,-10.74024 -12.53125,-12.5625 -12.5293,-12.56445 -9.9043,-11.44531 -9.90429,-11.44727 -10.46289,-14 -10.46485,-14 -8.79297,-13.13672 -8.79297,-13.13672 -8.89453,-14.86328 -8.89258,-14.86328 -5.16601,-9.58984 -5.16406,-9.58985 v -0.5664 -0.56446 l 4.5,-2.63671 4.5,-2.63672 v -2.33594 -2.33594 l -1.38868,-1.15234 -1.38867,-1.15235 -7.53711,2.5293 -7.53711,2.53125 h -7.46875 -7.46875 l -6.42773,-1.98633 -6.42773,-1.98437 -5.92774,-3.86133 -5.92773,-3.85937 -5.19141,-5.53321 -5.19141,-5.53125 -4.39257,-6.87304 -4.39454,-6.8711 -5.63671,-10.5957 -5.636723,-10.59766 -7.300781,-6.90234 -7.300782,-6.9043 -8.976562,-6.42773 -8.978516,-6.42969 -8.326172,-6.43555 -8.326172,-6.43554 -2.923828,-4.03516 -2.923828,-4.03711 v -3.65039 -3.64844 l 1.199219,-1.20117 1.201172,-1.19922 h 4.197265 4.199219 l 5.351563,2.82031 5.351562,2.82227 17.5,11.29687 17.500004,11.29688 0.34179,0.30664 0.3418,0.30664 -1.30859,3.61914 -1.308598,3.61914 1.06836,1.70703 1.070308,1.70508 2.01172,0.30078 2.01172,0.30274 4.83399,-7.80274 4.83203,-7.80078 6.05273,-6.39258 6.05274,-6.39258 7.33984,-5.46484 7.3418,-5.46289 9.6582,-4.44922 9.66016,-4.45117 1.5,-0.79492 1.5,-0.79688 0.30664,-2.05078 0.30664,-2.05078 -1.95313,-1.36914 -1.95312,-1.36914 -6.21485,-19.97656 -6.21484,-19.97852 -3.93945,-13 -3.93946,-13 -1.11132,-7.13672 -1.10938,-7.13672 1.30274,-4.65625 1.30273,-4.65625 2.08203,-1.45703 z m 962.70898,0 h 2.9883 2.9883 l 1.9238,1.0293 1.9238,1.0293 1.5098,2.92187 1.5117,2.91992 -0.025,5.79883 -0.023,5.80078 -1.0098,4.5 -1.0098,4.5 -4.5546,15 -4.5547,15 -5.375,17 -5.375,17 -2.0996,1.29688 -2.0996,1.29882 0.3144,2.09961 0.3125,2.09961 1.5,0.76953 1.5,0.76954 10.5,4.99023 10.5,4.99219 6.5,4.94336 6.5,4.94531 6.6602,7.07031 6.6582,7.07031 4.205,7.07618 4.2051,7.07812 h 2.3496 2.3516 l 1.0586,-1.97851 1.0586,-1.97657 -1.4883,-3.55859 -1.4863,-3.56055 14.7129,-9.6289 14.7148,-9.62891 7.5,-4.49805 7.5,-4.49804 5.002,-0.43946 5.0019,-0.43945 1.8672,2.0625 1.8672,2.06445 -0.6973,3.70899 -0.6953,3.71093 -6.1719,6.10938 -6.1738,6.10742 -11,7.91797 -11,7.91602 -7.1738,5.80664 -7.1739,5.80664 -3.3261,3.89648 -3.3262,3.89649 -5.7148,10.89453 -5.7149,10.89453 -4.9277,7.01562 -4.9277,7.01758 -5.8575,5.7461 -5.8574,5.74804 -8.3398,4.15039 -8.3379,4.15039 -9.1621,0.38282 -9.1602,0.38086 -7.916,-2.53516 -7.916,-2.53516 -1.8946,1.01368 -1.8945,1.01367 0.3106,2.14843 0.3105,2.14844 3.1289,2.0332 3.1309,2.03516 1.6367,1 1.6367,1 -7.3457,13.07422 -7.3476,13.07227 -6.8321,11.42773 -6.8301,11.42578 -11.4726,17 -11.4707,17 -8.0371,10.5 -8.0371,10.5 -8.545,10 -8.54488,10 -12.53516,12.84961 -12.53515,12.85156 -5.64844,4.91016 -5.64844,4.91016 -3.24414,-5.76172 -3.24414,-5.75977 -4.26953,-5.5 -4.26953,-5.5 -6.33789,-6.13086 -6.33789,-6.13086 -7.89649,-5.76758 -7.89648,-5.76757 -9.05469,-4.78125 -9.05469,-4.78321 3.33203,-1.82031 3.33399,-1.81836 14.61719,-9.65039 14.61914,-9.64844 11,-8.79492 11,-8.79297 16.61718,-16.55664 16.61914,-16.55664 8.31055,-10.5 8.31252,-10.5 8.5703,-13.06836 8.5703,-13.07031 4,-7.71094 4,-7.71094 1.8242,0.45508 1.8242,0.45703 1.9258,-1.92578 1.9258,-1.92578 v -0.93945 -0.93945 l -3.8809,-4.48438 -3.8808,-4.48438 -3.6621,-6.02734 -3.6621,-6.0293 -2.4766,-7.28125 -2.4766,-7.2832 -1.541,-12.01562 -1.541,-12.01563 -1.5117,-6 -1.5117,-6 -3.3906,-7 -3.3907,-7 -6.78708,-8.83789 -6.78711,-8.83594 -3.75,-5.08398 -3.75,-5.08399 v -2.24804 -2.2461 l 0.62109,-1.61914 0.62109,-1.61914 2.83008,-1.46289 2.82813,-1.46289 3.80078,0.01 3.79883,0.01 5.03709,2.34571 5.0352,2.34375 6.2129,5.75195 6.2109,5.75 6.918,11.14453 6.916,11.14453 2.3359,2.125 2.334,2.125 2,1 2,0.99805 5.5566,0.67383 5.5567,0.67382 5.2305,2.42188 5.2304,2.42383 4.8828,5.01367 4.8829,5.01367 2.4531,5.26563 2.4531,5.26562 1.2637,5.4043 1.2636,5.4043 -0.5429,9.86132 -0.543,9.85938 2.0274,1.08594 2.0292,1.08593 1.9688,-1.9707 1.9707,-1.96875 1.0195,-8 1.0215,-7.99805 -1.2187,-7.23047 -1.2188,-7.22851 -4.0664,-8.15235 -4.0664,-8.15234 -5.6133,-5.5 -5.6133,-5.5 -5.1113,-2.37305 -5.1094,-2.37304 3.2969,-5.62696 3.2988,-5.62695 3.502,-8.5 3.5039,-8.5 11.2207,-31.5 11.2227,-31.5 2.4414,-5.24219 2.4433,-5.24218 3.0098,-3.00782 z m 57.6992,6.76172 2.5723,2.57422 2.5742,2.57226 v 5.35157 5.35156 l -2.1426,6.44336 -2.1425,6.44531 -18.1075,35.74805 -18.1074,35.74805 -1,-0.0547 -1,-0.0527 -4.6797,-3.24023 -4.6797,-3.24024 -5.3203,-2.41601 -5.3203,-2.41406 -0.3535,-0.22657 -0.3535,-0.22461 9.9804,-18.81445 9.9805,-18.8125 9.252,-17.5 9.2519,-17.5 3.2871,-4.5 3.2871,-4.5 2.9278,-2.78711 2.9277,-2.78906 3.582,-0.58008 z m -1068.853494,0.0215 2.480469,0.62305 2.482425,0.62109 3.61132,3.61329 3.61329,3.61328 3.41992,5.3457 3.41992,5.3457 17.98633,33.94141 17.98633,33.94336 v 0.94922 0.94922 l -4.4336,1.69336 -4.43359,1.69336 -6.09961,3.9414 -6.09961,3.94336 h -0.38672 -0.38476 l -6.99219,-13.25 -6.99024,-13.25 -11.60742,-23.43945 -11.60742,-23.4375 -1.982422,-6.41797 -1.982422,-6.41602 v -3.44531 -3.44336 l 1.517578,-2.93555 1.519532,-2.93554 2.480468,-0.62305 z m -42.089844,48.2168 h 2.583985 2.585937 l 4.208985,2.11914 4.210937,2.1211 27.113282,26.95312 27.113282,26.95313 -4.86328,4.99218 -4.86328,4.99414 -2.61914,3.4336 -2.61719,3.43359 h -0.79297 -0.79102 l -19.966793,-20.75 -19.966797,-20.75 -5.492188,-6.3418 -5.492187,-6.34375 -2.189453,-4.38476 -2.191406,-4.38672 -0.558594,-3.44922 -0.560547,-3.44726 2.574219,-2.57422 z m 1145.009738,0 h 2.9668 2.9688 l 2.0722,2.63477 2.0723,2.63476 v 2.66797 2.66992 l -2.5312,5.08008 -2.5332,5.08203 -6.6661,7.86524 -6.6679,7.86523 -18.9746,19.25 -18.9747,19.25 h -0.7109 -0.7109 l -1.5664,-2.39062 -1.5664,-2.39063 -5.7481,-6.20703 -5.7461,-6.20898 26.9473,-26.76954 26.9492,-26.77148 4.2109,-2.13086 z m -369.41989,114.79883 16.5,0.64062 16.5,0.64063 16,1.02734 16,1.0293 7,1.33984 7,1.3418 6.75976,2.54883 6.76172,2.55078 4.33789,2.98437 4.33594,2.98438 5.21484,5.70508 5.21485,5.70508 3.41406,6.78125 3.41406,6.77929 2.03125,7.32032 2.03125,7.32226 0.94141,11 0.94336,11 0.64843,16.56836 0.64844,16.56836 -5.34961,4.81641 -5.34765,4.8164 -8,6.24414 -8,6.24414 -12.5,8.37891 -12.5,8.37891 -7.30664,3.82617 -7.30665,3.82617 3.19922,-6.33398 3.19922,-6.33399 2.27344,-6.67773 2.27344,-6.67578 1.22265,-7.58399 1.22266,-7.58594 -0.55859,-11.23828 -0.56055,-11.23828 -1.59375,-5.85547 -1.59375,-5.85351 -3.16016,-7.5918 -3.16015,-7.5918 -5.72852,-8.55273 -5.72656,-8.55469 -6.84766,-6.57422 -6.84765,-6.57226 -7.91016,-5.31641 -7.91016,-5.31445 -8.08984,-3.7168 -8.08984,-3.7168 -5.31836,-1.74804 -5.31641,-1.7461 0.63281,-1.64843 0.63282,-1.64649 2.18359,-6.35156 z m -405.57813,0.20117 h 13.98047 13.98047 l 0.62109,1.00586 0.62305,1.00781 -1.8125,0.62305 -1.81445,0.625 -10.7168,4.44727 -10.71484,4.44921 -10.38868,6.86133 -10.38867,6.86133 -7.44336,7.37109 -7.44336,7.3711 -4.58593,6.93945 -4.58789,6.9375 -3.60743,7.21094 -3.60937,7.21289 -2.67383,8.78711 -2.67383,8.78906 -0.0684,15 -0.0684,15 2.2461,7.79883 2.24609,7.79883 3.11719,6.20117 3.11523,6.20117 4.02735,5.76172 4.02734,5.76367 -0.4043,0.36719 -0.40429,0.36719 -5.2168,2.61914 -5.2168,2.62109 -1.2832,-0.0215 -1.2832,-0.0234 -5.5,-3.11719 -5.5,-3.11719 -7.89844,-4.54296 -7.89844,-4.54297 -12.01562,-8.43555 -12.01368,-8.43555 -10.43359,-8.5957 -10.43359,-8.5957 0.64843,-16.53516 0.64844,-16.53711 1.01953,-11.96094 1.01953,-11.96093 2.91993,-9.03907 2.92187,-9.03906 2.93945,-5.09375 2.93946,-5.0957 4.96093,-5.4043 4.9629,-5.40625 5.61523,-3.37695 5.61523,-3.37695 6.74024,-2.45118 6.74219,-2.45117 10.5,-1.36719 10.5,-1.36523 24.71093,-1.05664 z m 303.57813,11.76563 -9.28711,1.62304 -9.28711,1.62305 -7.08203,2.47461 -7.08399,2.47461 -6.1289,3.46289 -6.13086,3.46094 -5.72071,4.80664 -5.71875,4.80859 -5.01562,6.29883 -5.01563,6.29687 -3.41406,7.20313 -3.41211,7.20117 -1.74609,7 -1.74805,7 0.0625,10.5 0.0606,10.5 2.10547,8 2.10547,8 4.0957,8.27344 4.0957,8.27539 7.13281,7.65039 7.13282,7.65039 7.29101,4.76758 7.29297,4.76953 7.70703,2.96484 7.70899,2.96289 6,1.08204 6,1.08007 2.5,0.44336 2.5,0.44336 11.5,-0.33594 11.5,-0.33593 8.4082,-2.15821 8.4082,-2.15625 6.4375,-2.91992 6.43946,-2.91992 6.17773,-4.4082 6.17969,-4.41016 6.65234,-7.05078 6.65235,-7.05273 4.58593,-9.3086 4.58789,-9.30664 2.11524,-8.48047 2.11328,-8.48047 -0.52344,-11.01953 -0.52539,-11.01953 -2.58008,-8 -2.57812,-8 -4.4375,-7.55859 -4.4375,-7.55664 -8.51758,-8.06446 -8.51758,-8.0625 -9.32031,-4.58203 -9.32031,-4.58008 -8.48829,-2.13086 -8.48828,-2.1289 -10.51172,-0.53516 z m 18,9.84375 9,2.30859 9,2.30859 5.73437,2.82813 5.73633,2.82812 4.37891,3.01368 4.3789,3.01367 6.41211,6.92383 6.41016,6.92382 2.64062,4.8711 2.63867,4.87109 2.19141,6.81055 2.19141,6.81055 -0.4961,0.49609 -0.49609,0.49414 -21.22852,-1.18164 -21.22851,-1.18359 -42.63086,0.65039 -42.63281,0.65039 -8.72657,0.57812 -8.72656,0.57813 1.57617,-5.35157 1.57422,-5.35156 3.09571,-6.25586 3.09765,-6.25586 4.92188,-6.08203 4.91992,-6.08203 6,-4.41602 5.99805,-4.41601 6.13476,-2.91992 6.13477,-2.91797 8.5,-2.25196 8.5,-2.25195 12.5,-0.0195 z m 24.81054,62.08789 16.70899,0.63086 16.70898,0.63086 1.76758,0.67773 1.76758,0.67773 -0.53906,7.59375 -0.54102,7.5918 -2.69922,7.5 -2.70117,7.5 -2.07813,3.5 -2.08007,3.5 -4.39453,5.66797 -4.39649,5.66602 -5.66601,4.44726 -5.66797,4.44922 -7.36329,3.70508 -7.36523,3.70508 -7.63477,1.95312 -7.63671,1.95313 -10,0.42382 -10,0.42188 -5.96094,-0.9375 -5.96094,-0.93555 -5.47851,-1.59375 -5.48047,-1.59179 -6.5586,-3.31055 -6.56054,-3.3086 -5.6875,-4.42382 -5.68946,-4.42383 -4.11914,-4.93359 -4.11914,-4.9336 -3.35351,-6 -3.35352,-6 -2.01562,-6.61719 -2.01368,-6.61718 -0.68945,-6.9961 -0.68945,-6.99414 2.36523,-0.58203 2.36524,-0.58203 16.13671,-0.69922 16.13672,-0.69727 0.69727,5.06446 0.69531,5.06445 2.85938,6.04688 2.86132,6.04687 4.30665,4.30469 4.30664,4.30469 4.85156,2.27929 4.85156,2.2793 5.53125,1.02148 5.5332,1.02344 5.11719,-0.69336 5.11524,-0.69531 5.24609,-1.95117 5.24805,-1.95117 5.45898,-4.99024 5.45899,-4.99023 2.60351,-5.32227 2.60547,-5.32422 0.5957,-5.76758 z m -208,0.006 16.32032,0.66797 16.32226,0.66992 3.08789,0.61718 3.08789,0.61719 -0.64062,4.11133 -0.63867,4.11328 -1.54297,6 -1.54297,6 -4.32227,9 -4.32226,9 -4.3086,5.1543 -4.31054,5.15625 -5,4.11133 -5,4.11132 -7.71289,4.01563 -7.7129,4.01367 -7.7871,1.99219 -7.78711,1.99219 -10,0.45507 -10,0.45704 -7.76563,-1.47461 -7.76562,-1.47266 -7.84766,-3.02539 -7.8457,-3.02539 -5.88672,-4.08203 -5.88867,-4.08203 -3.35938,-3.14844 -3.36133,-3.14844 -4.82031,-6.80859 -4.82031,-6.8086 -2.99414,-7.1914 -2.99414,-7.19141 -1.79102,-8.70117 -1.78906,-8.70117 0.66406,-0.66602 0.66602,-0.66601 10.79882,-0.83203 10.80079,-0.83204 8.11132,-0.0508 8.11133,-0.0508 0.52735,5.8125 0.52734,5.8125 2.64453,5.2207 2.64649,5.22266 4.06835,4.06836 4.06836,4.06641 5.24219,2.40039 5.24219,2.40039 5.57226,1.11914 5.57227,1.11914 6.21094,-1.09375 6.21094,-1.09375 4.62109,-2.22852 4.62305,-2.22851 5.03906,-5.04883 5.03906,-5.04883 2.30078,-4.93359 2.30274,-4.9336 0.56445,-5.46484 z m 232.66407,116.07226 -1.48829,1.23438 -1.48632,1.23437 v 1.80078 1.79883 l 6.26367,8.32813 6.26562,8.32812 2.98438,6.5 2.98633,6.5 v 7.66406 7.66407 l -3.04493,4.33593 -3.04687,4.33594 -5.95313,3.59766 -5.95507,3.59961 -0.34571,2.3457 -0.34375,2.3457 1.78516,1.30469 1.78711,1.30664 1.05859,-0.01 1.0586,-0.01 5.0664,-2.35937 5.06446,-2.35938 3.72265,-3.26758 3.72266,-3.26953 2.45508,-4.1875 2.45507,-4.18945 1.00586,-5.31055 1.00782,-5.31055 -0.97461,-6.11328 -0.97266,-6.11328 -3.95898,-8 -3.96094,-8 -6.10742,-7.24219 -6.10742,-7.24023 -2.47266,-0.62109 z m -95.03321,8.9961 -23.91797,1.125 -23.91601,1.12304 -15.4961,1.48438 -15.49609,1.48437 -18.80859,2.52149 -18.80664,2.52148 -12,2.0332 -12,2.03321 -18,3.53125 -18,3.5332 -8.79102,2.01758 -8.79297,2.01758 -1.57226,2.40234 -1.57422,2.40039 1.63867,2.5 1.63867,2.5 h 1.38477 1.38672 l 22.34179,-4.47266 22.33985,-4.47265 21,-3.51172 21,-3.51172 16.5,-1.99023 16.5,-1.99024 19,-1.70117 19,-1.69922 28,-0.0645 28,-0.0625 9.94336,1.32812 9.9414,1.32813 7.46875,1.91015 7.4668,1.91016 5.08984,2.3457 5.08985,2.34766 4.75781,3.65234 4.75976,3.6543 h 2.46875 2.4668 l 1.66602,-2.54101 1.66406,-2.54102 -1.0625,-2.33398 -1.06445,-2.33594 -7.61328,-5.0918 -7.61329,-5.0918 -8.04492,-2.54101 -8.04297,-2.54102 -8.625,-1.5039 -8.625,-1.50391 -17.32422,-1.10156 z m -30.42969,30.22851 -14.00585,0.01 -14.00586,0.0117 -13.5,1.4414 -13.5,1.44141 -10.57813,2.05078 -10.58008,2.05078 -5.16015,1.5332 -5.16211,1.53125 -0.6211,2.47852 -0.62109,2.47656 1.23437,1.48633 1.23243,1.48828 h 2.8164 2.81641 l 6.31055,-1.45898 6.3125,-1.45703 16,-2.1875 16,-2.18946 21,-0.10351 21,-0.10352 14.38281,1.92969 14.38281,1.92773 1.36719,-1.86914 1.36719,-1.87109 -0.0156,-1.05859 -0.0156,-1.0586 -0.85547,-1.35156 -0.85742,-1.35156 -5.87696,-1.40235 -5.8789,-1.40234 -12.49414,-1.49609 z m -489.01171,20.83984 37.5,0.34766 37.5,0.3457 5.71875,2.35938 5.71679,2.35937 3.97071,3.40039 3.97265,3.39844 2.81055,5.72461 2.81055,5.72461 0.31836,22.25 0.31835,22.25 h -64.94531 -64.94726 l -1.3711,-1.65234 -1.37304,-1.65235 -0.34571,-17.19921 -0.3457,-17.19727 1.625,-6.34375 1.625,-6.3418 2.62695,-3.55664 2.625,-3.55664 2.09571,-1.78516 2.09375,-1.7871 4.5,-2.34375 4.5,-2.34571 5.5,-1.19922 z m 822.99999,0.66016 h 40.5 40.5 l 5.9414,2.39258 5.9414,2.39453 4.6641,4.66406 4.666,4.66602 2.2168,5.92187 2.2148,5.92188 -0.3222,19.80664 -0.3223,19.80859 -1.5,0.94532 -1.5,0.94726 -64.2305,0.0156 -64.23043,0.0156 -0.63867,-2.54492 -0.63868,-2.54297 0.49219,-18.70703 0.49414,-18.70508 1.78321,-4.93359 1.78125,-4.93164 5.09375,-5.18946 5.09375,-5.1914 6,-2.37696 z m -733.16796,162.03906 -0.002,0.002 c -0.0434,0.0523 -0.14628,0.40257 -0.24609,1.13281 0.22113,-0.64297 0.28175,-1.05999 0.25977,-1.12695 l -0.002,-0.002 v -0.002 l -0.002,-0.002 v -0.002 h -0.002 -0.002 -0.002 z m 783.94926,16.79493 c 0,6.4e-4 0.01,0.002 0.01,0.002 v -0.002 z m 0.01,0.002 c 0.4515,0.33631 0.9412,0.61798 1.2968,0.58398 0.01,-9.8e-4 0.014,-0.004 0.024,-0.008 v -0.002 -0.002 -0.002 -0.002 -0.002 -0.002 -0.002 c -10e-5,-0.002 0,-0.003 0,-0.004 v -0.002 -0.002 c -0.015,-0.0685 -0.2118,-0.22257 -0.3106,-0.25586 -0.334,-0.11253 -0.6697,-0.21229 -1.0097,-0.29883 z m -707.67191,58.25976 c 0.12959,0.70438 0.25748,1.4081 0.38282,2.11329 v -1.97461 c -0.12716,-0.0471 -0.25503,-0.0928 -0.38282,-0.13868 z"/></svg>
              absolute appi
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
            type="date"
            value={form.watch_date}
            onChange={(e) => setForm(prev => ({ ...prev, watch_date: e.target.value }))}
            className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {isAdmin ? (
          <div>
            <label htmlFor="edit_download_url" className="block text-sm font-medium text-text-primary mb-1.5">
              Download link <span className="text-xs text-text-muted font-normal">(admin only)</span>
            </label>
            <input
              id="edit_download_url"
              type="url"
              value={form.download_url}
              onChange={(e) => setForm(prev => ({ ...prev, download_url: e.target.value }))}
              className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
              placeholder="https://example.com/download"
            />
          </div>
        ) : entry?.download_url ? (
          <div>
            <p className="text-sm font-medium text-text-primary mb-1.5">Download link</p>
            <a
              href={entry.download_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover transition-colors"
            >
              {entry.download_url}
            </a>
          </div>
        ) : null}

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

        <div className="border-t border-border pt-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-text-primary flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              Viewings <span className="text-text-muted font-normal">({watchEvents.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => setShowAddEvent(!showAddEvent)}
              className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add viewing
            </button>
          </div>

          {showAddEvent && (
            <div className="mb-4 p-4 bg-tag-bg border border-border rounded-sm space-y-3">
              <div>
                <label className="block body-xs text-text-muted mb-1">Date *</label>
                <input
                  type="date"
                  value={newEvent.watch_date}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, watch_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-border bg-bg rounded-sm text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {form.type === 'series' && (
                  <>
                    <div>
                      <label className="block body-xs text-text-muted mb-1">Season</label>
                      <input
                        type="number"
                        min="1"
                        value={newEvent.season_number}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, season_number: e.target.value }))}
                        className="w-full px-3 py-2 border border-border bg-bg rounded-sm text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                    <div>
                      <label className="block body-xs text-text-muted mb-1">Episode</label>
                      <input
                        type="number"
                        min="1"
                        value={newEvent.episode_number}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, episode_number: e.target.value }))}
                        className="w-full px-3 py-2 border border-border bg-bg rounded-sm text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  </>
                )}
              </div>
              <div>
                <label className="block body-xs text-text-muted mb-1">Rating (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newEvent.rating}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, rating: e.target.value }))}
                  className="w-full px-3 py-2 border border-border bg-bg rounded-sm text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block body-xs text-text-muted mb-1">Notes</label>
                <textarea
                  value={newEvent.notes}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-border bg-bg rounded-sm text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddEvent}
                  disabled={addingEvent || !newEvent.watch_date}
                  className="px-3 py-1.5 bg-accent text-white rounded-sm text-xs hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {addingEvent ? 'Adding...' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddEvent(false); setNewEvent({ watch_date: '', notes: '', rating: '', season_number: '', episode_number: '' }) }}
                  className="px-3 py-1.5 border border-border rounded-sm text-xs text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {watchEvents.length > 0 ? (
            <div className="space-y-2">
              {watchEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3 bg-tag-bg border border-border rounded-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">{event.watch_date}</span>
                      {event.season_number != null && (
                        <span className="text-xs text-text-muted">
                          S{event.season_number}{event.episode_number != null ? `E${event.episode_number}` : ''}
                        </span>
                      )}
                      {event.rating && (
                        <span className="text-xs text-rating">{event.rating}/10</span>
                      )}
                    </div>
                    {event.notes && (
                      <p className="text-xs text-text-secondary mt-1 line-clamp-2">{event.notes}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(event.id)}
                    className="p-1 text-text-muted hover:text-accent transition-colors flex-shrink-0"
                    title="Remove viewing"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted">No viewings logged yet</p>
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

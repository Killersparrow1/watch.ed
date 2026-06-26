'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Calendar, Users, Plus, Clock, Film, Tv, UserCheck, UserX, Loader, X, Search, Globe, Trash2, Edit, Save } from 'lucide-react'
import { getPosterUrl } from '@/lib/tmdb'
import { createClient } from '@/lib/supabase/client'

interface TMDBResult {
  tmdb_id: number
  title: string
  year: number | null
  poster_path: string | null
  media_type: 'movie' | 'series'
}

interface Participant {
  id: string
  user_id: string
  status: string
  profiles: { id: string; username: string; display_name: string | null; avatar_url: string | null }
}

interface BrowseParty {
  id: string
  title: string
  host_id: string
  tmdb_id: number | null
  media_type: string | null
  poster_path: string | null
  year: number | null
  watch_date: string
  notes: string | null
  status: string
  host: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null
  participant_count: { accepted: number; total: number }
}

interface Party {
  id: string
  title: string
  host_id: string
  tmdb_id: number | null
  media_type: string | null
  poster_path: string | null
  year: number | null
  watch_date: string
  notes: string | null
  status: string
  is_public: boolean
  participants: Participant[]
  created_at: string
}

interface PartyForm {
  watch_date: string
  notes: string
}

type Tab = 'mine' | 'browse'

export default function PartiesPage() {
  const [tab, setTab] = useState<Tab>('mine')
  const [parties, setParties] = useState<Party[]>([])
  const [browseParties, setBrowseParties] = useState<BrowseParty[]>([])
  const [loading, setLoading] = useState(true)
  const [browseLoading, setBrowseLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TMDBResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<TMDBResult | null>(null)
  const [watchDate, setWatchDate] = useState('')
  const [notes, setNotes] = useState('')
  const [creating, setCreating] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [editParty, setEditParty] = useState<Party | null>(null)
  const [editForm, setEditForm] = useState<PartyForm>({ watch_date: '', notes: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id)
    })
  }, [])

  function handleSearch(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/tmdb?query=${encodeURIComponent(value)}`)
        const data = await res.json()
        setResults(data.results || [])
      } catch { setResults([]) }
      setSearching(false)
    }, 400)
  }

  function selectResult(item: TMDBResult) {
    setSelected(item)
    setQuery('')
    setResults([])
  }

  function clearSelection() {
    setSelected(null)
    setQuery('')
    setResults([])
  }

  async function load() {
    setLoading(true)
    const res = await fetch('/api/parties')
    if (res.ok) {
      const data = await res.json()
      setParties(data.parties || [])
    }
    setLoading(false)
  }

  async function loadBrowse() {
    setBrowseLoading(true)
    const res = await fetch('/api/parties?browse=true')
    if (res.ok) {
      const data = await res.json()
      setBrowseParties(data.parties || [])
    }
    setBrowseLoading(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (tab === 'browse') loadBrowse() }, [tab])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setCreating(true)
    const res = await fetch('/api/parties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: selected.title,
        tmdb_id: selected.tmdb_id,
        media_type: selected.media_type,
        poster_path: selected.poster_path,
        year: selected.year,
        watch_date: watchDate,
        notes: notes.trim() || null,
      }),
    })
    setCreating(false)
    if (res.ok) {
      setShowCreate(false)
      setSelected(null)
      setQuery('')
      setResults([])
      setWatchDate('')
      setNotes('')
      load()
    }
  }

  async function handleDeleteParty(id: string) {
    if (!confirm('Delete this watch party?')) return
    await fetch(`/api/parties/${id}`, { method: 'DELETE' })
    setParties(prev => prev.filter(p => p.id !== id))
  }

  function openEdit(party: Party) {
    setEditParty(party)
    setEditForm({ watch_date: party.watch_date, notes: party.notes || '' })
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editParty) return
    setSavingEdit(true)
    await fetch(`/api/parties/${editParty.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        watch_date: editForm.watch_date,
        notes: editForm.notes.trim() || null,
      }),
    })
    setSavingEdit(false)
    setEditParty(null)
    load()
  }

  const statusColors: Record<string, string> = {
    planned: 'text-blue-600 bg-blue-100',
    watching: 'text-green-600 bg-green-100',
    completed: 'text-gray-600 bg-gray-100',
    cancelled: 'text-red-600 bg-red-100',
  }

  const acceptedCount = (p: Party) => p.participants.filter(x => x.status === 'accepted').length
  const totalCount = (p: Party) => p.participants.length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="heading-lg flex items-center gap-2">
          <Users className="w-6 h-6 text-accent" />
          Watch Parties
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-sm text-sm hover:bg-accent/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Party
        </button>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setTab('mine')}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm transition-colors ${
            tab === 'mine' ? 'bg-accent text-white' : 'bg-tag-bg text-text-secondary hover:text-text-primary'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          My Parties
        </button>
        <button
          onClick={() => setTab('browse')}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm transition-colors ${
            tab === 'browse' ? 'bg-accent text-white' : 'bg-tag-bg text-text-secondary hover:text-text-primary'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          Browse
        </button>
      </div>

      {tab === 'mine' ? (
        loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-tag-bg rounded-sm animate-pulse" />
            ))}
          </div>
        ) : parties.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-12 h-12 text-text-muted/30 mx-auto mb-3" />
            <p className="text-text-secondary">No watch parties yet</p>
            <p className="text-sm text-text-muted mt-1">Create one to coordinate watching with friends.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {parties.map(party => (
              <div key={party.id} className="flex items-center gap-4 bg-surface border border-border rounded-sm p-4 group">
                <Link
                  href={`/dashboard/parties/${party.id}`}
                  className="flex items-center gap-4 flex-1 min-w-0"
                >
                  <div className="w-12 h-16 shrink-0 rounded-sm overflow-hidden bg-tag-bg flex items-center justify-center">
                    {party.poster_path ? (
                      <img src={getPosterUrl(party.poster_path, 'w92') || ''} alt="" className="w-full h-full object-cover" />
                    ) : (
                      party.media_type === 'series' ? <Tv className="w-5 h-5 text-text-muted/40" /> : <Film className="w-5 h-5 text-text-muted/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium group-hover:text-accent transition-colors truncate">{party.title}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${statusColors[party.status] || ''}`}>
                        {party.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-muted mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(party.watch_date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3" />
                        {acceptedCount(party)}/{totalCount(party)}
                      </span>
                      {party.notes && <span className="truncate max-w-[200px]">{party.notes}</span>}
                    </div>
                  </div>
                </Link>
                {party.host_id === currentUserId && (
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(party)}
                      className="p-2 text-text-muted hover:text-accent hover:bg-accent-light/20 rounded-sm transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteParty(party.id)}
                      className="p-2 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-sm transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        browseLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-tag-bg rounded-sm animate-pulse" />
            ))}
          </div>
        ) : browseParties.length === 0 ? (
          <div className="text-center py-20">
            <Globe className="w-12 h-12 text-text-muted/30 mx-auto mb-3" />
            <p className="text-text-secondary">No public parties available</p>
            <p className="text-sm text-text-muted mt-1">Check back later or create your own!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {browseParties.map(p => (
              <Link
                key={p.id}
                href={`/dashboard/parties/${p.id}`}
                className="flex items-center gap-4 bg-surface border border-border rounded-sm p-4 hover:border-accent/30 transition-colors group"
              >
                <div className="w-12 h-16 shrink-0 rounded-sm overflow-hidden bg-tag-bg flex items-center justify-center">
                  {p.poster_path ? (
                    <img src={getPosterUrl(p.poster_path, 'w92') || ''} alt="" className="w-full h-full object-cover" />
                  ) : (
                    p.media_type === 'series' ? <Tv className="w-5 h-5 text-text-muted/40" /> : <Film className="w-5 h-5 text-text-muted/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium group-hover:text-accent transition-colors truncate">{p.title}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${statusColors[p.status] || ''}`}>
                      {p.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-muted mt-1">
                    {p.host && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {p.host.display_name || p.host.username}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(p.watch_date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      {p.participant_count.accepted}/{p.participant_count.total}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg bg-surface border border-border rounded-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Create Watch Party</h2>
              <button onClick={() => setShowCreate(false)} className="text-text-secondary hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              {selected ? (
                <div className="flex items-center gap-3 bg-accent-light/20 border border-accent/30 rounded-sm p-3">
                  <div className="w-10 h-14 shrink-0 rounded-sm overflow-hidden bg-tag-bg">
                    {selected.poster_path ? (
                      <img src={getPosterUrl(selected.poster_path, 'w92') || ''} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {selected.media_type === 'series' ? <Tv className="w-4 h-4 text-text-muted/40" /> : <Film className="w-4 h-4 text-text-muted/40" />}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{selected.title}</p>
                    <p className="text-xs text-text-muted">
                      {selected.media_type === 'movie' ? 'Film' : 'Series'}
                      {selected.year && <> &middot; {selected.year}</>}
                    </p>
                  </div>
                  <button type="button" onClick={clearSelection} className="p-1 text-text-secondary hover:text-text-primary">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <label className="block text-sm text-text-secondary mb-1">Search TMDB *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      value={query}
                      onChange={e => handleSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-bg border border-border rounded-sm text-sm focus:outline-none focus:border-accent"
                      placeholder="Search for a movie or series..."
                      autoFocus
                    />
                    {searching && <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted animate-spin" />}
                  </div>
                  {results.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-surface border border-border rounded-sm shadow-lg max-h-64 overflow-y-auto">
                      {results.map(item => (
                        <button
                          key={item.tmdb_id}
                          type="button"
                          onClick={() => selectResult(item)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-tag-bg transition-colors text-left"
                        >
                          <div className="w-8 h-12 shrink-0 rounded-sm overflow-hidden bg-tag-bg">
                            {item.poster_path ? (
                              <img src={getPosterUrl(item.poster_path, 'w92') || ''} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                {item.media_type === 'series' ? <Tv className="w-3 h-3 text-text-muted/40" /> : <Film className="w-3 h-3 text-text-muted/40" />}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.title}</p>
                            <p className="text-xs text-text-muted">
                              {item.media_type === 'movie' ? 'Film' : 'Series'}
                              {item.year && <> &middot; {item.year}</>}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm text-text-secondary mb-1">Watch Date *</label>
                <input
                  type="date"
                  value={watchDate}
                  onChange={e => setWatchDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm focus:outline-none focus:border-accent resize-y"
                  placeholder="What's the plan?"
                />
              </div>
              <button
                type="submit"
                disabled={creating || !selected}
                className="w-full py-2 bg-accent text-white rounded-sm text-sm hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {creating ? 'Creating...' : 'Create Party'}
              </button>
            </form>
          </div>
        </div>
      )}

      {editParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditParty(null)}>
          <div className="w-full max-w-md bg-surface border border-border rounded-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Edit Party</h2>
              <button onClick={() => setEditParty(null)} className="text-text-secondary hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <p className="text-sm font-medium">{editParty.title}</p>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Watch Date *</label>
                <input
                  type="date"
                  value={editForm.watch_date}
                  onChange={e => setEditForm(prev => ({ ...prev, watch_date: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm focus:outline-none focus:border-accent resize-y"
                />
              </div>
              <button
                type="submit"
                disabled={savingEdit}
                className="w-full flex items-center justify-center gap-2 py-2 bg-accent text-white rounded-sm text-sm hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                {savingEdit ? 'Saving...' : 'Save'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

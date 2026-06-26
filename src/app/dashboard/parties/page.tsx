'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Calendar, Users, Plus, Clock, Film, Tv, UserCheck, UserX, Loader } from 'lucide-react'
import { getPosterUrl } from '@/lib/tmdb'

interface Participant {
  id: string
  user_id: string
  status: string
  profiles: { id: string; username: string; display_name: string | null; avatar_url: string | null }
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
  participants: Participant[]
  created_at: string
}

export default function PartiesPage() {
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [watchDate, setWatchDate] = useState('')
  const [notes, setNotes] = useState('')
  const [creating, setCreating] = useState(false)

  async function load() {
    const res = await fetch('/api/parties')
    if (res.ok) {
      const data = await res.json()
      setParties(data.parties || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    const res = await fetch('/api/parties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), watch_date: watchDate, notes: notes.trim() || null }),
    })
    setCreating(false)
    if (res.ok) {
      setShowCreate(false)
      setTitle('')
      setWatchDate('')
      setNotes('')
      load()
    }
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

      {loading ? (
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
            <Link
              key={party.id}
              href={`/dashboard/parties/${party.id}`}
              className="flex items-center gap-4 bg-surface border border-border rounded-sm p-4 hover:border-accent/30 transition-colors group"
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
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md bg-surface border border-border rounded-sm p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Create Watch Party</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">Title *</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm focus:outline-none focus:border-accent"
                  placeholder="Movie or series title"
                />
              </div>
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
                disabled={creating}
                className="w-full py-2 bg-accent text-white rounded-sm text-sm hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {creating ? 'Creating...' : 'Create Party'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

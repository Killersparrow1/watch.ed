'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Star, Send, Inbox, X, Check, ExternalLink, User, MessageSquare } from 'lucide-react'
import { getPosterUrl } from '@/lib/tmdb'

interface TMDBRec {
  tmdb_id: number
  title: string
  poster_path: string | null
  poster_url: string | null
  year: string | null
  rating: number | null
}

export default function RecommendationsPage() {
  const [incoming, setIncoming] = useState<Record<string, unknown>[]>([])
  const [sent, setSent] = useState<Record<string, unknown>[]>([])
  const [tmdbRecs, setTmdbRecs] = useState<TMDBRec[]>([])
  const [loading, setLoading] = useState(true)
  const [showSendModal, setShowSendModal] = useState(false)
  const [sending, setSending] = useState(false)
  const [friends, setFriends] = useState<{ id: string; username: string; display_name: string | null }[]>([])
  const supabase = createClient()

  async function load() {
    setLoading(true)
    const res = await fetch('/api/recommendations')
    if (res.ok) {
      const data = await res.json()
      setIncoming(data.incoming || [])
      setSent(data.sent || [])
      setTmdbRecs(data.tmdb || [])
    }
    setLoading(false)
  }

  async function loadFriends() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('follows')
      .select('following_id, following_id!inner(profiles!inner(id, username, display_name))')
      .eq('follower_id', user.id)
    if (data) {
      setFriends(data.map(f => ({
        id: f.following_id,
        username: (f as unknown as { following_id: string; profiles: { id: string; username: string; display_name: string | null } }).profiles.username,
        display_name: (f as unknown as { following_id: string; profiles: { id: string; username: string; display_name: string | null } }).profiles.display_name,
      })))
    }
  }

  useEffect(() => { load(); loadFriends() }, [])

  async function markRead(id: string) {
    const res = await fetch(`/api/recommendations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true }),
    })
    if (res.ok) load()
  }

  async function deleteRec(id: string) {
    const res = await fetch(`/api/recommendations/${id}`, { method: 'DELETE' })
    if (res.ok) load()
  }

  async function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSending(true)
    const form = new FormData(e.currentTarget)
    const res = await fetch('/api/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to_user_id: form.get('to_user_id'),
        title: form.get('title'),
        tmdb_id: form.get('tmdb_id') ? Number(form.get('tmdb_id')) : null,
        type: form.get('type') || null,
        poster_path: form.get('poster_path') || null,
        year: form.get('year') ? Number(form.get('year')) : null,
        message: form.get('message') || null,
      }),
    })
    setSending(false)
    if (res.ok) {
      setShowSendModal(false)
      load()
    }
  }

  function RecCard({ rec: raw, isIncoming }: { rec: Record<string, unknown>; isIncoming: boolean }) {
    const rec = raw as Record<string, unknown> & { read: boolean; id: string; poster_path: string | null; title: string; year: unknown; message: unknown; created_at: string }
    const fromUserId = rec.from_user_id as Record<string, unknown> | undefined
    const toUserId = rec.to_user_id as Record<string, unknown> | undefined
    const profileObj = isIncoming
      ? ((fromUserId?.profiles || fromUserId) as Record<string, unknown> | undefined)
      : ((toUserId?.profiles || toUserId) as Record<string, unknown> | undefined)
    const displayName = (profileObj?.display_name as string) || (profileObj?.username as string) || 'Unknown'

    return (
      <div className={`flex gap-3 p-3 rounded-sm border ${!rec.read && isIncoming ? 'border-accent/30 bg-accent-light/20' : 'border-border bg-surface'}`}>
        <div className="w-12 h-16 shrink-0 rounded-sm overflow-hidden bg-tag-bg flex items-center justify-center text-text-secondary">
          {rec.poster_path ? (
            <img src={getPosterUrl(rec.poster_path, 'w185') || ''} alt="" className="w-full h-full object-cover" />
          ) : (
            <Star className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{rec.title}</p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-text-secondary">
            <User className="w-3 h-3" />
            <span>{displayName}</span>
          </div>
          {rec.year ? <p className="text-xs text-text-secondary mt-0.5">{String(rec.year)}</p> : null}
          {rec.message ? (
            <div className="flex items-start gap-1 mt-1.5 text-xs text-text-secondary">
              <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
              <span className="italic">{String(rec.message)}</span>
            </div>
          ) : null}
          <p className="text-[10px] text-text-secondary mt-1">
            {new Date(rec.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          {isIncoming && !rec.read ? (
            <button onClick={() => markRead(rec.id)} className="p-1 rounded-sm text-text-secondary hover:text-accent hover:bg-accent-light/30 transition-colors" title="Mark read">
              <Check className="w-4 h-4" />
            </button>
          ) : null}
          <button onClick={() => deleteRec(rec.id)} className="p-1 rounded-sm text-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors" title="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <p className="text-text-secondary">Loading recommendations...</p>
      </div>
    )
  }

  const unreadCount = incoming.filter(r => !r.read).length

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Recommendations</h1>
          <p className="text-sm text-text-secondary mt-1">
            Discover what to watch next
          </p>
        </div>
        <button
          onClick={() => setShowSendModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-sm text-sm hover:bg-accent/90 transition-colors"
        >
          <Send className="w-4 h-4" />
          Recommend
        </button>
      </div>

      {incoming.length > 0 && (
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-3">
            <Inbox className="w-5 h-5 text-accent" />
            Incoming ({unreadCount} unread)
          </h2>
          <div className="space-y-2">
            {incoming.map(rec => (
              <RecCard key={rec.id as string} rec={rec} isIncoming />
            ))}
          </div>
        </section>
      )}

      {tmdbRecs.length > 0 && (
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-3">
            <Star className="w-5 h-5 text-amber-400" />
            Based on your top-rated
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {tmdbRecs.map(rec => (
              <div key={rec.tmdb_id} className="group relative rounded-sm overflow-hidden border border-border bg-surface">
                <div className="aspect-[2/3] bg-tag-bg">
                  {rec.poster_url ? (
                    <img src={rec.poster_url} alt={rec.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-secondary">
                      <Star className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate">{rec.title}</p>
                  <div className="flex items-center justify-between mt-1">
                    {rec.year && <span className="text-[10px] text-text-secondary">{rec.year}</span>}
                    {rec.rating && (
                      <span className="text-[10px] text-amber-400">{rec.rating}/10</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowSendModal(true)}
                  className="absolute top-2 right-2 p-1.5 rounded-sm bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Recommend to a friend"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {sent.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-3">
            <Send className="w-5 h-5 text-text-secondary" />
            Sent
          </h2>
          <div className="space-y-2">
            {sent.map(rec => (
              <RecCard key={rec.id as string} rec={rec} isIncoming={false} />
            ))}
          </div>
        </section>
      )}

      {incoming.length === 0 && tmdbRecs.length === 0 && sent.length === 0 && (
        <div className="text-center py-16 text-text-secondary">
          <Star className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No recommendations yet</p>
          <p className="text-sm mt-1">Start by recommending a film to a friend or rating more entries to get suggestions.</p>
        </div>
      )}

      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-surface border border-border rounded-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Send Recommendation</h3>
              <button onClick={() => setShowSendModal(false)} className="text-text-secondary hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">To</label>
                <select name="to_user_id" required className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm focus:outline-none focus:border-accent">
                  <option value="">Select a friend...</option>
                  {friends.map(f => (
                    <option key={f.id} value={f.id}>{f.display_name || f.username}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Title *</label>
                <input name="title" required className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm focus:outline-none focus:border-accent" placeholder="Movie or series title" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Type</label>
                  <select name="type" className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm focus:outline-none focus:border-accent">
                    <option value="">Any</option>
                    <option value="movie">Movie</option>
                    <option value="series">Series</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Year</label>
                  <input name="year" type="number" className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm focus:outline-none focus:border-accent" placeholder="e.g. 2024" />
                </div>
              </div>
              <input name="tmdb_id" type="hidden" />
              <input name="poster_path" type="hidden" />
              <div>
                <label className="block text-sm text-text-secondary mb-1">Message (optional)</label>
                <textarea name="message" rows={3} className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm focus:outline-none focus:border-accent" placeholder="Why do you recommend this?" />
              </div>
              <button
                type="submit"
                disabled={sending}
                className="w-full py-2 bg-accent text-white rounded-sm text-sm hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {sending ? 'Sending...' : 'Send Recommendation'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { renderNotes } from '@/lib/render-notes'
import { Check, X, RefreshCw, Sparkles, Trash2 } from 'lucide-react'
import { Profile } from '@/types/database'

interface ModComment {
  id: string
  content: string
  created_at: string
  author: { username: string; display_name: string | null }
}

interface ModVerdict {
  verdict: 'ok' | 'flag'
  reason: string
}

export default function AdminPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [comments, setComments] = useState<ModComment[]>([])
  const [verdicts, setVerdicts] = useState<Record<string, ModVerdict>>({})
  const [moderatingId, setModeratingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [modError, setModError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!myProfile?.is_admin) {
        router.push('/dashboard')
        return
      }

      if (cancelled) return
      setIsAdmin(true)

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .in('status', ['pending', 'approved', 'rejected'])
        .neq('id', user.id)
        .order('created_at', { ascending: false })

      if (!cancelled) {
        setProfiles(data || [])
        setLoading(false)
      }

      const commentsRes = await fetch('/api/ai/moderation')
      if (commentsRes.ok) {
        const commentsData = await commentsRes.json()
        if (!cancelled) setComments(commentsData.comments || [])
      }
    }

    load()
    return () => { cancelled = true }
  }, [router])

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    setActionLoading(id)
    const supabase = createClient()
    await supabase.from('profiles').update({ status }).eq('id', id)
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, status } : p))
    setActionLoading(null)
  }

  async function scanComment(id: string) {
    setModeratingId(id)
    setModError(null)
    try {
      const res = await fetch('/api/ai/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId: id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scan failed')
      setVerdicts(prev => ({ ...prev, [id]: { verdict: data.verdict, reason: data.reason } }))
    } catch (e) {
      setModError(e instanceof Error ? e.message : 'Scan failed')
    } finally {
      setModeratingId(null)
    }
  }

  async function deleteComment(id: string) {
    setDeletingId(id)
    const res = await fetch(`/api/comments?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setComments(prev => prev.filter(c => c.id !== id))
      setVerdicts(prev => { const next = { ...prev }; delete next[id]; return next })
    } else {
      const data = await res.json().catch(() => ({}))
      setModError(data.error || 'Failed to delete comment')
    }
    setDeletingId(null)
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-tag-bg rounded w-1/4" />
        <div className="h-16 bg-tag-bg rounded w-full" />
        <div className="h-16 bg-tag-bg rounded w-full" />
      </div>
    )
  }

  if (!isAdmin) return null

  const pending = profiles.filter(p => p.status === 'pending')
  const resolved = profiles.filter(p => p.status !== 'pending')

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="heading-lg">Admin</h1>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {pending.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-medium text-text-primary mb-4">
            Pending approval ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map(profile => (
              <div
                key={profile.id}
                className="flex items-center justify-between p-4 bg-surface border border-border rounded-sm"
              >
                <div className="flex items-center gap-3">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-tag-bg flex items-center justify-center">
                      <span className="text-sm font-heading font-bold text-text-muted">
                        {profile.display_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{profile.display_name}</p>
                    <p className="text-xs text-text-muted">@{profile.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateStatus(profile.id, 'approved')}
                    disabled={actionLoading === profile.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-success/10 text-success rounded-sm text-sm hover:bg-success/20 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => updateStatus(profile.id, 'rejected')}
                    disabled={actionLoading === profile.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-accent-light text-accent rounded-sm text-sm hover:bg-accent/20 transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {pending.length === 0 && (
        <p className="text-sm text-text-muted mb-10">No pending users.</p>
      )}

      {resolved.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-text-primary mb-4">
            All users ({resolved.length})
          </h2>
          <div className="space-y-2">
            {resolved.map(profile => (
              <div
                key={profile.id}
                className="flex items-center justify-between p-3 bg-surface border border-border rounded-sm"
              >
                <div className="flex items-center gap-3">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-tag-bg flex items-center justify-center">
                      <span className="text-xs font-heading font-bold text-text-muted">
                        {profile.display_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm">{profile.display_name}</p>
                    <p className="text-xs text-text-muted">@{profile.username}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  profile.status === 'approved'
                    ? 'bg-success/10 text-success'
                    : 'bg-accent-light text-accent'
                }`}>
                  {profile.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-sm font-medium text-text-primary mb-4">
          AI comment moderation ({comments.length})
        </h2>
        {modError && <p className="text-xs text-accent mb-4">{modError}</p>}
        {comments.length === 0 ? (
          <p className="text-sm text-text-muted">No recent comments.</p>
        ) : (
          <div className="space-y-3">
            {comments.map(comment => {
              const verdict = verdicts[comment.id]
              return (
                <div key={comment.id} className="p-4 bg-surface border border-border rounded-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">{comment.author.display_name || comment.author.username}</span>
                    {comment.created_at && (
                      <span className="text-xs text-text-muted">{new Date(comment.created_at).toLocaleDateString()}</span>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary mb-3 whitespace-pre-wrap break-words">{renderNotes(comment.content)}</p>
                  <div className="flex items-center gap-2">
                    {!verdict && (
                      <button
                        onClick={() => scanComment(comment.id)}
                        disabled={moderatingId === comment.id}
                        className="flex items-center gap-1 px-3 py-1.5 bg-tag-bg border border-border rounded-sm text-xs text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${moderatingId === comment.id ? 'animate-pulse' : ''}`} />
                        {moderatingId === comment.id ? 'Scanning...' : 'Scan'}
                      </button>
                    )}
                    {verdict && (
                      <>
                        <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                          verdict.verdict === 'flag' ? 'bg-accent-light text-accent' : 'bg-success/10 text-success'
                        }`}>
                          {verdict.verdict === 'flag' ? <X className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                          {verdict.verdict === 'flag' ? 'Flagged' : 'Ok'}
                        </span>
                        <span className="text-xs text-text-muted">{verdict.reason}</span>
                        {verdict.verdict === 'flag' && (
                          <button
                            onClick={() => deleteComment(comment.id)}
                            disabled={deletingId === comment.id}
                            className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-accent text-white rounded-sm text-xs hover:bg-accent-hover transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {deletingId === comment.id ? 'Deleting...' : 'Delete'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

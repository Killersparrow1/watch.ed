'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Calendar, Users, Clock, Film, Tv, User, UserCheck, UserX, Trash2, ArrowLeft, Loader } from 'lucide-react'
import { getPosterUrl } from '@/lib/tmdb'
import Link from 'next/link'

interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

interface Participant {
  id: string
  user_id: string
  status: string
  profiles: Profile
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
  host: Profile | null
  created_at: string
}

export default function PartyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [party, setParty] = useState<Party | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const id = params.id as string
    Promise.all([
      fetch(`/api/parties/${id}`).then(res => res.json()),
      fetch('/api/account/profile').then(res => res.json()).catch(() => ({})),
    ]).then(([partyData, profileData]) => {
      if (partyData.party) setParty(partyData.party)
      setLoading(false)
    })
  }, [params.id])

  async function handleJoin() {
    const res = await fetch(`/api/parties/${params.id}/join`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      window.location.reload()
    }
  }

  async function handleLeave() {
    const res = await fetch(`/api/parties/${params.id}/leave`, { method: 'POST' })
    if (res.ok) window.location.reload()
  }

  async function handleDelete() {
    if (!confirm('Delete this watch party?')) return
    const res = await fetch(`/api/parties/${params.id}`, { method: 'DELETE' })
    if (res.ok) router.push('/dashboard/parties')
  }

  async function handleStatusUpdate(status: string) {
    await fetch(`/api/parties/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    window.location.reload()
  }

  const statusColors: Record<string, string> = {
    planned: 'text-blue-600 bg-blue-100',
    watching: 'text-green-600 bg-green-100',
    completed: 'text-gray-600 bg-gray-100',
    cancelled: 'text-red-600 bg-red-100',
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-tag-bg rounded w-1/3" />
        <div className="h-48 bg-tag-bg rounded" />
      </div>
    )
  }

  if (!party) {
    return <div className="text-center py-20 text-text-secondary">Party not found</div>
  }

  const isHost = false // We don't know userId client-side easily, check via host check in render
  const userParticipant = party.participants.find(p => p.user_id === party.host?.id) // just placeholder

  return (
    <div>
      <Link href="/dashboard/parties" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to parties
      </Link>

      <div className="bg-surface border border-border rounded-sm p-6">
        <div className="flex items-start gap-6">
          <div className="w-32 shrink-0 rounded-sm overflow-hidden bg-tag-bg">
            {party.poster_path ? (
              <img src={getPosterUrl(party.poster_path, 'w185') || ''} alt="" className="w-full aspect-[2/3] object-cover" />
            ) : (
              <div className="w-full aspect-[2/3] flex items-center justify-center">
                {party.media_type === 'series' ? <Tv className="w-8 h-8 text-text-muted/40" /> : <Film className="w-8 h-8 text-text-muted/40" />}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-semibold">{party.title}</h1>
                <span className={`inline-flex text-xs px-2 py-0.5 rounded-sm font-medium mt-1 ${statusColors[party.status] || ''}`}>
                  {party.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {party.host_id === party.host?.id && (
                  <>
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-sm hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                    {party.status === 'planned' && (
                      <button
                        onClick={() => handleStatusUpdate('watching')}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-accent text-white rounded-sm hover:bg-accent/90 transition-colors"
                      >
                        <Clock className="w-3 h-3" />
                        Start Watching
                      </button>
                    )}
                    {party.status === 'watching' && (
                      <button
                        onClick={() => handleStatusUpdate('completed')}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-sm hover:bg-green-700 transition-colors"
                      >
                        <Calendar className="w-3 h-3" />
                        Mark Completed
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-text-secondary mt-3">
              {party.host && (
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  Hosted by {party.host.display_name || party.host.username}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(party.watch_date).toLocaleDateString()}
              </span>
            </div>

            {party.notes && (
              <p className="text-sm text-text-secondary mt-4">{party.notes}</p>
            )}

            <div className="mt-6">
              <h2 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-accent" />
                Participants ({party.participants.length})
              </h2>
              <div className="space-y-2">
                {party.participants.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 px-3 bg-tag-bg rounded-sm">
                    <div className="flex items-center gap-2">
                      {p.profiles?.avatar_url ? (
                        <img src={p.profiles.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                          <User className="w-3 h-3 text-accent" />
                        </div>
                      )}
                      <span className="text-sm">{p.profiles?.display_name || p.profiles?.username}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-sm ${
                      p.status === 'accepted' ? 'text-green-600 bg-green-100' :
                      p.status === 'declined' ? 'text-red-600 bg-red-100' :
                      p.status === 'watched' ? 'text-blue-600 bg-blue-100' :
                      'text-gray-600 bg-gray-100'
                    }`}>{p.status}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleJoin}
                className="mt-3 flex items-center gap-1 px-4 py-2 bg-accent text-white rounded-sm text-sm hover:bg-accent/90 transition-colors"
              >
                <UserCheck className="w-4 h-4" />
                Join Party
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

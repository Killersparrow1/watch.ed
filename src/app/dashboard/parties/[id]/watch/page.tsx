'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Send, ArrowLeft, User, Tv, Film } from 'lucide-react'
import { getPosterUrl } from '@/lib/tmdb'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

interface Message {
  id: string
  user_id: string
  message: string
  created_at: string
  profiles: Profile
}

interface Party {
  id: string
  title: string
  host_id: string
  stream_url: string | null
  poster_path: string | null
  media_type: string | null
  status: string
}

export default function WatchPartyPage() {
  const params = useParams()
  const router = useRouter()
  const [party, setParty] = useState<Party | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const partyId = params.id as string

  useEffect(() => {
    fetch(`/api/parties/${partyId}`).then(res => res.json()).then(data => {
      if (data.party) setParty(data.party)
    })
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id)
    })
  }, [partyId])

  useEffect(() => {
    if (!partyId) return
    function poll() {
      fetch(`/api/parties/${partyId}/messages`).then(res => res.json()).then(data => {
        if (data.messages) setMessages(data.messages)
      })
    }
    poll()
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [partyId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || sending) return
    setSending(true)
    setSendError(null)
    const res = await fetch(`/api/parties/${partyId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input.trim() }),
    })
    setInput('')
    setSending(false)
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Failed (${res.status})` }))
      setSendError(err.error || 'Failed to send')
      return
    }
    fetch(`/api/parties/${partyId}/messages`).then(res => res.json()).then(data => {
      if (data.messages) setMessages(data.messages)
    })
  }

  function getStreamUrl(url: string | null): { type: 'youtube' | 'gofile' | 'direct' | null; src: string | null } {
    if (!url) return { type: null, src: null }
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
    if (yt) return { type: 'youtube', src: `https://www.youtube.com/embed/${yt[1]}?autoplay=1` }
    if (url.includes('gofile.io')) return { type: 'gofile', src: url }
    return { type: 'direct', src: url }
  }

  const stream = getStreamUrl(party?.stream_url || null)

  if (!party) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-pulse text-text-secondary">Loading...</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-bg">
      <header className="flex items-center gap-3 px-4 py-2 border-b border-border bg-surface shrink-0">
        <Link href={`/dashboard/parties/${partyId}`} className="text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="w-8 h-10 rounded-sm overflow-hidden bg-tag-bg shrink-0">
          {party.poster_path ? (
            <img src={getPosterUrl(party.poster_path, 'w92') || ''} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {party.media_type === 'series' ? <Tv className="w-4 h-4 text-text-muted/40" /> : <Film className="w-4 h-4 text-text-muted/40" />}
            </div>
          )}
        </div>
        <h1 className="text-sm font-medium truncate">{party.title}</h1>
        {party.status === 'watching' && <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-sm font-medium shrink-0">Live</span>}
        {party.status === 'planned' && <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-sm font-medium shrink-0">Scheduled</span>}
        {party.status === 'completed' && <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-sm font-medium shrink-0">Ended</span>}
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex items-center justify-center bg-black">
          {stream.type === 'youtube' ? (
            <iframe
              src={stream.src!}
              className="w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          ) : stream.type === 'gofile' ? (
            <div className="text-center p-8">
              <p className="text-white text-lg mb-4">Stream hosted on Gofile</p>
              <a
                href={stream.src!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-sm hover:bg-accent/90 transition-colors"
              >
                Open in new tab
              </a>
              <p className="text-gray-400 text-sm mt-3">Or right-click and copy the link to play in your favorite player.</p>
            </div>
          ) : stream.type === 'direct' ? (
            <iframe
              src={stream.src!}
              className="w-full h-full"
              allow="autoplay"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          ) : (
            <div className="text-center p-8">
              <p className="text-white text-lg mb-2">No stream link set</p>
              <p className="text-gray-400 text-sm">The host hasn&apos;t added a stream URL yet.</p>
              <p className="text-gray-400 text-sm mt-1">Use the chat to coordinate!</p>
            </div>
          )}
        </div>

        <div className="w-80 shrink-0 border-l border-border bg-surface flex flex-col">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-medium flex items-center gap-2">
              Live Chat
              <span className="text-xs text-text-muted font-normal">{messages.length}</span>
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-xs text-text-muted text-center py-8">No messages yet. Start the conversation!</p>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex items-start gap-2 ${msg.user_id === currentUserId ? 'flex-row-reverse' : ''}`}>
                <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center overflow-hidden ${msg.user_id === currentUserId ? 'bg-accent/20' : 'bg-tag-bg'}`}>
                  {msg.profiles?.avatar_url ? (
                    <img src={msg.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-3 h-3 text-text-muted" />
                  )}
                </div>
                <div className={`flex flex-col ${msg.user_id === currentUserId ? 'items-end' : ''}`}>
                  <span className="text-[10px] text-text-muted">{msg.profiles?.display_name || msg.profiles?.username}</span>
                  <p className={`text-sm rounded-sm px-3 py-1.5 max-w-[200px] break-words ${
                    msg.user_id === currentUserId
                      ? 'bg-accent text-white'
                      : 'bg-tag-bg text-text-primary'
                  }`}>{msg.message}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 border-t border-border">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                className="flex-1 px-3 py-2 bg-bg border border-border rounded-sm text-sm focus:outline-none focus:border-accent"
                placeholder="Type a message..."
                disabled={party.status === 'completed' || party.status === 'cancelled'}
              />
              <button
                type="submit"
                disabled={!input.trim() || sending || party.status === 'completed' || party.status === 'cancelled'}
                className="p-2 bg-accent text-white rounded-sm hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {(party.status === 'completed' || party.status === 'cancelled') && (
              <p className="text-xs text-text-muted mt-2">This party has ended.</p>
            )}
            {sendError && <p className="text-xs text-red-500 mt-2">{sendError}</p>}
          </form>
        </div>
      </div>
    </div>
  )
}

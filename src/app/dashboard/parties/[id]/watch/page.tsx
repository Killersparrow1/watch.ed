'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Send, ArrowLeft, User, Tv, Film } from 'lucide-react'
import { getPosterUrl } from '@/lib/tmdb'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

declare global {
  interface Window {
    YT: { Player: any; PlayerState: { PLAYING: number } }
    onYouTubeIframeAPIReady?: () => void
  }
}

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
  current_time: number
  is_playing: boolean
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mkv|avi|mov|ogg)$/i.test(url)
}

function getStreamInfo(url: string | null): { type: 'youtube' | 'video' | 'gofile' | null; src: string | null } {
  if (!url) return { type: null, src: null }
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
  if (m) return { type: 'youtube', src: m[1] }
  if (url.includes('gofile.io') && isVideoUrl(url)) return { type: 'video', src: url }
  if (url.includes('gofile.io')) return { type: 'gofile', src: url }
  if (isVideoUrl(url)) return { type: 'video', src: url }
  return { type: 'gofile', src: url }
}

export default function WatchPartyPage() {
  const params = useParams()
  const [party, setParty] = useState<Party | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [messageError, setMessageError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const playerContainerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const ytPlayerRef = useRef<any>(null)
  const ytReadyRef = useRef(false)
  const isSyncingRef = useRef(false)

  const partyId = params.id as string
  const stream = getStreamInfo(party?.stream_url || null)
  const isHost = currentUserId === party?.host_id

  useEffect(() => {
    fetch(`/api/parties/${partyId}`).then(res => res.json()).then(data => {
      if (data.party) setParty(data.party)
    })
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id)
    })
  }, [partyId])

  useEffect(() => {
    if (stream.type !== 'youtube') return

    function init() {
      if (!playerContainerRef.current) return
      ytPlayerRef.current = new window.YT.Player(playerContainerRef.current, {
        videoId: stream.src,
        height: '100%',
        width: '100%',
        playerVars: { autoplay: 1, controls: 1 },
        events: {
          onReady: () => { ytReadyRef.current = true },
        },
      })
    }

    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
      window.onYouTubeIframeAPIReady = init
    } else {
      init()
    }

    return () => {
      ytReadyRef.current = false
      if (ytPlayerRef.current?.destroy) {
        ytPlayerRef.current.destroy()
        ytPlayerRef.current = null
      }
    }
  }, [party?.stream_url])

  useEffect(() => {
    if (!partyId) return

    const interval = setInterval(async () => {
      const [msgRes, partyRes] = await Promise.all([
        fetch(`/api/parties/${partyId}/messages`),
        fetch(`/api/parties/${partyId}`),
      ])

      if (!msgRes.ok) {
        const d = await msgRes.json().catch(() => ({ error: `Failed (${msgRes.status})` }))
        setMessageError(d.error || 'Failed to load messages')
      } else {
        setMessageError(null)
        const d = await msgRes.json()
        if (d.messages) setMessages(d.messages)
      }

      if (partyRes.ok) {
        const d = await partyRes.json()
        if (d.party) {
          setParty(p => p ? { ...p, current_time: d.party.current_time, is_playing: d.party.is_playing } : d.party)
        }
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [partyId])

  useEffect(() => {
    if (!isHost || !partyId) return

    const interval = setInterval(() => {
      let currentTime = 0
      let isPlaying = false

      if (stream.type === 'youtube' && ytPlayerRef.current && ytReadyRef.current) {
        currentTime = ytPlayerRef.current.getCurrentTime() || 0
        isPlaying = ytPlayerRef.current.getPlayerState() === window.YT.PlayerState.PLAYING
      } else if (stream.type === 'video' && videoRef.current) {
        currentTime = videoRef.current.currentTime || 0
        isPlaying = !videoRef.current.paused
      }

      if (stream.type !== null) {
        fetch(`/api/parties/${partyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ current_time: Math.floor(currentTime), is_playing: isPlaying }),
        }).catch(() => {})
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [isHost, partyId, stream.type])

  useEffect(() => {
    if (!party || isHost) return

    const info = getStreamInfo(party.stream_url)
    if (info.type === 'youtube') {
      if (!ytPlayerRef.current || !ytReadyRef.current) return
      const t = ytPlayerRef.current.getCurrentTime()
      if (Math.abs(t - party.current_time) > 3) {
        isSyncingRef.current = true
        ytPlayerRef.current.seekTo(party.current_time, true)
        setTimeout(() => { isSyncingRef.current = false }, 1000)
      }
      const playing = ytPlayerRef.current.getPlayerState() === window.YT.PlayerState.PLAYING
      if (party.is_playing && !playing) ytPlayerRef.current.playVideo()
      else if (!party.is_playing && playing) ytPlayerRef.current.pauseVideo()
    } else if (info.type === 'video' && videoRef.current) {
      const t = videoRef.current.currentTime
      if (Math.abs(t - party.current_time) > 3) {
        isSyncingRef.current = true
        videoRef.current.currentTime = party.current_time
        setTimeout(() => { isSyncingRef.current = false }, 1000)
      }
      if (party.is_playing && videoRef.current.paused) {
        videoRef.current.play().catch(() => {})
      } else if (!party.is_playing && !videoRef.current.paused) {
        videoRef.current.pause()
      }
    }
  }, [party?.current_time, party?.is_playing, isHost])

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

  function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${m}:${String(s).padStart(2, '0')}`
  }

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
        {party.current_time > 0 && (
          <span className="text-xs text-text-muted font-mono ml-auto">{formatTime(party.current_time)}</span>
        )}
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex items-center justify-center bg-black relative">
          {stream.type === 'youtube' ? (
            <div ref={playerContainerRef} className="w-full h-full" />
          ) : stream.type === 'video' ? (
            <video
              ref={videoRef}
              src={stream.src!}
              className="w-full h-full"
              controls
              autoPlay
              playsInline
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
          ) : (
            <div className="text-center p-8">
              <p className="text-white text-lg mb-2">No stream link set</p>
              <p className="text-gray-400 text-sm">The host hasn&apos;t added a stream URL yet.</p>
              <p className="text-gray-400 text-sm mt-1">Use the chat to coordinate!</p>
            </div>
          )}
          {!isHost && stream.type !== null && (
            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-sm">
              Synced to host — {formatTime(party.current_time)}
            </div>
          )}
          {isHost && stream.type !== null && (
            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-sm">
              Host — {party.is_playing ? 'Playing' : 'Paused'}
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
            {messageError && (
              <p className="text-xs text-red-500 text-center py-4">{messageError}</p>
            )}
            {!messageError && messages.length === 0 && (
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

'use client'

import { useState, useEffect, useRef } from 'react'
import { Search as SearchIcon, Film, Tv, User, X, Loader2 } from 'lucide-react'
import { getPosterUrl } from '@/lib/tmdb'
import Link from 'next/link'

interface SearchEntry {
  id: string
  title: string
  type: 'movie' | 'series'
  year: number | null
  poster_path: string | null
  rating: number | null
  status: string
  user_id: string
}

interface SearchProfile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [entries, setEntries] = useState<SearchEntry[]>([])
  const [profiles, setProfiles] = useState<SearchProfile[]>([])
  const [myEntries, setMyEntries] = useState<SearchEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setEntries([])
      setProfiles([])
      setMyEntries([])
      setSearched(false)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      setSearched(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
        if (res.ok) {
          const data = await res.json()
          setEntries(data.entries || [])
          setProfiles(data.profiles || [])
          setMyEntries(data.myEntries || [])
        }
      } catch {
        // ignore
      }
      setLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const statusColors: Record<string, string> = {
    watching: 'text-status-watching bg-status-watching/10',
    completed: 'text-status-completed bg-status-completed/10',
    on_hold: 'text-status-on-hold bg-status-on-hold/10',
    dropped: 'text-status-dropped bg-status-dropped/10',
    plan_to_watch: 'text-status-plan bg-status-plan/10',
  }

  const statusLabels: Record<string, string> = {
    watching: 'Watching',
    completed: 'Completed',
    on_hold: 'On Hold',
    dropped: 'Dropped',
    plan_to_watch: 'Plan to Watch',
  }

  function EntryCard({ entry }: { entry: SearchEntry }) {
    return (
      <Link
        href={`/dashboard/edit/${entry.id}`}
        className="flex items-center gap-3 p-2 rounded-sm hover:bg-tag-bg transition-colors group"
      >
        <div className="w-10 h-14 shrink-0 rounded-sm overflow-hidden bg-tag-bg flex items-center justify-center">
          {entry.poster_path ? (
            <img src={getPosterUrl(entry.poster_path, 'w185') || ''} alt="" className="w-full h-full object-cover" />
          ) : (
            entry.type === 'movie' ? <Film className="w-4 h-4 text-text-secondary" /> : <Tv className="w-4 h-4 text-text-secondary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate group-hover:text-accent transition-colors">{entry.title}</p>
          <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5">
            {entry.year && <span>{entry.year}</span>}
            <span>{entry.type === 'movie' ? 'Film' : 'Series'}</span>
            {entry.rating && <span>{entry.rating}/10</span>}
          </div>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${statusColors[entry.status]}`}>
          {statusLabels[entry.status]}
        </span>
      </Link>
    )
  }

  function ProfileCard({ profile }: { profile: SearchProfile }) {
    return (
      <Link
        href={`/${profile.username}`}
        className="flex items-center gap-3 p-2 rounded-sm hover:bg-tag-bg transition-colors group"
      >
        <div className="w-10 h-10 shrink-0 rounded-full overflow-hidden bg-tag-bg flex items-center justify-center">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-text-secondary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate group-hover:text-accent transition-colors">
            {profile.display_name || profile.username}
          </p>
          <p className="text-xs text-text-secondary truncate">@{profile.username}</p>
        </div>
        {profile.bio && (
          <p className="text-xs text-text-secondary truncate max-w-[200px] hidden sm:block">{profile.bio}</p>
        )}
      </Link>
    )
  }

  const hasResults = entries.length > 0 || profiles.length > 0 || myEntries.length > 0

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="relative mb-6">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search entries, people..."
          className="w-full pl-10 pr-10 py-3 bg-bg border border-border rounded-sm text-sm focus:outline-none focus:border-accent"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-text-secondary" />
        </div>
      )}

      {searched && !loading && !hasResults && (
        <div className="text-center py-16 text-text-secondary">
          <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No results for &ldquo;{query}&rdquo;</p>
          <p className="text-sm mt-1">Try different keywords or check your spelling.</p>
        </div>
      )}

      {!loading && hasResults && (
        <div className="space-y-8">
          {myEntries.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">My Entries ({myEntries.length})</h2>
              <div className="border border-border rounded-sm divide-y divide-border">
                {myEntries.map(entry => (
                  <EntryCard key={entry.id} entry={entry} />
                ))}
              </div>
            </section>
          )}

          {entries.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">Entries ({entries.length})</h2>
              <div className="border border-border rounded-sm divide-y divide-border">
                {entries.map(entry => (
                  <EntryCard key={entry.id} entry={entry} />
                ))}
              </div>
            </section>
          )}

          {profiles.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">People ({profiles.length})</h2>
              <div className="border border-border rounded-sm divide-y divide-border">
                {profiles.map(profile => (
                  <ProfileCard key={profile.id} profile={profile} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

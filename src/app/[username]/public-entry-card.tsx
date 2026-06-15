'use client'

import { useState } from 'react'
import { getEntryPosterUrl } from '@/lib/tmdb'
import { Entry } from '@/types/database'
import { Film, Tv, Star, ArrowBigUp, ArrowBigDown, Award, Zap, Share2 } from 'lucide-react'
import { renderNotes } from '@/lib/render-notes'
import ShareModal from '@/components/share-modal'

interface Props {
  entry: Entry
  likes: number
  dislikes: number
  profileUsername: string
  profileDisplayName: string
  profileAvatarUrl: string | null
}

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

export default function PublicEntryCard({ entry, likes: initialLikes, dislikes: initialDislikes, profileUsername, profileDisplayName, profileAvatarUrl }: Props) {
  const [likes, setLikes] = useState(initialLikes)
  const [dislikes, setDislikes] = useState(initialDislikes)
  const [userReaction, setUserReaction] = useState<string | null>(null)
  const [showShare, setShowShare] = useState(false)

  const poster = getEntryPosterUrl(entry, 'w342')

  async function handleReaction(reaction: 'like' | 'dislike') {
    const res = await fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id: entry.id, reaction }),
    })

    if (!res.ok) return

    const data = await res.json()

    if (data.action === 'created') {
      if (reaction === 'like') setLikes(prev => prev + 1)
      else setDislikes(prev => prev + 1)
      setUserReaction(reaction)
    } else if (data.action === 'updated') {
      if (reaction === 'like') {
        setLikes(prev => prev + 1)
        setDislikes(prev => Math.max(0, prev - 1))
      } else {
        setDislikes(prev => prev + 1)
        setLikes(prev => Math.max(0, prev - 1))
      }
      setUserReaction(reaction)
    } else if (data.action === 'removed') {
      if (reaction === 'like') setLikes(prev => Math.max(0, prev - 1))
      else setDislikes(prev => Math.max(0, prev - 1))
      setUserReaction(null)
    }
  }

  return (
    <div className="bg-surface border border-border rounded-sm overflow-hidden flex" onContextMenu={(e) => e.preventDefault()}>
      <div className="w-28 flex-shrink-0 self-start bg-tag-bg">
        {poster ? (
          <img src={poster} alt={entry.title} className="w-full aspect-[2/3] object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {entry.type === 'movie' ? (
              <Film className="w-6 h-6 text-text-muted/40" />
            ) : (
              <Tv className="w-6 h-6 text-text-muted/40" />
            )}
          </div>
        )}
      </div>

      <div className="flex-1 p-4 flex flex-col gap-2 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="heading-sm leading-tight">{entry.title}</h3>
            <div className="flex items-center gap-2 text-xs text-text-muted mt-1">
              {entry.year && <span>{entry.year}</span>}
              <span className="w-1 h-1 rounded-full bg-border" />
              <span>{entry.type === 'movie' ? 'Film' : 'Series'}</span>
              {entry.runtime && (
                <>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span>{entry.runtime >= 60 ? `${Math.floor(entry.runtime / 60)}h ${entry.runtime % 60}m` : `${entry.runtime}m`}</span>
                </>
              )}
            </div>
          </div>
          <span className={`inline-flex text-xs px-2 py-0.5 rounded-sm font-medium whitespace-nowrap ${statusColors[entry.status]}`}>
            {statusLabels[entry.status]}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {entry.rating && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="w-4 h-4 text-rating fill-current" />
              <span className="font-medium">{entry.rating}/10</span>
            </div>
          )}
          {entry.badge === 'golden' && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-sm font-medium bg-rating/10 text-rating">
              <Award className="w-4 h-4 fill-current" />
              Golden ticket
            </span>
          )}
          {entry.badge === 'wammale cinema' && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-sm font-medium bg-cyan-900/20 text-cyan-700">
              <img src="/badges/wammale-cinema.svg" className="w-5 h-5" alt="" />
              wammale cinema
            </span>
          )}
          {entry.badge === 'MalamCult' && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-sm font-medium bg-rose-900/20 text-rose-700">
              <img src="/badges/malamcult.svg" className="w-5 h-5" alt="" />
              MalamCult
            </span>
          )}
          {entry.badge === 'absolute appi' && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-sm font-medium bg-amber-900/20 text-amber-800">
              <img src="/badges/absoluteappi.svg" className="w-5 h-5" alt="" />
              absolute appi
            </span>
          )}
        </div>

        {entry.type === 'series' && (entry.progress_season || entry.progress_episode) && (
          <p className="body-xs text-text-secondary">
            {entry.progress_season ? `S${entry.progress_season}` : ''}{entry.progress_episode ? ` E${entry.progress_episode}` : ''}
          </p>
        )}

        {entry.tagline && (
          <p className="text-xs italic text-text-muted line-clamp-1">&ldquo;{entry.tagline}&rdquo;</p>
        )}

        {entry.cast_crew && (
          <p className="text-xs text-text-muted">{entry.cast_crew}</p>
        )}

        {entry.notes && (
          <div className="text-sm text-text-secondary leading-relaxed">
            {renderNotes(entry.notes)}
          </div>
        )}

        <div className="flex items-center gap-3 mt-auto pt-2 border-t border-border-light">
          <button
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleReaction('like')}
            className={`flex items-center gap-1 text-xs transition-colors ${
              userReaction === 'like' ? 'text-like' : 'text-text-muted hover:text-like'
            }`}
          >
            <ArrowBigUp className={`w-4 h-4 ${userReaction === 'like' ? 'fill-current' : ''}`} />
            {likes > 0 && <span>{likes}</span>}
          </button>
          <button
            onClick={() => handleReaction('dislike')}
            className={`flex items-center gap-1 text-xs transition-colors ${
              userReaction === 'dislike' ? 'text-dislike' : 'text-text-muted hover:text-dislike'
            }`}
          >
            <ArrowBigDown className={`w-4 h-4 ${userReaction === 'dislike' ? 'fill-current' : ''}`} />
            {dislikes > 0 && <span>{dislikes}</span>}
          </button>
        </div>
      </div>

      {showShare && (
        <ShareModal
          entry={entry}
          username={profileUsername}
          displayName={profileDisplayName}
          avatarUrl={profileAvatarUrl}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  )
}

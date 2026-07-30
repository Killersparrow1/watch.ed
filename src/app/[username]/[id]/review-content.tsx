'use client'

import { useState } from 'react'
import { Star, ThumbsUp, ThumbsDown, Link as LinkIcon, Check } from 'lucide-react'
import { renderNotes } from '@/lib/render-notes'
import type { Entry, WatchEvent } from '@/types/database'

interface Props {
  entry: Entry
  watchEvents: WatchEvent[]
  likes: number
  dislikes: number
  username: string
}

export default function ReviewContent({ entry, watchEvents, likes, dislikes, username }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopyLink() {
    const url = `${window.location.origin}/${username}/${entry.id}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = url
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-6">
      {(entry.notes || entry.watch_date || entry.rating) && (
        <div className="p-4 bg-surface border border-border rounded-sm">
          <div className="flex items-center gap-2 text-sm mb-2">
            {entry.watch_date && (
              <span className="text-text-primary font-medium">{entry.watch_date}</span>
            )}
            {entry.rating && (
              <span className="text-xs text-rating flex items-center gap-0.5 ml-auto">
                <Star className="w-3.5 h-3.5 fill-current" /> {entry.rating}
              </span>
            )}
          </div>
          {entry.notes && (
            <div className="text-sm text-text-secondary leading-relaxed">
              {renderNotes(entry.notes)}
            </div>
          )}
        </div>
      )}

      {watchEvents.length > 0 && (
        <div>
          <h2 className="heading-sm mb-3">Watch Events</h2>
          <div className="space-y-3">
            {watchEvents.map((event) => (
              <div key={event.id} className="p-4 bg-surface border border-border rounded-sm">
                <div className="flex items-center gap-2 text-sm mb-2">
                  <span className="text-text-primary font-medium">{event.watch_date}</span>
                  {event.season_number != null && (
                    <span className="text-xs text-text-muted">
                      S{event.season_number}{event.episode_number != null ? `E${event.episode_number}` : ''}
                    </span>
                  )}
                  {event.rating && (
                    <span className="text-xs text-rating flex items-center gap-0.5 ml-auto">
                      <Star className="w-3 h-3 fill-current" /> {event.rating}
                    </span>
                  )}
                </div>
                {event.notes && (
                  <div className="text-sm text-text-secondary leading-relaxed">
                    {renderNotes(event.notes)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!entry.notes && !entry.rating && watchEvents.length === 0 && (
        <p className="text-sm text-text-muted text-center py-8">No review for this entry.</p>
      )}

      <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border">
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="flex items-center gap-1">
            <ThumbsUp className="w-4 h-4" />
            {likes}
          </span>
          <span className="flex items-center gap-1">
            <ThumbsDown className="w-4 h-4" />
            {dislikes}
          </span>
        </div>

        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <LinkIcon className="w-4 h-4" />
              Copy link
            </>
          )}
        </button>
      </div>
    </div>
  )
}

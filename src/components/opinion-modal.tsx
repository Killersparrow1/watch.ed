'use client'

import { useEffect } from 'react'
import { Entry, WatchEvent } from '@/types/database'
import { Star, X, Eye } from 'lucide-react'
import { renderNotes } from '@/lib/render-notes'

interface Props {
  entry: Entry
  entryWatchEvents: WatchEvent[]
  isOpen: boolean
  onClose: () => void
}

export default function OpinionModal({ entry, entryWatchEvents, isOpen, onClose }: Props) {

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-surface border border-border rounded-sm p-5 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Eye className="w-4 h-4 text-accent" />
            Reviews &mdash; {entry.title}
          </h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          {(entry.notes || entry.rating) && (
            <div className="p-3 bg-tag-bg border border-accent/10 rounded-sm">
              <div className="flex items-center gap-2 text-sm">
                {entry.watch_date && <span className="text-text-primary font-medium">{entry.watch_date}</span>}
                {entry.rating && (
                  <span className="text-xs text-rating flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-current" /> {entry.rating}
                  </span>
                )}
              </div>
              {entry.notes && (
                <div className="text-xs text-text-secondary mt-1 leading-relaxed">
                  {renderNotes(entry.notes)}
                </div>
              )}
            </div>
          )}
          {entryWatchEvents.map(event => (
            <div key={event.id} className="p-3 bg-tag-bg border border-border rounded-sm">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-text-primary font-medium">{event.watch_date}</span>
                {event.season_number != null && (
                  <span className="text-xs text-text-muted">
                    S{event.season_number}{event.episode_number != null ? `E${event.episode_number}` : ''}
                  </span>
                )}
                {event.rating && (
                  <span className="text-xs text-rating flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-current" /> {event.rating}
                  </span>
                )}
              </div>
              {event.notes && (
                <div className="text-xs text-text-secondary mt-1 leading-relaxed">
                  {renderNotes(event.notes)}
                </div>
              )}
            </div>
          ))}
          {!entry.notes && !entry.rating && entryWatchEvents.length === 0 && (
            <p className="text-xs text-text-muted text-center py-4">No reviews yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
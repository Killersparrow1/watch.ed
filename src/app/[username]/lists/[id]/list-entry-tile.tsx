'use client'

import { useState } from 'react'
import { Star, X, Eye } from 'lucide-react'
import { getEntryPosterUrl } from '@/lib/tmdb'
import type { Entry, WatchEvent } from '@/types/database'
import { renderNotes } from '@/lib/render-notes'

interface Props {
  entry: Entry
  watchEvents: WatchEvent[]
}

export default function ListEntryTile({ entry, watchEvents }: Props) {
  const [showOpinion, setShowOpinion] = useState(false)

  const posterUrl = getEntryPosterUrl(entry, 'w185')
  const hasOpinion = !!entry.rating || !!entry.notes || watchEvents.length > 0

  return (
    <>
      <div
        key={entry.id}
        role={hasOpinion ? 'button' : undefined}
        tabIndex={hasOpinion ? 0 : undefined}
        onClick={hasOpinion ? () => setShowOpinion(true) : undefined}
        onKeyDown={hasOpinion ? (e) => { if (e.key === 'Enter' || e.key === ' ') setShowOpinion(true) } : undefined}
        className={`bg-surface border border-border rounded-sm overflow-hidden group ${hasOpinion ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className="aspect-[2/3] bg-tag-bg relative">
          {posterUrl ? (
            <img src={posterUrl} alt={entry.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted text-xs p-2 text-center">
              {entry.title}
            </div>
          )}
          {entry.rating && (
            <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-surface/90 border border-border rounded-sm text-xs font-medium text-text-primary flex items-center gap-1">
              <Star className="w-3 h-3 text-rating fill-current" />
              {entry.rating}/10
            </div>
          )}
          {hasOpinion && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <span className="inline-flex items-center gap-1.5 text-xs text-white font-medium">
                <Eye className="w-4 h-4" />
                View opinion
              </span>
            </div>
          )}
        </div>
        <div className="p-2">
          <p className="text-xs text-text-primary truncate font-medium group-hover:text-accent transition-colors">{entry.title}</p>
          <p className="body-xs text-text-muted">{entry.year || ''}</p>
        </div>
      </div>

      {showOpinion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowOpinion(false)}>
          <div className="w-full max-w-md bg-surface border border-border rounded-sm p-5 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4 text-accent" />
                Reviews &mdash; {entry.title}
              </h3>
              <button onClick={() => setShowOpinion(false)} className="text-text-secondary hover:text-text-primary">
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
              {watchEvents.map(event => (
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
              {!entry.notes && !entry.rating && watchEvents.length === 0 && (
                <p className="text-xs text-text-muted text-center py-4">No reviews yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
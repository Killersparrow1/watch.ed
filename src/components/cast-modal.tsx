'use client'

import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { getPosterUrl } from '@/lib/tmdb'
import type { TMDBCastMember } from '@/lib/tmdb'

interface Props {
  tmdbId: number | null
  mediaType: 'movie' | 'series' | null
  title: string
  onClose: () => void
}

export default function CastModal({ tmdbId, mediaType, title, onClose }: Props) {
  const [cast, setCast] = useState<TMDBCastMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tmdbId || !mediaType) {
      setLoading(false)
      setError('No cast data available')
      return
    }

    setLoading(true)
    setError(null)

    fetch(`/api/tmdb/cast?tmdb_id=${tmdbId}&type=${mediaType}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch cast')
        return res.json()
      })
      .then((data) => {
        setCast(data.cast || [])
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [tmdbId, mediaType])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-surface border border-border rounded-sm max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-shrink-0">
          <h3 className="text-sm font-semibold">Cast &mdash; {title}</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 flex-1">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-text-muted animate-spin" />
            </div>
          )}

          {error && (
            <p className="text-xs text-text-muted text-center py-8">{error}</p>
          )}

          {!loading && !error && cast.length === 0 && (
            <p className="text-xs text-text-muted text-center py-8">No cast information available.</p>
          )}

          {!loading && !error && cast.length > 0 && (
            <div className="space-y-2">
              {cast.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-2 rounded-sm hover:bg-tag-bg transition-colors">
                  <div className="w-10 h-10 rounded-sm overflow-hidden bg-tag-bg flex-shrink-0">
                    {member.profile_path ? (
                      <img
                        src={getPosterUrl(member.profile_path, 'w92') || ''}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-text-muted">
                        ?
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    {member.character && (
                      <p className="text-xs text-text-muted truncate">{member.character}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

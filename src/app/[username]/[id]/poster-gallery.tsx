'use client'

import { useState } from 'react'
import { X, ExternalLink, Images } from 'lucide-react'
import type { EntryPoster } from '@/types/database'

interface Props {
  posters: EntryPoster[]
}

export default function PosterGallery({ posters }: Props) {
  const [selected, setSelected] = useState<EntryPoster | null>(null)

  if (posters.length === 0) return null

  const ordered = [...posters].sort((a, b) => a.position - b.position)

  return (
    <div className="mt-8">
      <h2 className="heading-sm mb-4 flex items-center gap-2">
        <Images className="w-4 h-4 text-text-muted" />
        Poster collection{posters.length > 0 ? ` (${posters.length})` : ''}
      </h2>
      <div className="flex flex-wrap gap-3">
        {ordered.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p)}
            className="w-20 md:w-24 flex-shrink-0 group"
            title="View poster"
          >
            <img
              src={p.image_url}
              alt="Poster"
              loading="lazy"
              className="w-full aspect-[2/3] object-cover rounded-sm border border-border bg-tag-bg group-hover:border-accent group-hover:ring-1 group-hover:ring-accent transition-all"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </button>
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 md:p-8"
          onClick={() => setSelected(null)}
        >
          <div className="flex flex-col md:flex-row gap-4 items-center max-h-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={selected.image_url}
              alt="Poster"
              className="max-h-[80vh] max-w-full md:max-w-[38vw] rounded-sm shadow-2xl object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            {selected.links && selected.links.length > 0 && (
              <div className="flex flex-col gap-2 flex-shrink-0">
                <p className="text-xs text-text-muted text-center md:text-left">Links</p>
                {selected.links.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-accent text-white rounded-sm text-sm hover:bg-accent-hover transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {link.label || 'Open link'}
                  </a>
                ))}
              </div>
            )}
            <button
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
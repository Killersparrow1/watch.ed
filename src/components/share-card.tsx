import { forwardRef } from 'react'
import { Entry } from '@/types/database'
import { getEntryPosterUrl } from '@/lib/tmdb'
import { Award, Zap } from 'lucide-react'

function proxyUrl(url: string) {
  if (url.startsWith('https://image.tmdb.org/')) return url
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

interface Props {
  entry: Entry
  username: string
  displayName: string
  avatarUrl: string | null
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className="w-3 h-3 rounded-sm"
          style={{ backgroundColor: i < rating ? '#F59E0B' : '#2A2A2A' }}
        />
      ))}
    </div>
  )
}

const DIRECT_IMAGE_RE = /(https?:\/\/[^\s]+?\.(?:gif|png|jpe?g|webp)(?:\?[^\s]*)?)/gi
const GIPHY_PAGE_RE = /https?:\/\/(?:www\.)?giphy\.com\/gifs\/([^\s]+)/gi

function giphyUrlToDirect(url: string): string {
  return url.replace(GIPHY_PAGE_RE, (_, slug) => {
    const parts = slug.split('-')
    return `https://media.giphy.com/media/${parts[parts.length - 1]}/giphy.gif`
  })
}

function parseNoteSegments(text: string): { type: 'text' | 'image'; value: string }[] {
  const normalized = giphyUrlToDirect(text)
  const parts: { type: 'text' | 'image'; value: string }[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  const re = new RegExp(DIRECT_IMAGE_RE.source, 'gi')
  while ((match = re.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: normalized.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'image', value: match[0] })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < normalized.length) {
    parts.push({ type: 'text', value: normalized.slice(lastIndex) })
  }
  return parts.length > 0 ? parts : [{ type: 'text', value: text }]
}

const ShareCard = forwardRef<HTMLDivElement, Props>(
  ({ entry, username, displayName, avatarUrl }, ref) => {
    const poster = getEntryPosterUrl(entry, 'w342')
    const noteSegments = entry.notes ? parseNoteSegments(entry.notes) : []

    return (
      <div
        ref={ref}
        style={{
          width: 540,
          height: 675,
          backgroundColor: '#141414',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          fontFamily: 'Outfit, system-ui, sans-serif',
        }}
      >
        {poster && (
          <img
            src={proxyUrl(poster!)}
            alt=""
            crossOrigin="anonymous"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.15,
              filter: 'blur(4px)',
            }}
          />
        )}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, #141414 0%, rgba(20,20,20,0.6) 50%, rgba(20,20,20,0.3) 100%)',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            padding: 32,
          }}
        >
          <div style={{ display: 'flex', gap: 24, flex: 1 }}>
            {poster && (
              <div style={{ flexShrink: 0, width: 160 }}>
                <img
                  src={proxyUrl(poster!)}
                  alt=""
                  crossOrigin="anonymous"
                  style={{
                    width: '100%',
                    borderRadius: 8,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>
                {entry.year || 'N/A'} &middot; {entry.type === 'movie' ? 'Film' : 'Series'}
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2 }}>
                {entry.title}
              </h1>

              {entry.rating && (
                <div style={{ marginTop: 12 }}>
                  <Stars rating={entry.rating} />
                  <div style={{ fontSize: 13, color: '#F59E0B', marginTop: 2, fontWeight: 600 }}>
                    {entry.rating}/10
                  </div>
                </div>
              )}

              {entry.badge === 'golden' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 12, color: '#F59E0B' }}>
                  <Award className="w-3.5 h-3.5 fill-current" />
                  Golden ticket
                </div>
              )}
              {entry.badge === 'literal shit' && (
                <div style={{ marginTop: 8, fontSize: 10, color: '#bbb', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>
                  Literal shit
                </div>
              )}
              {entry.badge === 'lamo' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 12, color: '#8B5CF6' }}>
                  <Zap className="w-3.5 h-3.5" />
                  LAMO
                </div>
              )}
            </div>
          </div>

          {noteSegments.length > 0 && (
            <div
              style={{
                marginTop: 16,
                padding: '12px 16px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.08)',
                maxHeight: 200,
                overflow: 'hidden',
              }}
            >
              {noteSegments.slice(0, 6).map((seg, i) => {
                if (seg.type === 'image') {
                  return (
                    <img
                      key={i}
                      src={proxyUrl(seg.value)}
                      alt=""
                      crossOrigin="anonymous"
                      style={{ maxWidth: '100%', maxHeight: 80, borderRadius: 4, margin: '4px 0', display: 'block' }}
                    />
                  )
                }
                const text = seg.value.trim()
                if (!text) return null
                const truncated = text.length > 200 ? text.slice(0, 200) + '...' : text
                return (
                  <span key={i} style={{ fontSize: 14, color: '#ccc', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {truncated}
                  </span>
                )
              })}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 'auto',
              paddingTop: 20,
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {avatarUrl ? (
                <img
                  src={proxyUrl(avatarUrl!)}
                  alt=""
                  crossOrigin="anonymous"
                  style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: '#2A2A2A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#888',
                  }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span style={{ fontSize: 13, color: '#888' }}>@{username}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#C0392B' }}>watch</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#555' }}>.ed</span>
            </div>
          </div>
        </div>
      </div>
    )
  }
)

ShareCard.displayName = 'ShareCard'
export default ShareCard

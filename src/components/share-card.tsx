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
            padding: '28px 32px 20px',
          }}
        >
          <div style={{ display: 'flex', gap: 20 }}>
            {poster && (
              <div style={{ flexShrink: 0, width: 110 }}>
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

            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>
                {entry.year || 'N/A'} &middot; {entry.type === 'movie' ? 'Film' : 'Series'}
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2 }}>
                {entry.title}
              </h1>

              {entry.rating && (
                <div style={{ marginTop: 8 }}>
                  <Stars rating={entry.rating} />
                  <div style={{ fontSize: 12, color: '#F59E0B', marginTop: 1, fontWeight: 600 }}>
                    {entry.rating}/10
                  </div>
                </div>
              )}

              {entry.badge === 'golden' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, color: '#F59E0B' }}>
                  <Award className="w-3 h-3 fill-current" />
                  Golden ticket
                </div>
              )}
              {entry.badge === 'literal shit' && (
                <div style={{ marginTop: 6, fontSize: 9, color: '#bbb', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>
                  Literal shit
                </div>
              )}
              {entry.badge === 'lamo' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, color: '#8B5CF6' }}>
                  <Zap className="w-3 h-3" />
                  LAMO
                </div>
              )}

              {entry.tagline && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#aaa', fontStyle: 'italic', lineHeight: 1.3 }}>
                  &ldquo;{entry.tagline.length > 80 ? entry.tagline.slice(0, 80) + '...' : entry.tagline}&rdquo;
                </div>
              )}
            </div>
          </div>

          {noteSegments.length > 0 && (
            <div
              style={{
                marginTop: 10,
                padding: '10px 14px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.08)',
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
                      style={{ maxWidth: '100%', maxHeight: 70, borderRadius: 4, margin: '3px 0', display: 'block' }}
                    />
                  )
                }
                const text = seg.value.trim()
                if (!text) return null
                const truncated = text.length > 300 ? text.slice(0, 300) + '...' : text
                return (
                  <span key={i} style={{ fontSize: 13, color: '#ccc', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {truncated}
                  </span>
                )
              })}
            </div>
          )}

          {entry.cast_crew && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#777', lineHeight: 1.4 }}>
              <span style={{ color: '#999', fontWeight: 600 }}>Cast: </span>
              {entry.cast_crew}
            </div>
          )}

          {entry.overview && !noteSegments.length && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#888', lineHeight: 1.4 }}>
              {entry.overview.length > 200 ? entry.overview.slice(0, 200) + '...' : entry.overview}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 'auto',
              paddingTop: 16,
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {avatarUrl ? (
                <img
                  src={proxyUrl(avatarUrl!)}
                  alt=""
                  crossOrigin="anonymous"
                  style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: '#2A2A2A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#888',
                  }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span style={{ fontSize: 12, color: '#888' }}>@{username}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#C0392B' }}>watch</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>.ed</span>
            </div>
          </div>
        </div>
      </div>
    )
  }
)

ShareCard.displayName = 'ShareCard'
export default ShareCard

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
    const imageSegments = noteSegments.filter(s => s.type === 'image')
    const textSegments = noteSegments.filter(s => s.type === 'text')

    const genreStr = entry.genres && entry.genres.length > 0
      ? entry.genres.slice(0, 3).join(', ')
      : null

    function renderNoteText() {
      const combined = textSegments.map(s => s.value).join(' ').trim()
      if (!combined) return null
      const truncated = combined.length > 350 ? combined.slice(0, 350) + '...' : combined
      return (
        <span style={{ fontSize: 14, color: '#ccc', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {truncated}
        </span>
      )
    }

    const hasExtraInfo = entry.runtime || genreStr || entry.watch_date
    const hasReview = Boolean(renderNoteText()) || imageSegments.length > 0

    return (
      <div
        ref={ref}
        style={{
          width: 540,
          height: 675,
          backgroundColor: '#141414',
          display: 'flex',
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
            background: 'linear-gradient(to right, #141414 0%, rgba(20,20,20,0.85) 50%, rgba(20,20,20,0.95) 100%)',
          }}
        />

        {poster && (
          <div style={{ position: 'relative', zIndex: 1, flexShrink: 0, width: 140 }}>
            <img
              src={proxyUrl(poster!)}
              alt=""
              crossOrigin="anonymous"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
        )}

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flex: 1,
            padding: '28px 28px 18px 22px',
            minWidth: 0,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>
              {entry.year || 'N/A'} &middot; {entry.type === 'movie' ? 'Film' : 'Series'}
            </div>
            <h1 style={{ fontSize: 21, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2 }}>
              {entry.title}
            </h1>

            {entry.rating && (
              <div style={{ marginTop: 6 }}>
                <Stars rating={entry.rating} />
                <div style={{ fontSize: 11, color: '#F59E0B', marginTop: 1, fontWeight: 600 }}>
                  {entry.rating}/10
                </div>
              </div>
            )}

            {entry.badge === 'golden' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 4, fontSize: 10, color: '#F59E0B' }}>
                <Award className="w-2.5 h-2.5 fill-current" />
                Golden ticket
              </div>
            )}
            {entry.badge === 'literal shit' && (
              <div style={{ marginTop: 4, fontSize: 8, color: '#bbb', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>
                Literal shit
              </div>
            )}
            {entry.badge === 'lamo' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 4, fontSize: 10, color: '#8B5CF6' }}>
                <Zap className="w-2.5 h-2.5" />
                LAMO
              </div>
            )}

            {entry.tagline && (
              <div style={{ marginTop: 4, fontSize: 11, color: '#aaa', fontStyle: 'italic', lineHeight: 1.3 }}>
                &ldquo;{entry.tagline.length > 100 ? entry.tagline.slice(0, 100) + '...' : entry.tagline}&rdquo;
              </div>
            )}

            {entry.cast_crew && (
              <div style={{ marginTop: 8, fontSize: 10, color: '#777', lineHeight: 1.4 }}>
                <span style={{ color: '#999', fontWeight: 600 }}>Cast: </span>
                {entry.cast_crew.length > 120 ? entry.cast_crew.slice(0, 120) + '...' : entry.cast_crew}
              </div>
            )}
          </div>

          {hasReview && (
            <div>
              {renderNoteText() && (
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {renderNoteText()}
                </div>
              )}

              {imageSegments.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 4,
                    marginTop: renderNoteText() ? 6 : 0,
                  }}
                >
                  {imageSegments.slice(0, 4).map((seg, i) => (
                    <img
                      key={i}
                      src={proxyUrl(seg.value)}
                      alt=""
                      crossOrigin="anonymous"
                      style={{
                        width: imageSegments.length === 1 ? '100%' : 'calc(50% - 2px)',
                        maxHeight: imageSegments.length === 1 ? 80 : 70,
                        borderRadius: 4,
                        objectFit: 'cover',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            {hasExtraInfo && (
              <div style={{ fontSize: 10, color: '#666', lineHeight: 1.4 }}>
                {entry.runtime && (
                  <span>
                    {entry.runtime >= 60
                      ? `${Math.floor(entry.runtime / 60)}h ${entry.runtime % 60}m`
                      : `${entry.runtime}m`}
                  </span>
                )}
                {genreStr && (
                  <span> &middot; {genreStr}</span>
                )}
                {entry.watch_date && (
                  <div style={{ marginTop: 2 }}>
                    Watched: {entry.watch_date}
                  </div>
                )}
              </div>
            )}

            {entry.overview && !hasReview && (
              <div style={{ fontSize: 11, color: '#888', lineHeight: 1.4, marginTop: hasExtraInfo ? 4 : 0 }}>
                {entry.overview.length > 150 ? entry.overview.slice(0, 150) + '...' : entry.overview}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 10,
                paddingTop: 12,
                borderTop: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {avatarUrl ? (
                  <img
                    src={proxyUrl(avatarUrl!)}
                    alt=""
                    crossOrigin="anonymous"
                    style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      backgroundColor: '#2A2A2A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#888',
                    }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span style={{ fontSize: 11, color: '#888' }}>@{username}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#C0392B' }}>watch</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>.ed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
)

ShareCard.displayName = 'ShareCard'
export default ShareCard

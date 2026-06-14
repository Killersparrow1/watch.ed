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
    <div className="flex items-center gap-[3px]">
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className="w-[11px] h-[11px] rounded-sm"
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
      return truncated
    }

    const noteText = renderNoteText()
    const hasReview = Boolean(noteText) || imageSegments.length > 0

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
              opacity: 0.12,
              filter: 'blur(8px)',
            }}
          />
        )}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(20,20,20,0.4) 0%, #141414 80%)',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            padding: '28px 28px 18px',
          }}
        >
          <div style={{ display: 'flex', gap: 20 }}>
            {poster && (
              <div style={{ width: 130, flexShrink: 0 }}>
                <img
                  src={proxyUrl(poster!)}
                  alt=""
                  crossOrigin="anonymous"
                  style={{ width: '100%', display: 'block', borderRadius: 6, backgroundColor: '#000' }}
                />
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: '#999', marginBottom: 3 }}>
                {entry.year || 'N/A'} &middot; {entry.type === 'movie' ? 'Film' : 'Series'}
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.15 }}>
                {entry.title}
              </h1>

              {entry.rating && (
                <div style={{ marginTop: 6 }}>
                  <Stars rating={entry.rating} />
                  <div style={{ fontSize: 11, color: '#F59E0B', marginTop: 2, fontWeight: 700 }}>
                    {entry.rating}/10
                  </div>
                </div>
              )}

              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {entry.badge === 'golden' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 7px', backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 4, fontSize: 10, color: '#F59E0B', fontWeight: 600 }}>
                    <Award className="w-[11px] h-[11px] fill-current" />
                    Golden ticket
                  </div>
                )}
                {entry.badge === 'lamo' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 7px', backgroundColor: 'rgba(139,92,246,0.1)', borderRadius: 4, fontSize: 10, color: '#8B5CF6', fontWeight: 600 }}>
                    <Zap className="w-[11px] h-[11px]" />
                    LAMO
                  </div>
                )}
                {entry.badge === 'literal shit' && (
                  <div style={{ padding: '3px 7px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, fontSize: 9, color: '#bbb', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 800 }}>
                    Literal shit
                  </div>
                )}
              </div>

              {entry.tagline && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#bbb', fontStyle: 'italic', lineHeight: 1.35, borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: 10 }}>
                  &ldquo;{entry.tagline}&rdquo;
                </div>
              )}

              {entry.cast_crew && (
                <div style={{ marginTop: 6, fontSize: 10, color: '#888', lineHeight: 1.45 }}>
                  <span style={{ color: '#aaa', fontWeight: 600 }}>Cast: </span>
                  {entry.cast_crew}
                </div>
              )}
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginTop: hasReview ? 0 : 'auto' }}>
            {hasReview ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {noteText && (
                  <div
                    style={{
                      padding: '14px 18px',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div style={{ fontSize: 14, color: '#eee', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                      {noteText}
                    </div>
                  </div>
                )}
                {imageSegments.length > 0 && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    {imageSegments.slice(0, 2).map((seg, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: 110,
                          borderRadius: 8,
                          overflow: 'hidden',
                          border: '1px solid rgba(255,255,255,0.08)',
                          backgroundColor: '#000',
                        }}
                      >
                        <img
                          src={proxyUrl(seg.value)}
                          alt=""
                          crossOrigin="anonymous"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : entry.overview ? (
              <div style={{ fontSize: 12, color: '#999', lineHeight: 1.55 }}>
                {entry.overview}
              </div>
            ) : null}
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14, marginTop: hasReview ? 0 : 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {avatarUrl ? (
                  <img
                    src={proxyUrl(avatarUrl!)}
                    alt=""
                    crossOrigin="anonymous"
                    style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#999' }}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span style={{ fontSize: 12, fontWeight: 600, color: '#ccc' }}>@{username}</span>
              </div>

              {(entry.runtime || genreStr || entry.watch_date) && (
                <div style={{ fontSize: 10, color: '#777', fontWeight: 500 }}>
                  {entry.runtime && `${Math.floor(entry.runtime / 60)}h ${entry.runtime % 60}m`}
                  {genreStr && ` \u00B7 ${genreStr}`}
                  {entry.watch_date && ` \u00B7 ${entry.watch_date}`}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#E50914' }}>watch</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#555' }}>.ed</span>
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

import type { CSSProperties, ReactNode } from 'react'

const DIRECT_IMAGE_RE = /(https?:\/\/[^\s]+?\.(?:gif|png|jpe?g|webp|avif)(?:\?[^\s]*)?)/gi
const PROXY_GIF_RE = /(\/api\/gif-proxy\?url=[^\s]+)/gi
const MARKDOWN_IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)/g
const IFRAME_RE = /<iframe\b[^>]*(?:\/>|>[\s\S]*?<\/iframe\s*>)/gi
const IFRAME_ATTR_RE = /([a-zA-Z-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g
const IMAGE_TOKEN_RE = /\x02(\d+)\x02/g

const ALLOWED_EMBED_DOMAINS = [
  'spotify.com',
  'music.apple.com',
  'youtube.com',
  'youtube-nocookie.com',
  'vimeo.com',
  'soundcloud.com',
  'bandcamp.com',
  'twitch.tv',
  'redditmedia.com',
  'tiktok.com',
]

interface ParsedIframe {
  src: string
  title?: string
  width?: string
  height?: string
  allow?: string
  frameBorder?: string
  loading?: string
  sandbox?: string
  allowFullScreen?: boolean
  style?: string
}

function normalizeUrl(text: string): string {
  return text
    .replace(/https?:\/\/(?:www\.)?giphy\.com\/gifs\/([^\s]+)/gi, (_, slug) => {
      const parts = slug.split('-')
      return `https://media.giphy.com/media/${parts[parts.length - 1]}/giphy.gif`
    })
    .replace(/https?:\/\/(?:www\.)?tenor\.com(?:\/[a-zA-Z-]+)?\/view\/([^\s]+)/gi, (_, slug) => {
      return `/api/gif-proxy?url=${encodeURIComponent(`https://tenor.com/view/${slug}`)}`
    })
    .replace(/https?:\/\/(?:www\.)?imgur\.com\/(?!a\/)(?:gallery\/)?([a-zA-Z0-9]{5,})(?:\?[^\s]*)?/gi, (_, hash) => {
      return `https://i.imgur.com/${hash}.gif`
    })
    .replace(/https?:\/\/(?:www\.)?imgflip\.com\/(?:gif|i)\/([a-zA-Z0-9_]+)(?:\?[^\s]*)?/gi, (_, id) => {
      return `https://i.imgflip.com/${id}.gif`
    })
}

function isAllowedEmbedUrl(src: string): boolean {
  try {
    const host = new URL(src).hostname.toLowerCase()
    return ALLOWED_EMBED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))
  } catch {
    return false
  }
}

function parseIframe(tag: string): ParsedIframe | null {
  const parsed: ParsedIframe = { src: '' }
  let m: RegExpExecArray | null
  IFRAME_ATTR_RE.lastIndex = 0
  while ((m = IFRAME_ATTR_RE.exec(tag))) {
    const name = m[1].toLowerCase()
    const value = m[2] ?? m[3] ?? m[4] ?? ''
    switch (name) {
      case 'src':
        parsed.src = value
        break
      case 'title':
        parsed.title = value
        break
      case 'width':
        parsed.width = value
        break
      case 'height':
        parsed.height = value
        break
      case 'allow':
        parsed.allow = value
        break
      case 'frameborder':
        parsed.frameBorder = value
        break
      case 'loading':
        parsed.loading = value
        break
      case 'sandbox':
        parsed.sandbox = value
        break
      case 'allowfullscreen':
        parsed.allowFullScreen = true
        break
      case 'style':
        parsed.style = value
        break
    }
  }
  if (!parsed.src || !/^https:\/\//i.test(parsed.src) || !isAllowedEmbedUrl(parsed.src)) return null
  return parsed
}

function parseStyle(style?: string): CSSProperties | undefined {
  if (!style) return undefined
  const css: CSSProperties = {}
  for (const pair of style.split(';')) {
    const colon = pair.indexOf(':')
    if (colon === -1) continue
    const key = pair
      .slice(0, colon)
      .trim()
      .replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    const value = pair.slice(colon + 1).trim()
    if (!key || !value) continue
    ;(css as Record<string, string>)[key] = value
  }
  return Object.keys(css).length ? css : undefined
}

function renderIframe(tag: string): ReactNode {
  const parsed = parseIframe(tag)
  if (!parsed) {
    const src = tag.match(/\bsrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i)
    const url = src ? src[2] ?? src[3] ?? src[4] : null
    if (url) {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover underline underline-offset-2">
          {url}
        </a>
      )
    }
    return null
  }
  return (
    <iframe
      src={parsed.src}
      title={parsed.title || 'Embedded content'}
      width={parsed.width}
      height={parsed.height}
      frameBorder={parsed.frameBorder}
      allow={parsed.allow}
      allowFullScreen={parsed.allowFullScreen}
      loading={parsed.loading === 'lazy' || parsed.loading === 'eager' ? parsed.loading : undefined}
      sandbox={parsed.sandbox}
      style={parseStyle(parsed.style)}
      className="max-w-full"
    />
  )
}

function splitSegments(text: string): string[] {
  const segments: string[] = []
  let last = 0
  let m: RegExpExecArray | null
  IFRAME_RE.lastIndex = 0
  while ((m = IFRAME_RE.exec(text))) {
    if (m.index > last) segments.push(text.slice(last, m.index))
    segments.push(m[0])
    last = m.index + m[0].length
  }
  if (last < text.length) segments.push(text.slice(last))
  return segments
}

const INLINE_EMPH_RE = /(\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|`[^`]+`)/g

function emphasis(tag: string, children: ReactNode): ReactNode {
  switch (tag) {
    case 'strong':
      return <strong>{children}</strong>
    case 'em':
      return <em>{children}</em>
    case 'del':
      return <del>{children}</del>
    default:
      return <code className="rounded-sm bg-black/10 px-1 py-0.5 text-sm">{children}</code>
  }
}

function parseInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let last = 0
  let key = 0
  let m: RegExpExecArray | null
  INLINE_EMPH_RE.lastIndex = 0
  while ((m = INLINE_EMPH_RE.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    const token = m[1]
    let tag = 'strong'
    let inner = token.slice(2, -2)
    if (token.startsWith('**')) {
      tag = 'strong'
      inner = token.slice(2, -2)
    } else if (token.startsWith('*')) {
      tag = 'em'
      inner = token.slice(1, -1)
    } else if (token.startsWith('~~')) {
      tag = 'del'
      inner = token.slice(2, -2)
    } else {
      tag = 'code'
      inner = token.slice(1, -1)
    }
    nodes.push(
      <span key={key++}>{emphasis(tag, <>{parseInline(inner)}</>)}</span>
    )
    last = m.index + token.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  if (nodes.length === 0) nodes.push(text)
  return nodes
}

function renderTextRun(text: string, keyPrefix: string): ReactNode[] {
  return parseInline(text).map((node, i) => (
    <span key={`${keyPrefix}:${i}`}>{node}</span>
  ))
}

function renderPlainText(text: string): ReactNode {
  const normalized = normalizeUrl(text)

  const images: { url: string; alt: string }[] = []
  let processed = normalized.replace(MARKDOWN_IMAGE_RE, (_m, alt: string, url: string) => {
    images.push({ url, alt })
    return `\x02${images.length - 1}\x02`
  })
  processed = processed.replace(DIRECT_IMAGE_RE, (m, url: string) => {
    images.push({ url, alt: '' })
    return `\x02${images.length - 1}\x02`
  })
  processed = processed.replace(PROXY_GIF_RE, (m, url: string) => {
    images.push({ url, alt: '' })
    return `\x02${images.length - 1}\x02`
  })

  if (images.length === 0) {
    if (!normalized.trim()) return null
    return (
      <div className="whitespace-pre-wrap break-words">
        {renderTextRun(normalized, 't')}
      </div>
    )
  }

  const nodes: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  let imgKey = 0
  IMAGE_TOKEN_RE.lastIndex = 0
  while ((m = IMAGE_TOKEN_RE.exec(processed))) {
    if (m.index > last) nodes.push(...renderTextRun(processed.slice(last, m.index), `a${imgKey}`))
    const img = images[parseInt(m[1])]
    nodes.push(
      <img
        key={imgKey++}
        src={img.url}
        alt={img.alt || ''}
        loading="lazy"
        className="max-w-full max-h-60 rounded-sm my-2 object-contain"
        onError={(e) => {
          const el = e.target as HTMLImageElement
          const url = el.getAttribute('src')
          el.style.display = 'none'
          if (url) {
            const link = document.createElement('a')
            link.href = url
            link.target = '_blank'
            link.rel = 'noopener noreferrer'
            link.className = 'text-accent hover:text-accent-hover underline underline-offset-2'
            link.textContent = url
            el.replaceWith(link)
          }
        }}
      />
    )
    last = m.index + m[0].length
  }
  if (last < processed.length) nodes.push(...renderTextRun(processed.slice(last), 'z'))

  return (
    <div className="whitespace-pre-wrap break-words">
      {nodes}
    </div>
  )
}

export function renderNotes(text: string) {
  const segments = splitSegments(text)
  if (segments.length === 1) return renderPlainText(segments[0])
  return (
    <>
      {segments.map((seg, i) =>
        /^\s*<iframe\b/i.test(seg) ? (
          <div key={i} className="my-2">
            {renderIframe(seg)}
          </div>
        ) : (
          <div key={i}>{renderPlainText(seg)}</div>
        )
      )}
    </>
  )
}
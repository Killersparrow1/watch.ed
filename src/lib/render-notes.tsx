import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const DIRECT_IMAGE_RE = /(https?:\/\/[^\s]+?\.(?:gif|png|jpe?g|webp|avif)(?:\?[^\s]*)?)/gi
const PROXY_GIF_RE = /(\/api\/gif-proxy\?url=[^\s]+)/gi
const MARKDOWN_IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)/g

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

export function renderNotes(text: string) {
  const normalized = normalizeUrl(text)

  const saved: string[] = []
  let processed = normalized.replace(MARKDOWN_IMAGE_RE, (m) => {
    saved.push(m)
    return `\x01${saved.length - 1}\x01`
  })

  processed = processed.replace(DIRECT_IMAGE_RE, '![]( $& )')
  processed = processed.replace(PROXY_GIF_RE, '![]( $& )')

  processed = processed.replace(/\x01(\d+)\x01/g, (_, n) => saved[parseInt(n)])

  if (!processed.trim()) return null

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a({ href, children }) {
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover underline underline-offset-2">
              {children}
            </a>
          )
        },
        img({ src, alt }) {
          return (
            <img
              src={src}
              alt={alt || ''}
              loading="lazy"
              className="max-w-full max-h-60 rounded-sm my-2 object-contain"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          )
        },
      }}
    >
      {processed}
    </ReactMarkdown>
  )
}

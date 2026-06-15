import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const DIRECT_IMAGE_RE = /(https?:\/\/[^\s]+?\.(?:gif|png|jpe?g|webp)(?:\?[^\s]*)?)/gi
const GIPHY_PAGE_RE = /https?:\/\/(?:www\.)?giphy\.com\/gifs\/([^\s]+)/gi
const MARKDOWN_IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)/g

function giphyUrlToDirect(text: string): string {
  return text.replace(GIPHY_PAGE_RE, (_, slug) => {
    const parts = slug.split('-')
    return `https://media.giphy.com/media/${parts[parts.length - 1]}/giphy.gif`
  })
}

export function renderNotes(text: string) {
  const normalized = giphyUrlToDirect(text)

  const saved: string[] = []
  let processed = normalized.replace(MARKDOWN_IMAGE_RE, (m) => {
    saved.push(m)
    return `\x01${saved.length - 1}\x01`
  })

  processed = processed.replace(DIRECT_IMAGE_RE, '![]( $& )')

  processed = processed.replace(/\x01(\d+)\x01/g, (_, n) => saved[parseInt(n)])

  if (!processed.trim()) return null

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
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

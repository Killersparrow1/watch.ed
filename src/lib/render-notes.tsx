const DIRECT_IMAGE_RE = /(https?:\/\/[^\s]+?\.(?:gif|png|jpe?g|webp)(?:\?[^\s]*)?)/gi
const GIPHY_PAGE_RE = /https?:\/\/(?:www\.)?giphy\.com\/gifs\/([^\s]+)/gi

function giphyUrlToDirect(url: string): string {
  return url.replace(GIPHY_PAGE_RE, (_, slug) => {
    const parts = slug.split('-')
    return `https://media.giphy.com/media/${parts[parts.length - 1]}/giphy.gif`
  })
}

export function renderNotes(text: string) {
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

  if (parts.length === 0) return null

  return parts.map((part, i) => {
    if (part.type === 'image') {
      return (
        <img
          key={i}
          src={part.value}
          alt=""
          loading="lazy"
          className="max-w-full max-h-60 rounded-sm my-2 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none'
          }}
        />
      )
    }
    return <span key={i} className="whitespace-pre-wrap">{part.value}</span>
  })
}

const IMAGE_URL_RE = /(https?:\/\/[^\s]+?\.(?:gif|png|jpe?g|webp)(?:\?[^\s]*)?)/gi

export function renderNotes(text: string) {
  const parts: { type: 'text' | 'image'; value: string }[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  const re = new RegExp(IMAGE_URL_RE.source, 'gi')
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'image', value: match[0] })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) })
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

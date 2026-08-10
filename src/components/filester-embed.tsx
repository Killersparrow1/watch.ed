'use client'

import { useEffect, useState } from 'react'

interface Props {
  slug: string
}

export default function FilesterEmbed({ slug }: Props) {
  const [type, setType] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    fetch(`/api/filester?slug=${encodeURIComponent(slug)}&check=1`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.ok && data.type) {
          setType(data.type)
          setStatus('ready')
        } else {
          setStatus('error')
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => { cancelled = true }
  }, [slug])

  const src = `/api/filester?slug=${encodeURIComponent(slug)}`

  if (status === 'loading') {
    return <div className="my-2 text-xs text-text-muted animate-pulse">Loading stream…</div>
  }

  if (status === 'error' || !type || (!type.startsWith('video/') && !type.startsWith('image/') && !type.startsWith('audio/'))) {
    return (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent hover:text-accent-hover underline underline-offset-2"
      >
        filester.sh/d/{slug}
      </a>
    )
  }

  if (type.startsWith('video/')) {
    return (
      <video
        controls
        playsInline
        preload="metadata"
        src={src}
        className="max-w-full max-h-72 rounded-sm my-2 bg-black"
      />
    )
  }

  if (type.startsWith('audio/')) {
    return <audio controls src={src} className="my-2 w-full" />
  }

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      className="max-w-full max-h-60 rounded-sm my-2 object-contain"
    />
  )
}
'use client'

import { useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { Entry } from '@/types/database'
import ShareCard from './share-card'
import { X, Download, Copy, Share2, Link as LinkIcon, Check } from 'lucide-react'

interface Props {
  entry: Entry
  username: string
  displayName: string
  avatarUrl: string | null
  onClose: () => void
}

export default function ShareModal({ entry, username, displayName, avatarUrl, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [generating, setGenerating] = useState(false)

  async function handleDownload() {
    if (!cardRef.current) return
    setGenerating(true)
    try {
      const dataUrl = await toPng(cardRef.current, { quality: 0.95, pixelRatio: 2, cacheBust: true })
      const link = document.createElement('a')
      link.download = `${entry.title.replace(/[^a-zA-Z0-9]/g, '_')}.png`
      link.href = dataUrl
      link.click()
    } catch (e) {
      console.error('Failed to generate image:', e)
    }
    setGenerating(false)
  }

  async function handleCopyText() {
    let text = `${entry.title}`
    if (entry.year) text += ` (${entry.year})`
    if (entry.rating) text += ` — ${entry.rating}/10`
    if (entry.notes) text += `\n\n${entry.notes}`
    text += `\n\n— @${username} on watch.ed`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleCopyLink() {
    const url = `${window.location.origin}/${username}/${entry.id}`
    try {
      await navigator.clipboard.writeText(url)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }
  }

  async function handleShare() {
    if (!cardRef.current) return
    setGenerating(true)
    try {
      const dataUrl = await toPng(cardRef.current, { quality: 0.95, pixelRatio: 2, cacheBust: true })
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], `${entry.title}.png`, { type: 'image/png' })

      let text = `${entry.title}`
      if (entry.year) text += ` (${entry.year})`
      if (entry.rating) text += ` — ${entry.rating}/10`

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text })
      } else if (navigator.share) {
        await navigator.share({ text, url: window.location.href })
      } else {
        handleDownload()
      }
    } catch (e) {
      if ((e as DOMException)?.name !== 'AbortError') {
        console.error('Share failed:', e)
      }
    }
    setGenerating(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-sm w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-sm font-medium">Share review</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          <div className="overflow-hidden rounded-sm" style={{ maxHeight: 420 }}>
            <div className="scale-[0.6] origin-top-left" style={{ width: 540 / 0.6, height: 675 / 0.6 }}>
              <ShareCard ref={cardRef} entry={entry} username={username} displayName={displayName} avatarUrl={avatarUrl} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-5 py-3 border-t border-border">
          <button
            onClick={handleDownload}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-sm text-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {generating ? 'Generating...' : 'Download'}
          </button>
          <button
            onClick={handleCopyText}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-sm text-sm text-text-secondary hover:text-text-primary hover:bg-tag-bg transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy text'}
          </button>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-sm text-sm text-text-secondary hover:text-text-primary hover:bg-tag-bg transition-colors"
          >
            {linkCopied ? <Check className="w-4 h-4 text-success" /> : <LinkIcon className="w-4 h-4" />}
            {linkCopied ? 'Copied' : 'Copy link'}
          </button>
          <button
            onClick={handleShare}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-sm text-sm text-text-secondary hover:text-text-primary hover:bg-tag-bg transition-colors disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>
    </div>
  )
}

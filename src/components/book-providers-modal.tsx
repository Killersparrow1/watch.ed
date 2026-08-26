'use client'

import { useState, useEffect } from 'react'
import {
  BookOpen,
  ShoppingBag,
  Headphones,
  ExternalLink,
  X,
  Star,
  Sparkles,
  Library,
  Globe,
  Check,
  Copy,
  Maximize2,
  Minimize2,
  Info,
  Loader2,
} from 'lucide-react'
import { Book, ReadingStatus } from '@/types/database'
import {
  getBookProviderOptions,
  BookProviderOption,
  LiveBookInfo,
} from '@/lib/book-providers'

interface Props {
  book: {
    id?: string
    title: string
    authors?: string[] | null
    isbn?: string | null
    open_library_id?: string | null
    cover_url?: string | null
    rating?: number | null
    status?: ReadingStatus | string | null
    published_date?: string | null
    page_count?: number | null
    notes?: string | null
  }
  isOpen: boolean
  onClose: () => void
}

const statusConfig: Record<string, { label: string; color: string }> = {
  want_to_read: { label: 'Want to Read', color: 'text-status-plan bg-status-plan/10 border-status-plan/20' },
  currently_reading: { label: 'Reading', color: 'text-status-watching bg-status-watching/10 border-status-watching/20' },
  read: { label: 'Read', color: 'text-status-completed bg-status-completed/10 border-status-completed/20' },
  did_not_finish: { label: 'DNF', color: 'text-status-dropped bg-status-dropped/10 border-status-dropped/20' },
}

export default function BookProvidersModal({ book, isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'read' | 'buy' | 'audio' | 'embed'>('read')
  const [liveInfo, setLiveInfo] = useState<LiveBookInfo | null>(null)
  const [loadingLive, setLoadingLive] = useState(false)
  const [copied, setCopied] = useState(false)
  const [embedExpanded, setEmbedExpanded] = useState(false)

  const { readOptions, buyOptions, audioOptions } = getBookProviderOptions({
    title: book.title,
    authors: book.authors,
    isbn: book.isbn,
    open_library_id: book.open_library_id,
  })

  // Fetch live Google Books and Open Library metadata when modal opens
  useEffect(() => {
    if (!isOpen) {
      setLiveInfo(null)
      return
    }

    let isMounted = true
    setLoadingLive(true)

    const params = new URLSearchParams()
    if (book.title) params.set('title', book.title)
    if (book.authors && book.authors[0]) params.set('author', book.authors[0])
    if (book.isbn) params.set('isbn', book.isbn)
    if (book.open_library_id) params.set('open_library_id', book.open_library_id)

    fetch(`/api/books/options?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.liveInfo) {
          setLiveInfo(data.liveInfo)
        }
      })
      .catch(() => {
        // silently fallback to static options
      })
      .finally(() => {
        if (isMounted) setLoadingLive(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, book.title, book.authors, book.isbn, book.open_library_id])

  // Handle ESC key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const statusInfo = book.status ? statusConfig[book.status] : null
  const authorsText = book.authors && book.authors.length > 0 ? book.authors.join(', ') : null
  const publishedYear = book.published_date
    ? new Date(book.published_date).getFullYear() || book.published_date.slice(0, 4)
    : null

  function handleCopyDetails() {
    const text = `${book.title}${authorsText ? ` by ${authorsText}` : ''}${book.isbn ? ` (ISBN: ${book.isbn})` : ''}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const renderIcon = (name: BookProviderOption['iconName']) => {
    switch (name) {
      case 'book-open':
        return <BookOpen className="w-4 h-4" />
      case 'library':
        return <Library className="w-4 h-4" />
      case 'shopping-bag':
        return <ShoppingBag className="w-4 h-4" />
      case 'headphones':
        return <Headphones className="w-4 h-4" />
      case 'globe':
        return <Globe className="w-4 h-4" />
      case 'sparkles':
        return <Sparkles className="w-4 h-4" />
      default:
        return <BookOpen className="w-4 h-4" />
    }
  }

  // Google Books Embedded Reader URL
  const googleEmbedUrl = liveInfo?.googleBooksId
    ? `https://books.google.com/books?id=${liveInfo.googleBooksId}&printsec=frontcover&output=embed`
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className={`bg-surface border border-border rounded-lg shadow-2xl w-full flex flex-col overflow-hidden transition-all duration-200 ${
          embedExpanded && activeTab === 'embed'
            ? 'max-w-5xl h-[90vh]'
            : 'max-w-2xl max-h-[90vh]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Book Metadata */}
        <div className="relative p-4 sm:p-5 border-b border-border bg-gradient-to-b from-surface-hover/30 to-surface">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-1.5 rounded-sm bg-surface-hover/80 hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors z-10"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex gap-4 items-start pr-8">
            {/* Book Cover */}
            <div className="w-16 sm:w-20 aspect-[2/3] bg-tag-bg rounded-sm overflow-hidden flex-shrink-0 border border-border shadow-md relative">
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-tag-bg text-text-muted">
                  <BookOpen className="w-6 h-6 opacity-40" />
                </div>
              )}
            </div>

            {/* Book Details */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Book
                </span>
                {statusInfo && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-sm border ${statusInfo.color}`}
                  >
                    {statusInfo.label}
                  </span>
                )}
                {book.rating && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-sm bg-rating/10 text-rating flex items-center gap-1 border border-rating/20">
                    <Star className="w-3 h-3 fill-current" />
                    {book.rating}/10
                  </span>
                )}
              </div>

              <h2 className="text-base sm:text-lg font-bold text-text-primary leading-snug line-clamp-2">
                {book.title}
              </h2>

              {authorsText && (
                <p className="text-xs sm:text-sm text-text-secondary mt-0.5 line-clamp-1">
                  By <span className="text-text-primary font-medium">{authorsText}</span>
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted mt-1.5">
                {publishedYear && <span>{publishedYear}</span>}
                {book.page_count ? (
                  <>
                    <span>·</span>
                    <span>{book.page_count} pages</span>
                  </>
                ) : liveInfo?.pageCount ? (
                  <>
                    <span>·</span>
                    <span>{liveInfo.pageCount} pages</span>
                  </>
                ) : null}
                {book.isbn && (
                  <>
                    <span>·</span>
                    <span className="font-mono text-[11px]">ISBN: {book.isbn}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="mt-3.5 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              {loadingLive ? (
                <span className="flex items-center gap-1.5 text-text-muted">
                  <Loader2 className="w-3 h-3 animate-spin text-accent" />
                  Checking live availability...
                </span>
              ) : liveInfo?.isEbook ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  E-book & Preview available
                </span>
              ) : (
                <span>Where to read & buy online</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopyDetails}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-surface border border-border rounded-sm hover:border-accent/60 text-text-secondary hover:text-text-primary transition-colors"
              title="Copy book details"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy details</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-border bg-surface px-4 gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('read')}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 text-xs font-semibold tracking-wide uppercase transition-all ${
              activeTab === 'read'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Read & Borrow
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-hover text-text-secondary ml-0.5">
              {readOptions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('buy')}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 text-xs font-semibold tracking-wide uppercase transition-all ${
              activeTab === 'buy'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Buy & Shop
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-hover text-text-secondary ml-0.5">
              {buyOptions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audio')}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 text-xs font-semibold tracking-wide uppercase transition-all ${
              activeTab === 'audio'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            Audiobooks
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-hover text-text-secondary ml-0.5">
              {audioOptions.length}
            </span>
          </button>

          {googleEmbedUrl && (
            <button
              type="button"
              onClick={() => setActiveTab('embed')}
              className={`flex items-center gap-1.5 py-3 px-3 border-b-2 text-xs font-semibold tracking-wide uppercase transition-all ${
                activeTab === 'embed'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Live Preview
            </button>
          )}
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {/* 1. READ & BORROW TAB */}
          {activeTab === 'read' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between pb-1">
                <p className="text-xs text-text-muted">
                  Read online, borrow via digital libraries, or access public domain editions:
                </p>
                {liveInfo?.webReaderLink && (
                  <a
                    href={liveInfo.webReaderLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
                  >
                    Open Google Web Reader <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {readOptions.map((opt) => (
                  <a
                    key={opt.id}
                    href={
                      opt.id === 'google_books' && liveInfo?.previewLink
                        ? liveInfo.previewLink
                        : opt.url
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col justify-between p-3 rounded-md bg-surface-hover/60 hover:bg-surface-hover border border-border/80 hover:border-accent/40 transition-all hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-sm bg-gradient-to-br ${opt.accentColor} text-white flex items-center justify-center shadow-sm flex-shrink-0`}
                        >
                          {renderIcon(opt.iconName)}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                            {opt.name}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {opt.isDirect && (
                          <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Direct Match
                          </span>
                        )}
                        {opt.badge && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-surface border border-border text-text-secondary">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-text-secondary/80 line-clamp-2 leading-relaxed mb-2.5">
                      {opt.description}
                    </p>

                    <div className="mt-auto pt-2 border-t border-border/40 flex items-center justify-between text-xs font-medium text-accent">
                      <span>Open on {opt.name}</span>
                      <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </a>
                ))}
              </div>

              {book.notes && (
                <div className="mt-4 p-3 bg-surface rounded-md border border-border/80">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary mb-1">
                    <Info className="w-3.5 h-3.5 text-accent" />
                    Your Notes
                  </div>
                  <p className="text-xs text-text-primary/90 italic leading-relaxed">
                    &ldquo;{book.notes}&rdquo;
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 2. BUY & SHOP TAB */}
          {activeTab === 'buy' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between pb-1">
                <p className="text-xs text-text-muted">
                  Purchase physical editions (hardcover/paperback) or digital copies:
                </p>
                {liveInfo?.retailPrice && (
                  <span className="text-xs font-medium text-emerald-400 px-2 py-0.5 rounded-sm bg-emerald-500/10 border border-emerald-500/20">
                    Retail: {liveInfo.retailPrice.amount} {liveInfo.retailPrice.currencyCode}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {buyOptions.map((opt) => (
                  <a
                    key={opt.id}
                    href={
                      opt.id === 'google_play' && liveInfo?.buyLink
                        ? liveInfo.buyLink
                        : opt.url
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col justify-between p-3 rounded-md bg-surface-hover/60 hover:bg-surface-hover border border-border/80 hover:border-accent/40 transition-all hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-sm bg-gradient-to-br ${opt.accentColor} text-white flex items-center justify-center shadow-sm flex-shrink-0`}
                        >
                          {renderIcon(opt.iconName)}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                            {opt.name}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {opt.isDirect && (
                          <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Direct Match
                          </span>
                        )}
                        {opt.badge && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-surface border border-border text-text-secondary">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-text-secondary/80 line-clamp-2 leading-relaxed mb-2.5">
                      {opt.description}
                    </p>

                    <div className="mt-auto pt-2 border-t border-border/40 flex items-center justify-between text-xs font-medium text-accent">
                      <span>Buy / Search on {opt.name}</span>
                      <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 3. AUDIOBOOKS TAB */}
          {activeTab === 'audio' && (
            <div className="space-y-2.5">
              <p className="text-xs text-text-muted pb-1">
                Listen to the official audiobook narration & voice performances:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {audioOptions.map((opt) => (
                  <a
                    key={opt.id}
                    href={opt.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col justify-between p-3 rounded-md bg-surface-hover/60 hover:bg-surface-hover border border-border/80 hover:border-accent/40 transition-all hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-sm bg-gradient-to-br ${opt.accentColor} text-white flex items-center justify-center shadow-sm flex-shrink-0`}
                        >
                          {renderIcon(opt.iconName)}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                            {opt.name}
                          </h3>
                        </div>
                      </div>

                      {opt.badge && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-surface border border-border text-text-secondary">
                          {opt.badge}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-text-secondary/80 line-clamp-2 leading-relaxed mb-2.5">
                      {opt.description}
                    </p>

                    <div className="mt-auto pt-2 border-t border-border/40 flex items-center justify-between text-xs font-medium text-accent">
                      <span>Search Audiobooks on {opt.name}</span>
                      <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 4. EMBEDDED LIVE PREVIEW TAB */}
          {activeTab === 'embed' && googleEmbedUrl && (
            <div className="flex flex-col h-full space-y-2">
              <div className="flex items-center justify-between pb-1">
                <p className="text-xs text-text-muted">
                  Interactive Google Books preview reader:
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEmbedExpanded(!embedExpanded)}
                    className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary px-2 py-0.5 rounded-sm bg-surface border border-border"
                  >
                    {embedExpanded ? (
                      <>
                        <Minimize2 className="w-3 h-3" />
                        <span>Standard view</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-3 h-3" />
                        <span>Expand viewer</span>
                      </>
                    )}
                  </button>
                  <a
                    href={liveInfo?.previewLink || googleEmbedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                  >
                    Open in new tab <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="w-full flex-1 min-h-[420px] rounded-md overflow-hidden border border-border bg-black/40">
                <iframe
                  src={googleEmbedUrl}
                  title={`${book.title} Preview`}
                  className="w-full h-full min-h-[420px] border-0"
                  allow="fullscreen"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-border bg-surface flex items-center justify-between gap-3 text-xs text-text-muted">
          <span className="truncate">
            Instant reading and buying links for <strong className="text-text-secondary">{book.title}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-sm bg-surface-hover hover:bg-border text-text-primary font-medium transition-colors flex-shrink-0"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

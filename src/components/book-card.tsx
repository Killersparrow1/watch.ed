'use client'

import { useState } from 'react'
import { Book, ReadingStatus } from '@/types/database'
import { BookOpen, Star, Trash2, ShoppingBag, ExternalLink } from 'lucide-react'
import BookProvidersModal from './book-providers-modal'

const bookStatusConfig: Record<ReadingStatus, { label: string; color: string }> = {
  want_to_read: { label: 'Want to Read', color: 'text-status-plan bg-status-plan/10' },
  currently_reading: { label: 'Reading', color: 'text-status-watching bg-status-watching/10' },
  read: { label: 'Read', color: 'text-status-completed bg-status-completed/10' },
  did_not_finish: { label: 'DNF', color: 'text-status-dropped bg-status-dropped/10' },
}

interface Props {
  book: Book
  onStatusChange: (bookId: string, status: string) => Promise<void>
  onDelete: (bookId: string) => Promise<void>
}

export default function BookCard({ book, onStatusChange, onDelete }: Props) {
  const [showDetails, setShowDetails] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showProvidersModal, setShowProvidersModal] = useState(false)
  const [status, setStatus] = useState<ReadingStatus>(book.status || 'want_to_read')
  const statusInfo = bookStatusConfig[status] || bookStatusConfig.want_to_read

  async function handleStatusChange(newStatus: string) {
    setStatus(newStatus as ReadingStatus)
    await onStatusChange(book.id, newStatus)
  }

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDeleting(true)
    await onDelete(book.id)
  }

  const publishedYear = book.published_date
    ? (new Date(book.published_date).getFullYear() || book.published_date.slice(0, 4))
    : null

  return (
    <>
      <div
        className="bg-surface border border-border rounded-sm overflow-hidden flex flex-col group relative"
        onMouseEnter={() => setShowDetails(true)}
        onMouseLeave={() => {
          setShowDetails(false)
          setConfirmDelete(false)
        }}
      >
        <div
          className="block aspect-[2/3] bg-tag-bg overflow-hidden relative cursor-pointer"
          onClick={() => setShowProvidersModal(true)}
        >
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={book.title}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
              loading="lazy"
              onError={(e) => {
                // Hide broken image and fallback to placeholder
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3 text-center bg-tag-bg">
              <BookOpen className="w-8 h-8 text-text-muted/40" />
              <p className="text-[11px] text-text-muted/70 line-clamp-2 px-1 font-medium">{book.title}</p>
            </div>
          )}

          {/* Top left book badge */}
          <div className="absolute top-2 left-2 bg-amber-500/90 text-white px-1.5 py-0.5 rounded-sm flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase shadow-sm">
            <BookOpen className="w-3 h-3" />
            Book
          </div>

          {/* Rating badge */}
          {book.rating && (
            <div className="absolute top-2 right-2 bg-surface/90 backdrop-blur-sm px-1.5 py-0.5 rounded-sm flex items-center gap-1 text-xs font-medium border border-border/40 shadow-sm">
              <Star className="w-3 h-3 text-rating fill-current" />
              {book.rating}
            </div>
          )}

          {/* Hover overlay */}
          {showDetails && (
            <div className="absolute inset-0 bg-black/75 flex flex-col justify-between p-3 transition-opacity">
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowProvidersModal(true)
                  }}
                  className="bg-accent hover:bg-accent-hover text-white px-2 py-1 rounded-sm text-[10px] font-medium flex items-center gap-1 shadow-sm transition-colors"
                  title="Read or buy book"
                >
                  <ShoppingBag className="w-3 h-3" />
                  Read / Buy
                </button>

                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setConfirmDelete(true)
                    }}
                    className="bg-black/70 hover:bg-red-600/80 text-white p-1.5 rounded-sm transition-colors"
                    title="Delete book"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1 bg-black/90 p-1 rounded-sm">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-medium rounded-sm transition-colors"
                    >
                      {deleting ? '...' : 'Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setConfirmDelete(false)
                      }}
                      className="px-1.5 py-0.5 border border-border text-white text-[10px] rounded-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                {book.authors && book.authors.length > 0 && (
                  <p className="text-white/90 text-xs font-medium line-clamp-1">
                    By {book.authors.join(', ')}
                  </p>
                )}
                {book.notes && (
                  <p className="text-white/70 text-xs italic line-clamp-3 leading-tight">
                    &ldquo;{book.notes}&rdquo;
                  </p>
                )}
                <div className="pt-1 flex items-center gap-1 text-[10px] text-accent-hover font-medium">
                  <span>Click for reading & buying links</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 flex flex-col gap-1.5 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3
              onClick={() => setShowProvidersModal(true)}
              className="heading-sm leading-tight text-text-primary line-clamp-2 cursor-pointer hover:text-accent transition-colors"
            >
              {book.title}
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs text-text-muted">
            {publishedYear && <span>{publishedYear}</span>}
            {publishedYear && <span className="w-1 h-1 rounded-full bg-border" />}
            <span>{book.authors?.[0] || 'Book'}</span>
            {book.progress && book.progress > 0 ? (
              <>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span>{book.progress} pages</span>
              </>
            ) : book.page_count ? (
              <>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span>{book.page_count} pages</span>
              </>
            ) : null}
          </div>

          <div className="mt-auto pt-2 flex items-center justify-between gap-1.5">
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`text-xs px-2 py-1 rounded-sm font-medium border border-border/60 bg-surface focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer flex-1 min-w-0 ${statusInfo.color}`}
            >
              <option value="want_to_read">Want to Read</option>
              <option value="currently_reading">Reading</option>
              <option value="read">Read</option>
              <option value="did_not_finish">Did Not Finish</option>
            </select>

            <button
              type="button"
              onClick={() => setShowProvidersModal(true)}
              className="p-1.5 rounded-sm bg-surface hover:bg-surface-hover border border-border text-text-muted hover:text-accent hover:border-accent transition-colors flex-shrink-0"
              title="Where to Read & Buy"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {showProvidersModal && (
        <BookProvidersModal
          book={book}
          isOpen={showProvidersModal}
          onClose={() => setShowProvidersModal(false)}
        />
      )}
    </>
  )
}


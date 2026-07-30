'use client'

import { useState } from 'react'
import { Star, ThumbsUp, ThumbsDown, Link as LinkIcon, Check, MessageCircle, Send, User } from 'lucide-react'
import { renderNotes } from '@/lib/render-notes'
import type { Entry, WatchEvent, CommentWithAuthor } from '@/types/database'

interface Props {
  entry: Entry
  watchEvents: WatchEvent[]
  likes: number
  dislikes: number
  username: string
  currentUserId: string | null
  isFollowing: boolean
  comments: CommentWithAuthor[]
  entryOwnerId: string
}

export default function ReviewContent({ entry, watchEvents, likes, dislikes, username, currentUserId, isFollowing, comments: initialComments, entryOwnerId }: Props) {
  const [copied, setCopied] = useState(false)
  const [comments, setComments] = useState<CommentWithAuthor[]>(initialComments)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)

  async function handleCopyLink() {
    const url = `${window.location.origin}/${username}/${entry.id}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = url
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim() || submitting) return

    setSubmitting(true)
    setCommentError(null)

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_id: entry.id, content: newComment.trim() }),
      })

      if (res.ok) {
        const data = await res.json()
        setComments(prev => [...prev, data.comment])
        setNewComment('')
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to post comment' }))
        setCommentError(err.error || 'Failed to post comment')
      }
    } catch {
      setCommentError('Network error')
    }
    setSubmitting(false)
  }

  return (
    <div className="space-y-6">
      {(entry.notes || entry.watch_date || entry.rating) && (
        <div className="p-4 bg-surface border border-border rounded-sm">
          <div className="flex items-center gap-2 text-sm mb-2">
            {entry.watch_date && (
              <span className="text-text-primary font-medium">{entry.watch_date}</span>
            )}
            {entry.rating && (
              <span className="text-xs text-rating flex items-center gap-0.5 ml-auto">
                <Star className="w-3.5 h-3.5 fill-current" /> {entry.rating}
              </span>
            )}
          </div>
          {entry.notes && (
            <div className="text-sm text-text-secondary leading-relaxed">
              {renderNotes(entry.notes)}
            </div>
          )}
        </div>
      )}

      {watchEvents.length > 0 && (
        <div>
          <h2 className="heading-sm mb-3">Watch Events</h2>
          <div className="space-y-3">
            {watchEvents.map((event) => (
              <div key={event.id} className="p-4 bg-surface border border-border rounded-sm">
                <div className="flex items-center gap-2 text-sm mb-2">
                  <span className="text-text-primary font-medium">{event.watch_date}</span>
                  {event.season_number != null && (
                    <span className="text-xs text-text-muted">
                      S{event.season_number}{event.episode_number != null ? `E${event.episode_number}` : ''}
                    </span>
                  )}
                  {event.rating && (
                    <span className="text-xs text-rating flex items-center gap-0.5 ml-auto">
                      <Star className="w-3 h-3 fill-current" /> {event.rating}
                    </span>
                  )}
                </div>
                {event.notes && (
                  <div className="text-sm text-text-secondary leading-relaxed">
                    {renderNotes(event.notes)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!entry.notes && !entry.rating && watchEvents.length === 0 && (
        <p className="text-sm text-text-muted text-center py-8">No review for this entry.</p>
      )}

      <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border">
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="flex items-center gap-1">
            <ThumbsUp className="w-4 h-4" />
            {likes}
          </span>
          <span className="flex items-center gap-1">
            <ThumbsDown className="w-4 h-4" />
            {dislikes}
          </span>
        </div>

        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <LinkIcon className="w-4 h-4" />
              Copy link
            </>
          )}
        </button>
      </div>

      <div className="pt-4 border-t border-border">
        <h2 className="heading-sm mb-4 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-text-muted" />
          Comments{comments.length > 0 ? ` (${comments.length})` : ''}
        </h2>

        {comments.length > 0 ? (
          <div className="space-y-3 mb-6">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 p-3 bg-surface border border-border rounded-sm">
                <div className="w-7 h-7 rounded-full bg-tag-bg flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {comment.author.avatar_url ? (
                    <img src={comment.author.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-text-muted" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-text-primary">
                      {comment.author.display_name || comment.author.username}
                    </span>
                    <span className="text-text-muted">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mt-1">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted mb-6">No comments yet.</p>
        )}

        {currentUserId ? (
          isFollowing ? (
            <form onSubmit={handleSubmitComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                maxLength={1000}
                className="flex-1 px-3 py-2 border border-border bg-bg rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || submitting}
                className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-sm text-sm hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? '...' : 'Post'}
              </button>
            </form>
          ) : (
            <p className="text-sm text-text-muted">
              Follow @{username} to leave a comment.
            </p>
          )
        ) : (
          <p className="text-sm text-text-muted">
            <a href="/login" className="text-accent hover:text-accent-hover underline underline-offset-2">Sign in</a> to leave a comment.
          </p>
        )}

        {commentError && (
          <p className="text-xs text-red-500 mt-2">{commentError}</p>
        )}
      </div>
    </div>
  )
}

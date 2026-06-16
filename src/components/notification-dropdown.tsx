'use client'

import { useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import type { Notification } from '@/types/notifications'

interface Props {
  notifications: Notification[]
  unreadCount: number
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
  open: boolean
  onToggle: () => void
  onClose: () => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function NotificationDropdown({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  open,
  onToggle,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, onClose])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        className="relative flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-border rounded-sm shadow-lg z-50 max-h-96 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <span className="text-sm font-medium">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-xs text-text-muted hover:text-text-primary transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-text-muted">
                No notifications yet
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => onMarkAsRead(notif.id)}
                  className="w-full text-left px-4 py-3 hover:bg-accent-light/50 transition-colors border-b border-border-light last:border-b-0"
                >
                  <p className="text-sm text-text-primary leading-snug">{notif.message}</p>
                  <p className="text-xs text-text-muted mt-1">{timeAgo(notif.created_at)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useRef, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  List as ListIcon,
  BarChart3,
  Settings,
  Shield,
  LogOut,
  Clock,
  Library,
  Star,
  Search,
  User,
  ChevronDown,
} from 'lucide-react'
import { useNotifications } from '@/hooks/use-notifications'
import NotificationDropdown from '@/components/notification-dropdown'

const navLinks = [
  { href: '/dashboard', label: 'Entries', icon: ListIcon },
  { href: '/dashboard/lists', label: 'Library', icon: Library },
  { href: '/dashboard/timeline', label: 'Timeline', icon: Clock },
  { href: '/dashboard/stats', label: 'Stats', icon: BarChart3 },
  { href: '/dashboard/recommendations', label: 'Recs', icon: Star },
  { href: '/dashboard/search', label: 'Search', icon: Search },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userId, setUserId] = useState<string | undefined>(undefined)
  const [notifOpen, setNotifOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(userId)

  useEffect(() => {
    if (!accountOpen) return
    function handleClick(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [accountOpen])

  function getSupabase() {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    return supabaseRef.current
  }

  useEffect(() => {
    getSupabase().auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setUserId(data.user.id)
      const { data: profile } = await getSupabase()
        .from('profiles')
        .select('is_admin')
        .eq('id', data.user.id)
        .single()
      setIsAdmin(profile?.is_admin || false)
    })
  }, [])

  async function handleSignOut() {
    await getSupabase().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="border-b border-border bg-surface">
      <div className="max-w-6xl mx-auto px-6 h-12 sm:h-16 flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-8">
          <Link href="/dashboard">
            <img src="/logo.svg" alt="watch.ed" className="h-12 sm:h-16" />
          </Link>

          <nav className="flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-sm text-sm transition-colors ${
                    isActive
                      ? 'bg-accent-light text-accent font-medium'
                      : 'text-text-secondary hover:text-text-primary hover:bg-tag-bg'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <NotificationDropdown
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            open={notifOpen}
            onToggle={() => setNotifOpen(prev => !prev)}
            onClose={() => setNotifOpen(false)}
          />
          <div ref={accountRef} className="relative">
            <button
              onClick={() => setAccountOpen(prev => !prev)}
              className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Account</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {accountOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-border rounded-sm shadow-lg z-50 py-1">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setAccountOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-tag-bg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                {isAdmin && (
                  <Link
                    href="/dashboard/admin"
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-tag-bg transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                  </Link>
                )}
                <hr className="border-border my-1" />
                <button
                  onClick={() => { setAccountOpen(false); handleSignOut() }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-tag-bg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

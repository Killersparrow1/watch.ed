'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useRef, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  List,
  BarChart3,
  Upload,
  Settings,
  Shield,
  LogOut,
} from 'lucide-react'

const navLinks = [
  { href: '/dashboard', label: 'Entries', icon: List },
  { href: '/dashboard/stats', label: 'Stats', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/import', label: 'Import', icon: Upload },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  function getSupabase() {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    return supabaseRef.current
  }

  useEffect(() => {
    getSupabase().auth.getUser().then(async ({ data }) => {
      if (!data.user) return
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
            {isAdmin && (
              <Link
                href="/dashboard/admin"
                className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-sm text-sm transition-colors ${
                  pathname === '/dashboard/admin'
                    ? 'bg-accent-light text-accent font-medium'
                    : 'text-text-secondary hover:text-text-primary hover:bg-tag-bg'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}
          </nav>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  )
}

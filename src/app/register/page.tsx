'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UserPlus } from 'lucide-react'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  function getSupabase() {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    return supabaseRef.current
  }

  useEffect(() => {
    getSupabase().auth.getUser().then(({ data }) => {
      if (data.user) {
        router.push('/dashboard')
      } else {
        setChecking(false)
      }
    })
  }, [router])

  if (checking) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    if (!username.trim()) {
      setError('Username is required')
      setLoading(false)
      return
    }

    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.trim(),
          display_name: displayName.trim() || username.trim(),
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.user?.identities?.length === 0) {
      setError('An account with this email already exists.')
      setLoading(false)
      return
    }

    router.push('/pending')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="flex justify-center mb-4">
            <img src="/logo.svg" alt="watch.ed" className="h-20" />
          </div>
          <p className="text-text-secondary body-small">
            Create an account to start tracking
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-text-primary mb-1.5">
              Username *
            </label>
            <input
              id="username"
              type="text"
              value={username}
               onChange={(e) => {
                 const val = e.target.value
                 const beforeAt = val.includes('@') ? val.split('@')[0] : val
                 setUsername(beforeAt.replace(/[^a-zA-Z0-9_-]/g, ''))
               }}
              className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
              placeholder="your-username"
              required
            />
          </div>

          <div>
            <label htmlFor="display_name" className="block text-sm font-medium text-text-primary mb-1.5">
              Display name
            </label>
            <input
              id="display_name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
              placeholder="Your Name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1.5">
              Email *
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-1.5">
              Password *
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
              placeholder="At least 6 characters"
              required
              minLength={6}
            />
          </div>

          {error && (
            <p className="text-sm text-accent bg-accent-light px-3 py-2 rounded-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-white rounded-sm hover:bg-accent-hover transition-colors disabled:opacity-50 body-small font-medium"
          >
            <UserPlus className="w-4 h-4" />
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          <p className="text-center text-sm text-text-muted">
            Already have an account?{' '}
            <Link href="/login" className="text-accent hover:text-accent-hover transition-colors">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

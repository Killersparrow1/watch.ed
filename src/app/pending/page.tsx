'use client'

import { useRef, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Clock } from 'lucide-react'

export default function PendingPage() {
  const router = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const [checking, setChecking] = useState(true)

  function getSupabase() {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    return supabaseRef.current
  }

  useEffect(() => {
    async function check() {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data: profile } = await getSupabase()
        .from('profiles')
        .select('status')
        .eq('id', user.id)
        .single()

      if (profile?.status === 'approved') {
        router.push('/dashboard')
        return
      }

      if (profile?.status === 'rejected') {
        await getSupabase().auth.signOut()
        router.push('/login')
        return
      }

      setChecking(false)
    }
    check()
  }, [router])

  if (checking) return null

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-accent-light flex items-center justify-center">
            <Clock className="w-8 h-8 text-accent" />
          </div>
        </div>
        <h1 className="heading-lg mb-3">Pending approval</h1>
        <p className="text-text-secondary body-small mb-6">
          Your account is awaiting approval from the admin. You&apos;ll be notified
          once your account is activated. Check back later.
        </p>
      </div>
    </div>
  )
}

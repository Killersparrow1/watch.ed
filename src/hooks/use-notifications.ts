'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/types/notifications'

const POLL_INTERVAL = 30000

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    async function fetchNotifications() {
      const { data } = await getSupabase()
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(50)

      if (data) setNotifications(data as Notification[])
      setLoading(false)
    }

    fetchNotifications()
    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [userId])

  const unreadCount = notifications.length

  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
  }, [])

  const markAllAsRead = useCallback(async () => {
    setNotifications([])
    await fetch('/api/notifications/read-all', { method: 'PATCH' })
  }, [])

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead }
}

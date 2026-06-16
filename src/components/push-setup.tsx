'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PushSetup() {
  const doneRef = useRef(false)

  useEffect(() => {
    if (doneRef.current) return
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission === 'denied') return
    if (!window.matchMedia('(display-mode: standalone)').matches) return

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) {
      console.warn('Push: NEXT_PUBLIC_VAPID_PUBLIC_KEY not set')
      return
    }

    doneRef.current = true

    async function setup() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const registration = await navigator.serviceWorker.register('/sw.js')

      if (Notification.permission === 'granted') {
        const sub = await registration.pushManager.getSubscription()
        if (sub) {
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint: sub.endpoint,
              keys: { p256dh: arrayToBase64(sub.getKey('p256dh')!), auth: arrayToBase64(sub.getKey('auth')!) },
            }),
          })
          return
        }
      }

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      })

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: { p256dh: arrayToBase64(sub.getKey('p256dh')!), auth: arrayToBase64(sub.getKey('auth')!) },
        }),
      })
    }

    setup().catch((err) => console.error('Push setup failed:', err))
  }, [])

  return null
}

function arrayToBase64(array: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(array)))
}



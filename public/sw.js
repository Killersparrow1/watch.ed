self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}

  const options = {
    body: data.message || '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'watch-ed-notification',
    data: {
      url: data.url || '/dashboard',
    },
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'watch.ed', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          await client.navigate(url)
          await client.focus()
          return
        }
      }

      await clients.openWindow(url)
    })()
  )
})

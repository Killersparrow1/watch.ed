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
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/dashboard')
  )
})

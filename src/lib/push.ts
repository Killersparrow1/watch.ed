import { createServiceClient } from '@/lib/supabase/server'

let webPush: typeof import('web-push') | null = null

async function getWebPush() {
  if (!webPush) {
    webPush = await import('web-push')
    webPush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    )
  }
  return webPush
}

export async function sendPushNotification(userId: string, title: string, message: string, url?: string) {
  try {
    const wp = await getWebPush()
    const supabase = await createServiceClient()

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)

    if (!subs || subs.length === 0) return

    const payload = JSON.stringify({ title, message, url })

    const results = await Promise.allSettled(
      subs.map(sub =>
        wp.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        ).catch(async (err) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          }
          throw err
        })
      )
    )

    const failed = results.filter(r => r.status === 'rejected')
    if (failed.length > 0) {
      console.warn(`Push send: ${failed.length}/${subs.length} failed for user ${userId}`)
    }
  } catch (error) {
    console.error('sendPushNotification error:', error)
  }
}

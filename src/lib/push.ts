import webpush from 'web-push'

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@asmya.org'

export async function sendPushToUser(userId: string, title: string, body: string, data?: Record<string, unknown>) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return 0
  try {
    const { db } = await import('@/lib/db')
    const subs = await db.pushSubscription.findMany({ where: { userId } })
    if (!subs.length) return 0
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
    let sent = 0
    await Promise.allSettled(subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ title, body, data: data || null }), { vapidDetails: { subject: VAPID_SUBJECT, publicKey: VAPID_PUBLIC, privateKey: VAPID_PRIVATE } })
        sent++
      } catch { /* expired subscription */ }
    }))
    return sent
  } catch (e) { console.error('Push error:', e); return 0 }
}

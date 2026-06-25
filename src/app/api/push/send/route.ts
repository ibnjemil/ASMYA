import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import webpush from 'web-push'

export const runtime = 'nodejs'

// Configure VAPID keys from environment variables
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@asmya.org'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

// POST: Accept { userId, title, body, data? } - Send push notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, title, body: notificationBody, data } = body

    if (!userId || !title || !notificationBody) {
      return NextResponse.json({ error: 'Missing required fields: userId, title, body' }, { status: 400 })
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'VAPID keys not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in environment.' },
        { status: 500 }
      )
    }

    // Find user's push subscriptions
    const subscriptions = await db.pushSubscription.findMany({
      where: { userId },
    })

    if (subscriptions.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No push subscriptions found for this user' })
    }

    let sent = 0

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            JSON.stringify({
              title,
              body: notificationBody,
              data: data || null,
            }),
            {
              vapidDetails: {
                subject: VAPID_SUBJECT,
                publicKey: VAPID_PUBLIC_KEY,
                privateKey: VAPID_PRIVATE_KEY,
              },
            }
          )
          sent++
        } catch {
          // Subscription might be invalid or expired, continue to next
        }
      })
    )

    return NextResponse.json({ sent })
  } catch (error) {
    console.error('POST push/send error:', error)
    return NextResponse.json({ error: 'Failed to send push notification' }, { status: 500 })
  }
}

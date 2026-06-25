import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

// GET: ?userId=X - Get subscriptions for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const subscriptions = await db.pushSubscription.findMany({
      where: { userId },
    })

    return NextResponse.json(subscriptions)
  } catch (error) {
    console.error('GET push/subscribe error:', error)
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
  }
}

// POST: Accept { userId, endpoint, p256dh, auth } - Create/upsert PushSubscription
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, endpoint, p256dh, auth } = body

    if (!userId || !endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Missing required fields: userId, endpoint, p256dh, auth' }, { status: 400 })
    }

    // Upsert by endpoint (unique)
    const subscription = await db.pushSubscription.upsert({
      where: { endpoint },
      update: { userId, p256dh, auth },
      create: { userId, endpoint, p256dh, auth },
    })

    return NextResponse.json(subscription, { status: 201 })
  } catch (error) {
    console.error('POST push/subscribe error:', error)
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
  }
}

// DELETE: ?endpoint=X - Delete subscription by endpoint
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')

    if (!endpoint) {
      return NextResponse.json({ error: 'endpoint query parameter is required' }, { status: 400 })
    }

    await db.pushSubscription.delete({
      where: { endpoint },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE push/subscribe error:', error)
    return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 })
  }
}

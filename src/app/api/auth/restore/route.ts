import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username } = body

    const user = await db.user.findUnique({
      where: { username },
      include: {
        chatMemberships: { include: { chat: true } },
        followers: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      side: user.side,
      subAmirId: user.subAmirId,
      chatIds: user.chatMemberships.map((m) => m.chatId),
      followers: user.followers.map((f) => ({
        id: f.id,
        username: f.username,
        displayName: f.displayName,
        avatarUrl: f.avatarUrl,
        role: f.role,
        side: f.side,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
}

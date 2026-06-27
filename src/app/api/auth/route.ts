import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    const user = await db.user.findUnique({
      where: { username },
      include: {
        chatMemberships: { include: { chat: true } },
        followers: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: String(e) }, { status: 500 })
    }

    // Support both plain text (legacy) and bcrypt passwords
    let valid = false
    if (user.password.startsWith('$2')) {
      valid = await bcrypt.compare(password, user.password)
    } else {
      valid = user.password === password
    }

    if (!valid) {
      return NextResponse.json({ error: String(e) }, { status: 500 })
    }

    return NextResponse.json(
      {
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
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
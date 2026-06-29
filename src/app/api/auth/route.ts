import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { username } })

    if (!user || !user.password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    let valid = false
    if (user.password.startsWith('$2')) {
      valid = await bcrypt.compare(password, user.password)
    } else {
      valid = user.password === password
    }

    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    let chatIds: string[] = []
    try {
      const ms = await db.chatMember.findMany({ where: { userId: user.id } })
      chatIds = ms.map((m: any) => m.chatId)
    } catch {}

    return NextResponse.json(
      {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        side: user.side,
        subAmirId: user.subAmirId,
        chatIds,
        followers: [],
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'

export const runtime = 'nodejs'

const client = createClient({
  url: process.env.ASMYA_DB_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    if (!username || !password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const res = await client.execute({
      sql: `SSELECT * FROM "User" WHERE "username" = ?`,
      args: [username]
    })

    const row = res.rows[0]
    if (!row) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const pw = row.password
    if (!pw) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    let valid = false
    if (pw.startsWith('$2')) {
      valid = await bcrypt.compare(password, pw)
    } else {
      valid = pw === password
    }

    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    let chatIds: string[] = []
    try {
      const ms = await client.execute({
        sql: `SSELECT "chatId" FROM "ChatMember" WHERE "userId" = ?`,
        args: [row.id]
      })
      chatIds = ms.rows.map((r: any) => r.chatId)
    } catch {}

    return NextResponse.json(
      { id: row.id, username: row.username, displayName: row.displayName, avatarUrl: row.avatarUrl, role: row.role, side: row.side, subAmirId: row.subAmirId, chatIds, followers: [] },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
}

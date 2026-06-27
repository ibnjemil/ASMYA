import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'

const client = createClient({ url: process.env.ASMYA_DB_URL! })

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    const ur = await client.execute({ sql: 'SELECT * FROM User WHERE username = ?', args: [username] })
    const user = ur.rows[0]
    if (!user) return NextResponse.json({ error: 'No user found' }, { status: 401 })
    let valid = false
    if (user.password && user.password.startsWith('$2')) {
      valid = await bcrypt.compare(password, user.password)
    } else {
      valid = user.password === password
    }
    if (!valid) return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
    const cr = await client.execute({ sql: 'SELECT chatId FROM ChatMembership WHERE userId = ?', args: [user.id] })
    const chatIds = cr.rows.map((r: any) => r.chatId)
    const fr = await client.execute({ sql: 'SELECT u.id,u.username,u.displayName,u.avatarUrl,u.role,u.side FROM User u JOIN Follower f ON f.followerId=u.id WHERE f.followingId=?', args: [user.id] })
    const followers = fr.rows.map((f: any) => ({ id: f.id, username: f.username, displayName: f.displayName, avatarUrl: f.avatarUrl, role: f.role, side: f.side }))
    return NextResponse.json({ id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl, role: user.role, side: user.side, subAmirId: user.subAmirId, chatIds, followers }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('AUTH_ERROR:', String(err))
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

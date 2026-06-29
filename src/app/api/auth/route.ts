import { NextResponse } from 'next/server'
import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json()
    if (!username || !password) return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
    const client = createClient({ url: process.env.ASMYA_DB_URL, authToken: process.env.TURSO_AUTH_TOKEN })
    const result = await client.execute('SELECT * FROM "User" WHERE username = ?', [username])
    if (!result.rows.length) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    const user = result.rows[0]
    let isMatch = false
    if (user.password && user.password.startsWith('$2')) {
      isMatch = await bcrypt.compare(password, user.password)
    } else {
      isMatch = password === user.password
    }
    if (!isMatch) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    const { password: _, ...userData } = user
    return NextResponse.json({ user: userData, success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

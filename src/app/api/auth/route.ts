import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json()
    if (!username || !password) return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
    const user = await db.user.findFirst({ where: { username } })
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    const u = user as any
    let isMatch = false
    if (u.password && u.password.startsWith('$2')) {
      isMatch = await bcrypt.compare(password, u.password)
    } else {
      isMatch = password === u.password
    }
    if (!isMatch) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    const { password: _, ...userData } = u
    return NextResponse.json({ user: userData, success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

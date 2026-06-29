import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username and password required' }, { status: 400 })
    }
    const user = await db.user.findUnique({ where: { username } })
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
    }
    let valid = false
    if (user.password.startsWith('$2')) {
      valid = await bcrypt.compare(password, user.password)
    } else {
      valid = user.password === password
    }
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
    }
    return NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role, side: user.side, avatarUrl: user.avatarUrl },
    })
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json({ success: false, error: (error as any)?.message || "Internal server error" }, { status: 500 })
  }
}

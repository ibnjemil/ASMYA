import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const count = await db.user.count()
    const users = await db.user.findMany({})
    return NextResponse.json({ ok: true, count, users: users.map(u => ({ username: u.username, role: u.role }))})
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

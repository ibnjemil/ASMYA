import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json()
    const user = await db.user.findFirst({ where: { username } })
    if (!user) return NextResponse.json({ step: 'NO_USER' }, { status: 401 })
    const u = user as any
    return NextResponse.json({ step: 'FOUND', hasPassword: !!u.password, pw: (u.password || '').substring(0,15), keys: Object.keys(u) })
  } catch (e: any) {
    return NextResponse.json({ step: 'ERROR', msg: e.message }, { status: 500 })
  }
}

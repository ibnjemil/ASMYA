import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    const user = await db.user.findUnique({ where: { username } })
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    let valid = false
    if (user.password && user.password.startsWith('$2')) { valid = await bcrypt.compare(password, user.password) }
    else { valid = user.password === password }
    if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    const memberships = await db.chatMember.findMany({ where: { userId: user.id }, select: { chatId: true } })
    const followers = await db.user.findMany({ where: { subAmirId: user.id }, select: { id:true,username:true,displayName:true,avatarUrl:true,role:true,side:true } })
    return NextResponse.json({ id:user.id,username:user.username,displayName:user.displayName,avatarUrl:user.avatarUrl,role:user.role,side:user.side,subAmirId:user.subAmirId,chatIds:memberships.map((m:any)=>m.chatId),followers },{ headers:{ 'Cache-Control':'no-store' } })
  } catch (err) { console.error('AUTH_ERROR:',String(err)); return NextResponse.json({ error:'Invalid credentials' },{ status:401 }) }
}

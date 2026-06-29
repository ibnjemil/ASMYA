import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    const user = await db.user.findUnique({ where: { username } })
    if (!user) return NextResponse.json({ error: 'STEP_USER_NOT_FOUND', debug: { username } }, { status: 401 })
    let valid = false
    if (user.password && user.password.startsWith('$2')) { valid = await bcrypt.compare(password, user.password) }
    else { valid = user.password === password }
    if (!valid) return NextResponse.json({ error: 'STEP_PASSWORD_INVALID', debug: { hasPw: !!user.password, pwStart: user.password?.substring(0,10) } }, { status: 401 })
    let chatIds: string[] = []
    try { const memberships = await db.chatMember.findMany({ where: { userId: user.id }, select: { chatId: true } }); chatIds = memberships.map((m:any)=>m.chatId) } catch(e) { console.error('chatMember err:', e) }
    let followers: any[] = []
    try { followers = await db.user.findMany({ where: { subAmirId: user.id }, select: { id:true,username:true,displayName:true,avatarUrl:true,role:true,side:true } }) } catch(e) { console.error('followers err:', e) }
    return NextResponse.json({ id:user.id,username:user.username,displayName:user.displayName,avatarUrl:user.avatarUrl,role:user.role,side:user.side,subAmirId:user.subAmirId,chatIds, followers },{ headers:{ 'Cache-Control':'no-store' } })
  } catch (err) { console.error('AUTH_ERROR:',String(err)); return NextResponse.json({ error:'STEP_SERVER_ERROR', detail:String(err) },{ status:401 }) }
}
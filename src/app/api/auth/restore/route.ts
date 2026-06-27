import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()
    const user = await db.user.findUnique({ where: { username } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    const memberships = await db.chatMember.findMany({ where: { userId: user.id }, select: { chatId: true } })
    const followers = await db.user.findMany({ where: { subAmirId: user.id }, select: { id:true,username:true,displayName:true,avatarUrl:true,role:true,side:true } })
    return NextResponse.json({ id:user.id,username:user.username,displayName:user.displayName,avatarUrl:user.avatarUrl,role:user.role,side:user.side,subAmirId:user.subAmirId,chatIds:memberships.map((m:any)=>m.chatId),followers })
  } catch (err) { console.error('RESTORE_ERROR:',String(err)); return NextResponse.json({ error:'User not found' },{ status:404 }) }
}

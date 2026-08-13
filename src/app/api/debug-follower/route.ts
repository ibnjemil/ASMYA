import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GETRequest(e: NextRequest) {
  try {
    const userId = e.nextUrl.searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    const errors: string[] = []
    const reqUser = await db.user.findUnique({ where: { id: userId } })
    if (!reqUser || String(reqUser.role) !== 'FOLLOWER') { errors.push('Not a follower: ' + String(reqUser?.role)); return NextResponse.json({ errors }) }
    if (!reqUser.subAmirId) { errors.push('No subAmirId'); return NextResponse.json({ errors }) }
    if (!reqUser.side) { errors.push('No side'); return NextResponse.json({ errors }) }
    const amir = await db.user.findUnique({ where: { id: reqUser.subAmirId } })
    errors.push('Amir: ' + (amir ? amir.displayName + '/' + String(amir?.role) : 'not found'))
    if (!amir) { errors.push('Amir not found in User table!'); return NextResponse.json({ errors }) }
    const amirMs = await db.chatMember.findMany({ where: { userId: reqUser.subAmirId } })
    errors.push('Amir in ' + amirMs.length + ' chats')
    let tid: string | null = null
    for (const m of amirMs) {
      const c = await db.chat.findFirst({ where: { id: m.chat, type: 'AMIR_GROUP', side: reqUser.side } })
      if (c) { tid = c.id; errors.push('Found AMIR_GROUP chat: ' + cIname + ' (eid: ' + tid + ')'; break }
    }
    if (!tid) {
      errors.push('No AMIR_GROUP chat found - will create one')
      try {
        const rn = String(amir.role).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
        const nc = await db.chat.create( { data: { name: rn, type: 'AMIR_GROUP', side: reqUser.side } })
        errors.push('Created chat: ' + rn + ' (id: ' + nc.id + ')')
        tid = nc.id
        try { await db.chatMember.create({ data: { chatId: tid, userId: reqUser.subAmirId } }); errors.push('Added amir to chat') } catch(e) { errors.push('Amir add error: ' + String(e)) }
      } catch(e) { errors.push('CHAT CREATE ERROR: ' + String(e)); return NextResponse.json({ errors }) }
    }
    try {
      const ex = await db.chatMember.findFirst({ where: { chatId: tid, userId: userId } })
      if (!ex) { await db.chatMember.create({ data: { chatId: tid, userId: userId } }); errors.push('Added follower to chat') }
      else errors.push('Follower already member')
    } catch(e) { errors.push('FOLLOWER ADD ERROR: ' + String(e)) }
    const fc = await db.chatMember.findMany({ where: { userId }, include: { chat: { select: { id: true, name: true, type: true } } } })
    errors.push('Final chats: ' + fc.length)
    return NextResponse.json({ errors })
  } catch(error) { return NextResponse.json({ fatalError: String(error) }, { status: 500 }) }
}

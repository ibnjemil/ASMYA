import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const allFollowers = await db.user.findMany({
      where: { role: 'FOLLOWER' },
      select: { id: true, side: true, subAmirId: true },
    })
    const results: string[] = []
    for (const fw of allFollowers) {
      if (!fw.subAmirId || !fw.side) { results.push('SKIP ' + fw.id + ': no subAmirId or side'); continue }
      const amir = await db.user.findUnique({ where: { id: fw.subAmirId }, select: { id: true, role: true } })
      if (!amir) { results.push('SKIP ' + fw.id + ': amir not found'); continue }
      const amirMs = await db.chatMember.findMany({ where: { userId: fw.subAmirId }, select: { chatId: true } })
      let tid: string | null = null
      for (const m of amirMs) {
        const c = await db.chat.findFirst({ where: { id: m.chatId, type: 'AMIR_GROUP', side: fw.side }, select: { id: true, name: true } })
        if (c) { tid = c.id; results.push('FOUND "' + c.name + '" for ' + fw.id); break }
      }
      if (!tid) {
        const rn = String(amir.role).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, function(x) { return x.toUpperCase() })
        const nc = await db.chat.create({ data: { name: rn, type: 'AMIR_GROUP', side: fw.side } })
        tid = nc.id
        await db.chatMember.create({ data: { chatId: tid, userId: fw.subAmirId } })
        results.push('CREATED "' + rn + '" for amir ' + fw.subAmirId)
      }
      const ex = await db.chatMember.findFirst({ where: { chatId: tid, userId: fw.id } })
      if (!ex) {
        await db.chatMember.create({ data: { chatId: tid, userId: fw.id } })
        results.push('ADDED ' + fw.id + ' to ' + tid)
      } else {
        results.push('OK ' + fw.id + ' already in')
      }
    }
    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

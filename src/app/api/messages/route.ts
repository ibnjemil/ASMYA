import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const chatId = searchParams.get('chatId')
    const limitParam = searchParams.get('limit')
    const before = searchParams.get('before')
    if (!chatId) return NextResponse.json({ error: 'chatId required' }, { status: 400 })
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 9999
    const wc: Record<string, unknown> = { chatId }
    if (before) wc.createdAt = { lt: new Date(before) }
    const msgs = await db.message.findMany({ where: wc, orderBy: { createdAt: 'desc' }, take: limit,
      include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true, role: true, side: true } },
        replyTo: { select: { id: true, content: true, type: true, sender: { select: { id: true, displayName: true } } } } } })
    msgs.reverse()
    return NextResponse.json(msgs)
  } catch (e) { console.error('GET /api/messages:', e); return NextResponse.json({ error: 'err' }, { status: 500 }) }
}
export async function POST(request: NextRequest) {
  try {
    const { chatId, senderId, type, content, mediaUrl, replyToId } = await request.json()
    if (!chatId || !senderId || !type || !content) return NextResponse.json({ error: 'required' }, { status: 400 })
    const msg = await db.message.create({ data: { chatId, senderId, type, content, mediaUrl: mediaUrl ?? null, replyToId: replyToId ?? null },
      include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true, role: true, side: true } },
        replyTo: { select: { id: true, content: true, type: true, sender: { select: { id: true, displayName: true } } } } } })
    await db.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } })
    return NextResponse.json(msg, { status: 201 })
  } catch (e) { console.error('POST /api/messages:', e); return NextResponse.json({ error: 'err' }, { status: 500 }) }
}
export async function PUT(request: NextRequest) {
  try {
    const { messageId, content } = await request.json()
    if (!messageId || content === undefined) return NextResponse.json({ error: 'required' }, { status: 400 })
    return NextResponse.json(await db.message.update({ where: { id: messageId }, data: { content } }))
  } catch (e) { console.error('PUT /api/messages:', e); return NextResponse.json({ error: 'err' }, { status: 500 }) }
}
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const messageId = searchParams.get('messageId')
    const fe = searchParams.get('forEveryone') === 'true'
    if (!messageId) return NextResponse.json({ error: 'required' }, { status: 400 })
    if (fe) await db.message.delete({ where: { id: messageId } })
    else await db.message.update({ where: { id: messageId }, data: { content: '[Message deleted]', mediaUrl: null, replyToId: null } })
    return NextResponse.json({ success: true })
  } catch (e) { console.error('DELETE /api/messages:', e); return NextResponse.json({ error: 'err' }, { status: 500 }) }
}
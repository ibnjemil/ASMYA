import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendPushToUser } from '@/lib/push'

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
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true, role: true, side: true } },
        
      },
    })
    msgs.reverse()
    return NextResponse.json(msgs)
    return NextResponse.json(msgs)
  } catch (e) { console.error('GET /api/messages:', e); return NextResponse.json({ error: 'err' }, { status: 500 }) }
}

export async function POST(request: NextRequest) {
  try {
    const { chatId, senderId, type, content, mediaUrl } = await request.json() as any
    if (!chatId || !senderId || !type || !content) return NextResponse.json({ error: 'missing fields' }, { status: 400 })
    const msg = await db.message.create({
      data: { chatId, senderId, type, content, mediaUrl: mediaUrl ?? null },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true, role: true, side: true } },
        
      },
    })
    try { const members = await db.chatMember.findMany({ where: { chatId } }); const others = members.filter((m: any) => m.userId !== senderId); const chat = await db.chat.findUnique({ where: { id: chatId } }); const senderName = msg.sender?.displayName || 'Someone'; const preview = type === 'IMAGE' ? 'Sent a photo' : type === 'VOICE' ? 'Sent a voice message' : type === 'FILE' ? 'Sent a file' : content.substring(0, 80); Promise.allSettled(others.map((m: any) => sendPushToUser(m.userId, senderName + ' in ' + (chat?.name || 'Chat'), preview, { url: '/', chatId }))).catch(() => {}) } catch {}
    await db.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } })
    return NextResponse.json(msg, { status: 201 })
  } catch (e) { console.error('POST /api/messages:', e); return NextResponse.json({ error: 'err' }, { status: 500 }) }
}

export async function PUT(request: NextRequest) {
  try {
    const { messageId, content } = await request.json() as any
    if (!messageId || content === undefined) return NextResponse.json({ error: 'missing' }, { status: 400 })
    const u = await db.message.update({ where: { id: messageId }, data: { content } })
    return NextResponse.json(u)
  } catch (e) { console.error('PUT /api/messages:', e); return NextResponse.json({ error: 'err' }, { status: 500 }) }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const messageId = searchParams.get('messageId')
    const forEveryone = searchParams.get('forEveryone') === 'true'
    if (!messageId) return NextResponse.json({ error: 'missing' }, { status: 400 })
    if (forEveryone) await db.message.delete({ where: { id: messageId } })
    else await db.message.update({ where: { id: messageId }, data: { content: '[Message deleted]', mediaUrl: null } })
    return NextResponse.json({ success: true })
  } catch (e) { console.error('DELETE /api/messages:', e); return NextResponse.json({ error: 'err' }, { status: 500 }) }
}

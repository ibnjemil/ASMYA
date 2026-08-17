import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'
import { sendPushToUser } from '@/lib/push'

export const runtime = 'nodejs'

function getDb() {
  return createClient({ url: process.env.ASMYA_DB_URL!, authToken: process.env.TURSO_AUTH_TOKEN })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const chatId = searchParams.get('chatId')
    const limitParam = searchParams.get('limit')
    const before = searchParams.get('before')
    const after = searchParams.get('after')
    if (!chatId) return NextResponse.json({ error: 'chatId required' }, { status: 400 })
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 9999
    const cl = getDb()
    let sql = `SELECT m.*, u."id" as "senderId", u."username", u."displayName", u."avatarUrl", u."role", u."side" as "userSide"
      FROM "Message" m LEFT JOIN "User" u ON u."id" = m."senderId" WHERE m."chatId" = ?`
    const args: any[] = [chatId]
    if (before) { sql += ' AND m."createdAt" < ?'; args.push(before) }
    if (after) { sql += ' AND m."createdAt" > ?'; args.push(after) }
    sql += ' ORDER BY m."createdAt" DESC LIMIT ?'
    args.push(limit)
    const res = await cl.execute({ sql, args })
    const msgs = res.rows.map((r: any) => ({
      id: r.id, chatId: r.chatId, senderId: r.senderId,
      type: r.type || 'TEXT', content: r.content, mediaUrl: r.mediaUrl,
      createdAt: r.createdAt,
      sender: r.senderId ? { id: r.senderId, username: r.username, displayName: r.displayName, avatarUrl: r.avatarUrl, role: r.role, side: r.userSide } : null,
    }))
    msgs.reverse()
    return NextResponse.json(msgs)
  } catch (e) { console.error('GET /api/messages:', e); return NextResponse.json({ error: 'err' }, { status: 500 }) }
}

export async function POST(request: NextRequest) {
  try {
    const cl = getDb()
    const { chatId, senderId, type, content, mediaUrl } = await request.json() as any
    if (!chatId || !senderId || !type || !content) return NextResponse.json({ error: 'missing fields' }, { status: 400 })
    const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c: any) => { const r = (Math.random() * 16) | 0; const v = c === 'x' ? r : (r & 0x3) | 0x8; return v.toString(16) })
    const now = new Date().toISOString()
    await cl.execute({ sql: `INSERT INTO "Message" ("id","chatId","senderId","type","content","mediaUrl","createdAt") VALUES (?,?,?,?,?,?,?)`,
      args: [id, chatId, senderId, type, content, mediaUrl || null, now] })
    // Get sender info + members in 2 queries
    const [senderRes, membersRes, chatRes] = await Promise.all([
      cl.execute({ sql: `SELECT "id","displayName","avatarUrl","role","side" FROM "User" WHERE "id" = ?`, args: [senderId] }),
      cl.execute({ sql: `SELECT "userId" FROM "ChatMember" WHERE "chatId" = ?`, args: [chatId] }),
      cl.execute({ sql: `SELECT "name" FROM "Chat" WHERE "id" = ?`, args: [chatId] }),
    ])
    await cl.execute({ sql: `UPDATE "Chat" SET "updatedAt" = ? WHERE "id" = ?`, args: [now, chatId] })
    const sender = senderRes.rows[0] as any
    const msg = { id, chatId, senderId, type, content, mediaUrl: mediaUrl || null, createdAt: now,
      sender: sender ? { id: sender.id, displayName: sender.displayName, avatarUrl: sender.avatarUrl, role: sender.role, side: sender.side } : null }
    // Push notifications (fire and forget)
    try {
      const chatName = (chatRes.rows[0] as any)?.name || 'Chat'
      const others = membersRes.rows.filter((r: any) => r.userId !== senderId)
      const preview = type === 'IMAGE' ? 'Sent a photo' : type === 'VOICE' ? 'Sent a voice message' : type === 'FILE' ? 'Sent a file' : content.substring(0, 80)
      Promise.allSettled(others.map((r: any) => sendPushToUser(r.userId, (sender?.displayName || 'Someone') + ' in ' + chatName, preview, { url: '/', chatId }))).catch(() => {})
    } catch {}
    return NextResponse.json(msg, { status: 201 })
  } catch (e) { console.error('POST /api/messages:', e); return NextResponse.json({ error: 'err' }, { status: 500 }) }
}

export async function PUT(request: NextRequest) {
  try {
    const { messageId, content } = await request.json() as any
    if (!messageId || content === undefined) return NextResponse.json({ error: 'missing' }, { status: 400 })
    const cl = getDb()
    await cl.execute({ sql: `UPDATE "Message" SET "content" = ?, "updatedAt" = ? WHERE "id" = ?`, args: [content, new Date().toISOString(), messageId] })
    return NextResponse.json({ success: true })
  } catch (e) { console.error('PUT /api/messages:', e); return NextResponse.json({ error: 'err' }, { status: 500 }) }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const messageId = searchParams.get('messageId')
    const forEveryone = searchParams.get('forEveryone') === 'true'
    if (!messageId) return NextResponse.json({ error: 'missing' }, { status: 400 })
    const cl = getDb()
    if (forEveryone) await cl.execute({ sql: `DELETE FROM "Message" WHERE "id" = ?`, args: [messageId] })
    else await cl.execute({ sql: `UPDATE "Message" SET "content" = '[Message deleted]', "mediaUrl" = NULL WHERE "id" = ?`, args: [messageId] })
    return NextResponse.json({ success: true })
  } catch (e) { console.error('DELETE /api/messages:', e); return NextResponse.json({ error: 'err' }, { status: 500 }) }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const userId = searchParams.get('userId')
    const side = searchParams.get('side')
    const chatId = searchParams.get('chatId')
    const cl = createClient({ url: process.env.ASMYA_DB_URL!, authToken: process.env.TURSO_AUTH_TOKEN })

    if (userId) {
      const memRes = await cl.execute({ sql: `SELECT "chatId" FROM "ChatMember" WHERE "userId" = ?`, args: [userId] })
      if (!memRes.rows.length) return NextResponse.json([])
      const chatIds = memRes.rows.map((r: any) => r.chatId)
      const ph = chatIds.map(() => '?').join(',')

      const chatRes = await cl.execute({ sql: `SELECT * FROM "Chat" WHERE "id" IN (${ph})`, args: chatIds })
      const chatMap = new Map(chatRes.rows.map((r: any) => [r.id, r]))

      const membersRes = await cl.execute({
        sql: `SELECT cm."id",cm."chatId",cm."userId",cm."joinedAt", u."username",u."displayName",u."avatarUrl",u."role",u."side" as "userSide"
             FROM "ChatMember" cm LEFT JOIN "User" u ON u."id" = cm."userId" WHERE cm."chatId" IN (${ph})`,
        args: chatIds
      })
      const membersByChat: Record<string, any[]> = {}
      for (const m of membersRes.rows) {
        const cid = (m as any).chatId
        if (!membersByChat[cid]) membersByChat[cid] = []
        membersByChat[cid].push({ id: m.id, chatId: cid, userId: m.userId, joinedAt: m.joinedAt,
          user: { id: m.userId, username: m.username, displayName: m.displayName, avatarUrl: m.avatarUrl, role: m.role, side: m.userSide } })
      }

      let lastMsgMap: Record<string, any> = {}
      try {
        const msgRes = await cl.execute({
          sql: `SELECT m."id",m."chatId",m."senderId",m."content",m."createdAt",
                 u."displayName" as "senderName",u."avatarUrl" as "senderAvatar"
               FROM "Message" m LEFT JOIN "User" u ON u."id" = m."senderId"
               INNER JOIN (SELECT "chatId", MAX("createdAt") as mc FROM "Message" WHERE "chatId" IN (${ph}) GROUP BY "chatId") latest
               ON m."chatId" = latest."chatId" AND m."createdAt" = latest.mc`,
          args: chatIds
        })
        for (const r of msgRes.rows) {
          lastMsgMap[(r as any).chatId] = { id: r.id, chatId: r.chatId, senderId: r.senderId,
            content: r.content, createdAt: r.createdAt,
            sender: r.senderId ? { id: r.senderId, displayName: (r as any).senderName, avatarUrl: (r as any).senderAvatar } : null }
        }
      } catch {}

      let chats = chatIds.map(cid => {
        const chat: any = chatMap.get(cid)
        if (!chat) return null
        return { id: chat.id, name: chat.name, type: chat.type, side: chat.side,
          createdAt: chat.createdAt, updatedAt: chat.updatedAt,
          members: membersByChat[cid] || [], lastMessage: lastMsgMap[cid] || null }
      }).filter(Boolean)

      const uRes = await cl.execute({ sql: `SELECT "role" FROM "User" WHERE "id" = ?`, args: [userId] })
      const role = uRes.rows[0]?.role as string
      if (role !== 'VICE_AMIR' && role !== 'SUPERIOR_AMIR')
        chats = chats.filter((x: any) => x.type !== 'THREE_MAIN')

      return NextResponse.json(chats)
    }

    if (side) {
      const chatRes = await cl.execute({ sql: `SELECT * FROM "Chat" WHERE "side" = ?`, args: [side] })
      if (!chatRes.rows.length) return NextResponse.json([])
      const ids = chatRes.rows.map((r: any) => r.id)
      const ph = ids.map(() => '?').join(',')
      const membersRes = await cl.execute({
        sql: `SELECT cm."id",cm."chatId",cm."userId",cm."joinedAt", u."username",u."displayName",u."avatarUrl",u."role",u."side" as "userSide"
             FROM "ChatMember" cm LEFT JOIN "User" u ON u."id" = cm."userId" WHERE cm."chatId" IN (${ph})`,
        args: ids
      })
      const membersByChat: Record<string, any[]> = {}
      for (const m of membersRes.rows) {
        const cid = (m as any).chatId
        if (!membersByChat[cid]) membersByChat[cid] = []
        membersByChat[cid].push({ id: m.id, chatId: cid, userId: m.userId, joinedAt: m.joinedAt,
          user: { id: m.userId, username: m.username, displayName: m.displayName, avatarUrl: m.avatarUrl, role: m.role, side: m.userSide } })
      }
      return NextResponse.json(chatRes.rows.map((chat: any) => ({ ...chat, members: membersByChat[chat.id] || [] })))
    }

    if (chatId) {
      const chatRes = await cl.execute({ sql: `SELECT * FROM "Chat" WHERE "id" = ?`, args: [chatId] })
      if (!chatRes.rows.length) return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
      const chat = chatRes.rows[0] as any
      const membersRes = await cl.execute({
        sql: `SELECT cm."id",cm."chatId",cm."userId",cm."joinedAt", u."username",u."displayName",u."avatarUrl",u."role",u."side" as "userSide"
             FROM "ChatMember" cm LEFT JOIN "User" u ON u."id" = cm."userId" WHERE cm."chatId" = ?`,
        args: [chatId]
      })
      const members = membersRes.rows.map((m: any) => ({ id: m.id, chatId, userId: m.userId, joinedAt: m.joinedAt,
        user: { id: m.userId, username: m.username, displayName: m.displayName, avatarUrl: m.avatarUrl, role: m.role, side: m.userSide } }))
      return NextResponse.json({ ...chat, members })
    }

    return NextResponse.json({ error: 'Provide userId, side, or chatId' }, { status: 400 })
  } catch (error) {
    console.error('GET /api/chats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

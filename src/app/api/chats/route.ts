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
      // 1. Get chat IDs for this user
      const memRes = await cl.execute({
        sql: `SELECT "chatId" FROM "ChatMember" WHERE "userId" = ?`,
        args: [userId]
      })
      if (!memRes.rows.length) return NextResponse.json([])
      const chatIds = memRes.rows.map((r: any) => r.chatId)
      const placeholders = chatIds.map(() => '?').join(',')

      // 2. Get all chats in one query
      const chatRes = await cl.execute({
        sql: `SELECT * FROM "Chat" WHERE "id" IN (${placeholders})`,
        args: chatIds
      })
      const chatMap = new Map(chatRes.rows.map((r: any) => [r.id, r]))

      // 3. Get ALL members for these chats in one query
      const membersRes = await cl.execute({
        sql: `SELECT cm.*, u."username", u."displayName", u."avatarUrl", u."role", u."side" as "userSide"
             FROM "ChatMember" cm
             LEFT JOIN "User" u ON u."id" = cm."userId"
             WHERE cm."chatId" IN (${placeholders})`,
        args: [...chatIds, ...chatIds]
      })
      const membersByChat: Record<string, any[]> = {}
      for (const m of membersRes.rows) {
        const cid = (m as any).chatId
        if (!membersByChat[cid]) membersByChat[cid] = []
        membersByChat[cid].push({
          id: m.id,
          chatId: cid,
          userId: m.userId,
          joinedAt: m.joinedAt,
          user: {
            id: m.userId,
            username: m.username,
            displayName: m.displayName,
            avatarUrl: m.avatarUrl,
            role: m.role,
            side: m.userSide,
          }
        })
      }

      // 4. Get last message per chat in one query
      const msgRes = await cl.execute({
        sql: `SELECT m.* FROM "Message" m
             INNER JOIN (
               SELECT "chatId", MAX("createdAt") as mc FROM "Message" WHERE "chatId" IN (${placeholders})
               GROUP BY "chatId"
             ) latest ON m."chatId" = latest."chatId" AND m."createdAt" = latest.mc`,
        args: [...chatIds, ...chatIds]
      })
      const lastMsgMap = new Map(msgRes.rows.map((r: any) => [r.chatId, r]))

      // 5. Get sender info for last messages
      const senderIds = [...new Set(msgRes.rows.map((r: any) => r.senderId).filter(Boolean))]
      let senderMap: Record<string, any> = {}
      if (senderIds.length > 0) {
        const sp = senderIds.map(() => '?').join(',')
        const senderRes = await cl.execute({
          sql: `SELECT "id", "displayName", "avatarUrl" FROM "User" WHERE "id" IN (${sp})`,
          args: senderIds
        })
        senderMap = Object.fromEntries(senderRes.rows.map((r: any) => [r.id, { id: r.id, displayName: r.displayName, avatarUrl: r.avatarUrl }]))
      }

      // 6. Build response
      let chats = chatIds.map(cid => {
        const chat: any = chatMap.get(cid)
        if (!chat) return null
        const lm: any = lastMsgMap.get(cid)
        return {
          id: chat.id,
          name: chat.name,
          type: chat.type,
          side: chat.side,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
          members: membersByChat[cid] || [],
          lastMessage: lm ? {
            id: lm.id,
            content: lm.content,
            createdAt: lm.createdAt,
            senderId: lm.senderId,
            sender: senderMap[lm.senderId] || null,
          } : null,
        }
      }).filter(Boolean)

      // Filter THREE_MAIN for non-VICE/SUPERIOR
      const userRes = await cl.execute({ sql: `SELECT "role" FROM "User" WHERE "id" = ?`, args: [userId] })
      const role = userRes.rows[0]?.role
      if (role !== 'VICE_AMIR' && role !== 'SUPERIOR_AMIR') {
        chats = chats.filter((x: any) => x.type !== 'THREE_MAIN')
      }

      return NextResponse.json(chats)
    }

    if (side) {
      const chatRes = await cl.execute({
        sql: `SELECT * FROM "Chat" WHERE "side" = ?`,
        args: [side]
      })
      if (!chatRes.rows.length) return NextResponse.json([])
      const chatIds = chatRes.rows.map((r: any) => r.id)
      const placeholders = chatIds.map(() => '?').join(',')

      const membersRes = await cl.execute({
        sql: `SELECT cm.*, u."username", u."displayName", u."avatarUrl", u."role", u."side" as "userSide"
             FROM "ChatMember" cm
             LEFT JOIN "User" u ON u."id" = cm."userId"
             WHERE cm."chatId" IN (${placeholders})`,
        args: [...chatIds]
      })
      const membersByChat: Record<string, any[]> = {}
      for (const m of membersRes.rows) {
        const cid = (m as any).chatId
        if (!membersByChat[cid]) membersByChat[cid] = []
        membersByChat[cid].push({
          id: m.id, chatId: cid, userId: m.userId, joinedAt: m.joinedAt,
          user: { id: m.userId, username: m.username, displayName: m.displayName, avatarUrl: m.avatarUrl, role: m.role, side: m.userSide }
        })
      }

      const chats = chatRes.rows.map((chat: any) => ({
        ...chat,
        members: membersByChat[chat.id] || [],
      }))
      return NextResponse.json(chats)
    }

    if (chatId) {
      const chatRes = await cl.execute({ sql: `SELECT * FROM "Chat" WHERE "id" = ?`, args: [chatId] })
      if (!chatRes.rows.length) return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
      const chat = chatRes.rows[0] as any

      const membersRes = await cl.execute({
        sql: `SELECT cm.*, u."username", u."displayName", u."avatarUrl", u."role", u."side" as "userSide"
             FROM "ChatMember" cm LEFT JOIN "User" u ON u."id" = cm."userId" WHERE cm."chatId" = ?`,
        args: [chatId]
      })
      const members = membersRes.rows.map((m: any) => ({
        id: m.id, chatId: chatId, userId: m.userId, joinedAt: m.joinedAt,
        user: { id: m.userId, username: m.username, displayName: m.displayName, avatarUrl: m.avatarUrl, role: m.role, side: m.userSide }
      }))

      return NextResponse.json({ ...chat, members })
    }

    return NextResponse.json({ error: 'Provide userId, side, or chatId query param' }, { status: 400 })
  } catch (error) {
    console.error('GET /api/chats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

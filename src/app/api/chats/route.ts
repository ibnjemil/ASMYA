import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

export const runtime = 'nodejs'

function getDb() {
  return createClient({ url: process.env.ASMYA_DB_URL!, authToken: process.env.TURSO_AUTH_TOKEN })
}

// Build ChatInfo[] with flat member shape (member.id = userId, not chatMemberId)
async function buildChatsFromIds(chatIds: string[], db: ReturnType<typeof getDb>): Promise<any[]> {
  if (chatIds.length === 0) return []

  const ph = chatIds.map(() => '?').join(',')

  // 1. Get all chats + their member userIds in one query
  const chatsRes = await db.execute({
    sql: `SELECT c."id", c."name", c."type", c."side", c."createdAt", c."updatedAt",
                 cm."userId" as "memberUserId"
          FROM "Chat" c
          JOIN "ChatMember" cm ON cm."chatId" = c."id"
          WHERE c."id" IN (${ph})
          ORDER BY c."updatedAt" DESC`,
    args: chatIds,
  })

  // 2. Collect all unique member user IDs
  const memberUserIds = [...new Set(chatsRes.rows
    .map((r: any) => r.memberUserId)
    .filter(Boolean))] as string[]

  // 3. Fetch all member user data in one query
  let userMap = new Map<string, any>()
  if (memberUserIds.length > 0) {
    const uph = memberUserIds.map(() => '?').join(',')
    const usersRes = await db.execute({
      sql: `SELECT "id", "username", "displayName", "avatarUrl", "role", "side" FROM "User" WHERE "id" IN (${uph})`,
      args: memberUserIds,
    })
    for (const row of usersRes.rows) userMap.set(row.id as string, row)
  }

  // 4. Get last message per chat in one query
  const lastMsgsRes = await db.execute({
    sql: `SELECT m."id", m."chatId", m."content", m."type", m."createdAt", m."mediaUrl",
                 u."id" as "senderId", u."displayName" as "senderDisplayName", u."avatarUrl" as "senderAvatarUrl"
          FROM "Message" m
          LEFT JOIN "User" u ON u."id" = m."senderId"
          WHERE m."id" IN (
            SELECT MAX(m2."id") FROM "Message" m2 WHERE m2."chatId" IN (${ph}) GROUP BY m2."chatId"
          )`,
    args: chatIds,
  })
  const lastMsgMap = new Map<string, any>()
  for (const row of lastMsgsRes.rows) lastMsgMap.set(row.chatId as string, row)

  // 5. Assemble — group members per chat
  const chatMap = new Map<string, any>()
  const chatOrder: string[] = []

  for (const row of chatsRes.rows) {
    const cid = row.id as string
    if (!chatMap.has(cid)) {
      chatMap.set(cid, {
        id: cid,
        name: row.name,
        type: row.type,
        side: row.side,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        members: [],
      })
      chatOrder.push(cid)
    }
    const uid = row.memberUserId as string
    const u = userMap.get(uid)
    if (u) {
      chatMap.get(cid).members.push({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        role: u.role,
        side: u.side,
      })
    }
  }

  // 6. Attach lastMessage
  const chats: any[] = []
  for (const cid of chatOrder) {
    const chat = chatMap.get(cid)
    const lm = lastMsgMap.get(cid)
    if (lm) {
      chat.lastMessage = {
        id: lm.id,
        content: lm.content,
        type: lm.type,
        createdAt: lm.createdAt,
        sender: lm.senderId ? {
          id: lm.senderId,
          displayName: lm.senderDisplayName,
          avatarUrl: lm.senderAvatarUrl,
        } : null,
      }
    }
    chats.push(chat)
  }

  return chats
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const userId = searchParams.get('userId')
    const side = searchParams.get('side')
    const chatId = searchParams.get('chatId')
    const db = getDb()

    // ── Branch 1: Get chats for a specific user ──
    if (userId) {
      // Single query: get all chatIds for this user
      const memberRes = await db.execute({
        sql: `SELECT "chatId" FROM "ChatMember" WHERE "userId" = ?`,
        args: [userId],
      })
      const chatIds = memberRes.rows.map((r: any) => r.chatId as string)
      if (chatIds.length === 0) return NextResponse.json([])

      let chats = await buildChatsFromIds(chatIds, db)

      // Role check: only VICE/SUPERIOR can see THREE_MAIN
      const reqUserRes = await db.execute({
        sql: `SELECT "role" FROM "User" WHERE "id" = ?`,
        args: [userId],
      })
      const role = (reqUserRes.rows[0] as any)?.role
      if (role !== 'VICE_AMIR' && role !== 'SUPERIOR_AMIR') {
        chats = chats.filter((c: any) => c.type !== 'THREE_MAIN')
      }

      return NextResponse.json(chats)
    }

    // ── Branch 2: Get chats by side ──
    if (side) {
      const chatsRes = await db.execute({
        sql: `SELECT "id" FROM "Chat" WHERE "side" = ?`,
        args: [side],
      })
      const chatIds = chatsRes.rows.map((r: any) => r.id as string)
      if (chatIds.length === 0) return NextResponse.json([])

      const chats = await buildChatsFromIds(chatIds, db)
      return NextResponse.json(chats)
    }

    // ── Branch 3: Get single chat by ID ──
    if (chatId) {
      const chats = await buildChatsFromIds([chatId], db)
      if (chats.length === 0) {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
      }
      return NextResponse.json(chats[0])
    }

    return NextResponse.json(
      { error: 'Provide userId, side, or chatId query param' },
      { status: 400 }
    )
  } catch (error) {
    console.error('GET /api/chats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

export const runtime = 'nodejs'

function getDb() {
  return createClient({ url: process.env.ASMYA_DB_URL!, authToken: process.env.TURSO_AUTH_TOKEN })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId1, userId2 } = body as { userId1: string; userId2: string }

    if (!userId1 || !userId2) {
      return NextResponse.json({ error: 'userId1 and userId2 are required' }, { status: 400 })
    }

    const db = getDb()

    // Check if a DIRECT chat already exists between the two users
    const m1Res = await db.execute({
      sql: `SELECT cm."chatId" FROM "ChatMember" cm JOIN "Chat" c ON c."id" = cm."chatId" WHERE cm."userId" = ? AND c."type" = 'DIRECT'`,
      args: [userId1],
    })
    const chatIdsForUser1 = m1Res.rows.map((r: any) => r.chatId as string)

    if (chatIdsForUser1.length > 0) {
      const ph = chatIdsForUser1.map(() => '?').join(',')
      const m2Res = await db.execute({
        sql: `SELECT cm."chatId" FROM "ChatMember" cm WHERE cm."userId" = ? AND cm."chatId" IN (${ph})`,
        args: [userId2, ...chatIdsForUser1],
      })
      if (m2Res.rows.length > 0) {
        const existingChatId = m2Res.rows[0].chatId as string
        // Fetch the full chat with flat members
        const chats = await buildChatsFromIds([existingChatId], db)
        if (chats.length > 0) return NextResponse.json(chats[0])
      }
    }

    // Get user1's side
    const u1Res = await db.execute({
      sql: `SELECT "side" FROM "User" WHERE "id" = ?`,
      args: [userId1],
    })
    const user1 = u1Res.rows[0] as any
    if (!user1) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Create chat
    const chatId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c: any) => {
      const r = (Math.random() * 16) | 0; const v = c === 'x' ? r : (r & 0x3) | 0x8; return v.toString(16)
    })
    const now = new Date().toISOString()
    const cm1Id = chatId.replace(/./g, () => { const r = (Math.random() * 16) | 0; return r.toString(16) }).substring(0, 32)
    const cm2Id = chatId.replace(/./g, () => { const r = (Math.random() * 16) | 0; return r.toString(16) }).substring(0, 32)

    await db.execute({
      sql: `INSERT INTO "Chat" ("id","name","type","side","createdAt","updatedAt") VALUES (?,?,?,?,?,?)`,
      args: [chatId, 'DM', 'DIRECT', user1.side, now, now],
    })
    await db.execute({
      sql: `INSERT INTO "ChatMember" ("id","chatId","userId","createdAt") VALUES (?,?,?,?)`,
      args: [cm1Id, chatId, userId1, now],
    })
    await db.execute({
      sql: `INSERT INTO "ChatMember" ("id","chatId","userId","createdAt") VALUES (?,?,?,?)`,
      args: [cm2Id, chatId, userId2, now],
    })

    // Fetch with flat members
    const chats = await buildChatsFromIds([chatId], db)
    return NextResponse.json(chats[0] || { id: chatId, name: 'DM', type: 'DIRECT', side: user1.side, createdAt: now, updatedAt: now, members: [] }, { status: 201 })
  } catch (error) {
    console.error('POST /api/chats/dm error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Reuse the same helper from the parent route
async function buildChatsFromIds(chatIds: string[], db: ReturnType<typeof getDb>): Promise<any[]> {
  if (chatIds.length === 0) return []
  const ph = chatIds.map(() => '?').join(',')

  const chatsRes = await db.execute({
    sql: `SELECT c."id", c."name", c."type", c."side", c."createdAt", c."updatedAt", cm."userId" as "memberUserId"
          FROM "Chat" c JOIN "ChatMember" cm ON cm."chatId" = c."id" WHERE c."id" IN (${ph}) ORDER BY c."updatedAt" DESC`,
    args: chatIds,
  })

  const memberUserIds = [...new Set(chatsRes.rows.map((r: any) => r.memberUserId).filter(Boolean))] as string[]
  let userMap = new Map<string, any>()
  if (memberUserIds.length > 0) {
    const uph = memberUserIds.map(() => '?').join(',')
    const usersRes = await db.execute({
      sql: `SELECT "id", "username", "displayName", "avatarUrl", "role", "side" FROM "User" WHERE "id" IN (${uph})`,
      args: memberUserIds,
    })
    for (const row of usersRes.rows) userMap.set(row.id as string, row)
  }

  const lastMsgsRes = await db.execute({
    sql: `SELECT m."id", m."chatId", m."content", m."type", m."createdAt", m."mediaUrl",
                 u."id" as "senderId", u."displayName" as "senderDisplayName", u."avatarUrl" as "senderAvatarUrl"
          FROM "Message" m LEFT JOIN "User" u ON u."id" = m."senderId"
          WHERE m."id" IN (SELECT MAX(m2."id") FROM "Message" m2 WHERE m2."chatId" IN (${ph}) GROUP BY m2."chatId")`,
    args: chatIds,
  })
  const lastMsgMap = new Map<string, any>()
  for (const row of lastMsgsRes.rows) lastMsgMap.set(row.chatId as string, row)

  const chatMap = new Map<string, any>()
  const chatOrder: string[] = []
  for (const row of chatsRes.rows) {
    const cid = row.id as string
    if (!chatMap.has(cid)) {
      chatMap.set(cid, { id: cid, name: row.name, type: row.type, side: row.side, createdAt: row.createdAt, updatedAt: row.updatedAt, members: [] })
      chatOrder.push(cid)
    }
    const uid = row.memberUserId as string
    const u = userMap.get(uid)
    if (u) chatMap.get(cid).members.push({ id: u.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl, role: u.role, side: u.side })
  }

  const chats: any[] = []
  for (const cid of chatOrder) {
    const chat = chatMap.get(cid)
    const lm = lastMsgMap.get(cid)
    if (lm) {
      chat.lastMessage = { id: lm.id, content: lm.content, type: lm.type, createdAt: lm.createdAt, sender: lm.senderId ? { id: lm.senderId, displayName: lm.senderDisplayName, avatarUrl: lm.senderAvatarUrl } : null }
    }
    chats.push(chat)
  }
  return chats
}
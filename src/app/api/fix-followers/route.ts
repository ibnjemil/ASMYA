import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ChatType } from '@/lib/enums'

export const runtime = 'nodejs'

const ROLE_TO_CHAT: Record<string, string> = {
  EDUCATION_AMIR: 'Education Group',
  COMMUNITY_AMIR: 'Community Group',
  ADMIN_AMIR: 'Admin Group',
  FINANCE_AMIR: 'Finance Group',
  PROGRAM_AMIR: 'Program Group',
  SOCIAL_MEDIA_AMIR: 'Social Media Group',
}

function getChatType(amirRole: string): ChatType | null {
  if (amirRole === 'EDUCATION_AMIR' || amirRole === 'COMMUNITY_AMIR' || amirRole === 'ADMIN_AMIR') return ChatType.SUB_AMIR_GROUP
  if (amirRole === 'FINANCE_AMIR' || amirRole === 'PROGRAM_AMIR' || amirRole === 'SOCIAL_MEDIA_AMIR') return ChatType.SMALL_AMIR_GROUP
  return null
}

export async function GET() {
  try {
    const followers = await db.user.findMany({
      where: { role: 'FOLLOWER', subAmirId: { not: null } },
      select: { id: true, displayName: true, side: true, subAmirId: true },
    })

    const results: Record<string, unknown>[] = []
    let fixed = 0

    for (const f of followers) {
      const amir = await db.user.findUnique({
        where: { id: f.subAmirId! },
        select: { id: true, displayName: true, role: true },
      })
      if (!amir) { results.push({ follower: f.displayName, error: 'amir not found' }); continue }

      const amirRole = String(amir.role)
      const chatName = ROLE_TO_CHAT[amirRole]
      if (!chatName) { results.push({ follower: f.displayName, amirRole, error: 'no chat mapping for amir role' }); continue }

      const ct = getChatType(amirRole)
      if (!ct) { results.push({ follower: f.displayName, amirRole, error: 'unknown amir role category' }); continue }

      const chat = await db.chat.findFirst({
        where: { name: chatName, type: ct, side: f.side },
        select: { id: true, name: true },
      })
      if (!chat) { results.push({ follower: f.displayName, chatName, chatType: ct, side: f.side, error: 'chat not found in DB' }); continue }

      await db.chatMember.upsert({
        where: { chatId_userId: { chatId: chat.id, userId: f.id } },
        create: { chatId: chat.id, userId: f.id },
        update: {},
      })
      fixed++
      results.push({ follower: f.displayName, side: f.side, amir: amir.displayName, amirRole, addedTo: chat.name, status: 'added' })
    }

    return NextResponse.json({ totalFollowers: followers.length, fixed, results })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Role, ChatType } from '@/lib/enums'

export const runtime = 'nodejs'

const SUB_AMIR_ROLES: Role[] = [
  Role.EDUCATION_AMIR,
  Role.COMMUNITY_AMIR,
  Role.ADMIN_AMIR,
]

const SMALL_AMIR_ROLES: Role[] = [
  Role.FINANCE_AMIR,
  Role.PROGRAM_AMIR,
  Role.SOCIAL_MEDIA_AMIR,
]

const ROLE_TO_CHAT: Record<string, string> = {
  EDUCATION_AMIR: 'Education Group',
  COMMUNITY_AMIR: 'Community Group',
  ADMIN_AMIR: 'Admin Group',
  FINANCE_AMIR: 'Finance Group',
  PROGRAM_AMIR: 'Program Group',
  SOCIAL_MEDIA_AMIR: 'Social Media Group',
}

export async function GET() {
  try {
    const followers = await db.user.findMany({
      where: { role: Role.FOLLOWER, subAmirId: { not: null } },
      select: { id: true, side: true, subAmirId: true },
    })
    let fixed = 0
    for (const f of followers) {
      const amir = await db.user.findUnique({
        where: { id: f.subAmirId! },
        select: { role: true },
      })
      if (!amir) continue
      const chatName = ROLE_TO_CHAT[amir.role as string]
      if (!chatName) continue
      let chatType: ChatType | null = null
      if (SUB_AMIR_ROLES.includes(amir.role)) chatType = ChatType.SUB_AMIR_GROUP
      else if (SMALL_AMIR_ROLES.includes(amir.role)) chatType = ChatType.SMALL_AMIR_GROUP
      if (!chatType) continue
      const chat = await db.chat.findFirst({
        where: { name: chatName, type: chatType, side: f.side },
        select: { id: true },
      })
      if (!chat) continue
      await db.chatMember.upsert({
        where: { chatId_userId: { chatId: chat.id, userId: f.id } },
        create: { chatId: chat.id, userId: f.id },
        update: {},
      })
      fixed++
    }
    return NextResponse.json({ fixed, totalFollowers: followers.length })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

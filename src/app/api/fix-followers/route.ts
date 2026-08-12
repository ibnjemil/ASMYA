import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Role, ChatType } from '@/lib/enums'

const SUB_AMIR_ROLES = [Role.EDUCATION_AMIR, Role.COMMUNITY_AMIR, Role.ADMIN_AMIR]
const SMALL_AMIR_ROLES = [Role.FINANCE_AMIR, Role.PROGRAM_AMIR, Role.SOCIAL_MEDIA_AMIR]

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
      const amir = await db.user.findUnique({ where: { id: f.subAmirId! }, select: { role: true } })
      if (!amir) continue

      const chatIds: string[] = []

      if (SUB_AMIR_ROLES.includes(amir.role)) {
        const chatName = ROLE_TO_CHAT[amir.role]
        if (chatName) {
          const chat = await db.chat.findFirst({ where: { name: chatName, type: ChatType.SUB_AMIR_GROUP, side: f.side }, select: { id: true } })
          if (chat) chatIds.push(chat.id)
        }
      } else if (SMALL_AMIR_ROLES.includes(amir.role)) {
        const chatName = ROLE_TO_CHAT[amir.role]
        if (chatName) {
          const chat = await db.chat.findFirst({ where: { name: chatName, type: ChatType.SMALL_AMIR_GROUP, side: f.side }, select: { id: true } })
          if (chat) chatIds.push(chat.id)
        }
        const adminChat = await db.chat.findFirst({ where: { name: ROLE_TO_CHAT.ADMIN_AMIR, type: ChatType.SUB_AMIR_GROUP, side: f.side }, select: { id: true } })
        if (adminChat) chatIds.push(adminChat.id)
      }

      for (const chatId of chatIds) {
        await db.chatMember.upsert({
          where: { chatId_userId: { chatId, userId: f.id } },
          create: { chatId, userId: f.id },
          update: {},
        })
        fixed++
      }
    }

    return NextResponse.json({ fixed, totalFollowers: followers.length })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

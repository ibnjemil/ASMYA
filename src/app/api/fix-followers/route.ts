import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Role, ChatType } from '@/lib/enums'

export const runtime = 'nodejs'

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
      select: { id: true, displayName: true, side: true, subAmirId: true },
    })
    const results = []
    for (const f of followers) {
      const amir = await db.user.findUnique({
        where: { id: f.subAmirId! },
        select: { id: true, displayName: true, role: true },
      })
      const chatName = amir ? ROLE_TO_CHAT[amir.role as string] : null
      const chatType = amir ? ([Role.EDUCATION_AMIR, Role.COMMUNITY_AMIR, Role.ADMIN_AMIR].includes(amir.role) ? 'SUB_AMIR_GROUP' : [Role.FINANCE_AMIR, Role.PROGRAM_AMIR, Role.SOCIAL_MEDIA_AMIR].includes(amir.role) ? 'SMALL_AMIR_GROUP' : null) : null
      const chats = chatName ? await db.chat.findMany({
        where: { name: { contains: chatName.split(' ')[0] } },
        select: { id: true, name: true, type: true, side: true },
      }) : []
      results.push({ follower: f.displayName, side: f.side, amir: amir?.displayName, amirRole: amir?.role, chatName, chatType, matchingChats: chats })
    }
    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

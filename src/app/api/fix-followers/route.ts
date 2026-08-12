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

function getChatType(role: string): ChatType | null {
  if (role === 'EDUCATION_AMIR' || role === 'COMMUNITY_AMIR' || role === 'ADMIN_AMIR') return ChatType.SUB_AMIR_GROUP
  if (role === 'FINANCE_AMIR' || role === 'PROGRAM_AMIR' || role === 'SOCIAL_MEDIA_AMIR') return ChatType.SMALL_AMIR_GROUP
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
      if (!chatName) { results.push({ follower: f.displayName, amirRole, error: 'no chat mapping' }); continue }

      const ct = getChatType(amirRole)
      if (!ct) { results.push({ follower: f.displayName, amirRole, error: 'unknown role category' }); continue }

      const chat = await db.chat.findFirst({
        where: { name: chatName, type: ct, side: f.side },
        select: { id: true, name: true },
      })
      if (!chat) { results.push({ follower: f.displayName, chatName, chatType: ct, side: f.side, error: 'chat not found in DB' }); continue }

      const existing = await db.chatMember.findFirst({
        where: { chatId: chat.id, userId: f.id },
      })
      if (!existing) {
        await db.chatMember.create({
          data: { chatId: chat.id, userId: f.id },
        })
        fixed++
        results.push({ follower: f.displayName, side: f.side, amir: amir.displayName, amirRole, addedTo: chat.name, status: 'added' })
      } else {
        results.push({ follower: f.displayName, side: f.side, amir: amir.displayName, addedTo: chat.name, status: 'already member' })
      }
    }

    return NextResponse.json({ totalFollowers: followers.length, fixed, results })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

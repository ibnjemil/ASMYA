import { NextRequest, NextResponse } from 'next/server'
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const userId = searchParams.get('userId')
    const side = searchParams.get('side')
    const chatId = searchParams.get('chatId')

    if (userId) {
      const reqUser = await db.user.findUnique({
        where: { id: userId },
        select: { role: true, side: true, subAmirId: true },
      })

      // Auto-fix: ensure follower is in their amir's group chat
      if (reqUser?.role === Role.FOLLOWER && reqUser.subAmirId) {
        const amir = await db.user.findUnique({
          where: { id: reqUser.subAmirId },
          select: { role: true },
        })
        if (amir) {
          const chatName = ROLE_TO_CHAT[amir.role as string]
          if (chatName) {
            let ct: ChatType | null = null
            if ([Role.EDUCATION_AMIR, Role.COMMUNITY_AMIR, Role.ADMIN_AMIR].includes(amir.role)) ct = ChatType.SUB_AMIR_GROUP
            else if ([Role.FINANCE_AMIR, Role.PROGRAM_AMIR, Role.SOCIAL_MEDIA_AMIR].includes(amir.role)) ct = ChatType.SMALL_AMIR_GROUP
            if (ct) {
              const chat = await db.chat.findFirst({
                where: { name: chatName, type: ct, side: reqUser.side },
                select: { id: true },
              })
              if (chat) {
                await db.chatMember.upsert({
                  where: { chatId_userId: { chatId: chat.id, userId } },
                  create: { chatId: chat.id, userId },
                  update: {},
                })
              }
            }
          }
        }
      }

      const memberships = await db.chatMember.findMany({
        where: { userId },
        include: {
          chat: {
            include: {
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                      displayName: true,
                      avatarUrl: true,
                      role: true,
                      side: true,
                    },
                  },
                },
              },
              messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: {
                  sender: {
                    select: {
                      id: true,
                      displayName: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      let chats = memberships.map((m) => {
        const { messages, ...chatWithoutMessages } = m.chat
        return {
          ...chatWithoutMessages,
          lastMessage: messages[0] ?? null,
        }
      })

      if (reqUser && reqUser.role !== 'VICE_AMIR' && reqUser.role !== 'SUPERIOR_AMIR') {
        chats = chats.filter((x: any) => x.type !== 'THREE_MAIN')
      }
      return NextResponse.json(chats)
    }

    if (side) {
      const chats = await db.chat.findMany({
        where: { side: side as 'MEN' | 'WOMEN' },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                  role: true,
                  side: true,
                },
              },
            },
          },
        },
      })
      return NextResponse.json(chats)
    }

    if (chatId) {
      const chat = await db.chat.findUnique({
        where: { id: chatId },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                  role: true,
                  side: true,
                },
              },
            },
          },
        },
      })
      if (!chat) {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
      }
      return NextResponse.json(chat)
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

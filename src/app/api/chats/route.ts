import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

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

      if (reqUser && String(reqUser.role) === 'FOLLOWER' && reqUser.subAmirId && reqUser.side) {
        try {
          const amir = await db.user.findUnique({
            where: { id: reqUser.subAmirId },
            select: { role: true, displayName: true },
          })
          if (amir) {
            const amirMemberships = await db.chatMember.findMany({
              where: { userId: reqUser.subAmirId },
              select: { chatId: true },
            })
            let targetChatId: string | null = null
            for (const m of amirMemberships) {
              const chat = await db.chat.findFirst({
                where: { id: m.chatId, type: 'AMIR_GROUP', side: reqUser.side },
                select: { id: true },
              })
              if (chat) { targetChatId = chat.id; break }
            }
            if (!targetChatId) {
              const roleName = String(amir.role).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())
              const newChat = await db.chat.create({
                data: { name: roleName, type: 'AMIR_GROUP', side: reqUser.side },
              })
              targetChatId = newChat.id
              await db.chatMember.create({ data: { chatId: targetChatId, userId: reqUser.subAmirId } })
            }
            const existing = await db.chatMember.findFirst({
              where: { chatId: targetChatId, userId: userId },
            })
            if (!existing) {
              await db.chatMember.create({ data: { chatId: targetChatId, userId: userId } })
            }
          }
        } catch (autoFixErr) {
          console.error('Auto-fix follower chat error:',autoFixErr)
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

      if (reqUser && String(reqUser.role) !== 'VICE_AMIR' && String(reqUser.role) !== 'SUPERIOR_AMIR') {
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

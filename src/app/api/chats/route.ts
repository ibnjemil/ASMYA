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

      const chats = memberships.map((m) => {
        const { messages, ...chatWithoutMessages } = m.chat
        return {
          ...chatWithoutMessages,
          _lastMessage: messages[0] ?? null,
        }
      })

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
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, side, memberIds, createdBy } = body
    const chat = await db.chat.create({
      data: { name, type: type || 'GROUP', side, members: memberIds ? { create: memberIds.map((id: string) => ({ userId: id })) } : undefined },
      include: { members: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, role: true, side: true } } } } }
    })
    return NextResponse.json(chat, { status: 201 })
  } catch (error) {
    console.error('POST /api/chats error:', error)
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 })
  }
}

export async function POST (request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, side, memberIds, createdBy } = body
    if (!name || !side || !createdBy) return NextResponse.json({ error: 'name, side, and createdBy are required' }, { status: 400 })
    const chat = await db.chat.create({
      data: { name, type: type || 'GROUP', side,
        members: memberIds ? { create: memberIds.map((id: string) => ({ userId: id })) } : undefined
      },
      include: { members: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, role: true, side: true } } } } }
    })
    return NextResponse.json(chat, { status: 201 })
  } catch (error) {
    console.error('POST /api/chats error:', error)
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 })
  }
}

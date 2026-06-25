import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId1, userId2 } = body as {
      userId1: string
      userId2: string
    }

    if (!userId1 || !userId2) {
      return NextResponse.json(
        { error: 'userId1 and userId2 are required' },
        { status: 400 }
      )
    }

    // Check if a DIRECT chat already exists between the two users
    const existingMemberships1 = await db.chatMember.findMany({
      where: { userId: userId1 },
      select: { chatId: true },
    })

    const chatIdsForUser1 = existingMemberships1.map((m) => m.chatId)

    if (chatIdsForUser1.length > 0) {
      const existingMember2 = await db.chatMember.findFirst({
        where: {
          userId: userId2,
          chatId: { in: chatIdsForUser1 },
          chat: { type: 'DIRECT' },
        },
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
            },
          },
        },
      })

      if (existingMember2) {
        return NextResponse.json(existingMember2.chat)
      }
    }

    // Get user1's side for the new chat
    const user1 = await db.user.findUnique({
      where: { id: userId1 },
      select: { side: true },
    })

    if (!user1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create new DIRECT chat
    const chat = await db.chat.create({
      data: {
        name: 'DM',
        type: 'DIRECT',
        side: user1.side,
        members: {
          create: [
            { userId: userId1 },
            { userId: userId2 },
          ],
        },
      },
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

    return NextResponse.json(chat, { status: 201 })
  } catch (error) {
    console.error('POST /api/chats/dm error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Role, Side, ChatType } from '@/lib/enums'

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

const TOP_ROLES: Role[] = [
  Role.SUPERIOR_AMIR,
  Role.VICE_AMIR,
  Role.SECRETARY,
]

// GET /api/users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const side = searchParams.get('side') as Side | null
    const role = searchParams.get('role') as Role | null
    const subAmirId = searchParams.get('subAmirId') || null

    const where: Record<string, unknown> = {}
    if (side) where.side = side
    if (role) where.role = role
    if (subAmirId) where.subAmirId = subAmirId

    const users = await db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        side: true,
        subAmirId: true,
        followers: {
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
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('GET /api/users error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

// POST /api/users
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password, displayName, role, side, subAmirId } = body

    const user = await db.user.create({
      data: {
        username,
        password,
        displayName,
        role: role as Role,
        side: side as Side,
        subAmirId: subAmirId || null,
      },
    })

    // Auto-add to correct chat rooms
    const chatIdsToAdd: string[] = []

    if (TOP_ROLES.includes(role as Role)) {
      // Add to NINE_AMIR and THREE_MAIN chats for their side
      const chats = await db.chat.findMany({
        where: {
          side: side as Side,
          type: { in: [ChatType.NINE_AMIR, ChatType.THREE_MAIN] },
        },
        select: { id: true },
      })
      chatIdsToAdd.push(...chats.map((c) => c.id))
    } else if (SUB_AMIR_ROLES.includes(role as Role) || SMALL_AMIR_ROLES.includes(role as Role)) {
      // Add to NINE_AMIR for their side
      const nineAmirChat = await db.chat.findFirst({
        where: { side: side as Side, type: ChatType.NINE_AMIR },
        select: { id: true },
      })
      if (nineAmirChat) {
        chatIdsToAdd.push(nineAmirChat.id)
      }
    } else if (role === Role.FOLLOWER && subAmirId) {
      // Find the subAmir user
      const subAmirUser = await db.user.findUnique({
        where: { id: subAmirId },
        select: { role: true },
      })

      if (subAmirUser) {
        if (SUB_AMIR_ROLES.includes(subAmirUser.role)) {
          // Add to SUB_AMIR_GROUP chat for that sub amir
          // Find by name pattern "{role}_GROUP_{side}"
          const roleLabel = subAmirUser.role.replace('_AMIR', '')
          const chatName = `${roleLabel}_GROUP_${side}`
          const subAmirGroupChat = await db.chat.findFirst({
            where: { name: chatName, type: ChatType.SUB_AMIR_GROUP },
            select: { id: true },
          })
          if (subAmirGroupChat) {
            chatIdsToAdd.push(subAmirGroupChat.id)
          }
        } else if (SMALL_AMIR_ROLES.includes(subAmirUser.role)) {
          // Add to SMALL_AMIR_GROUP for that small amir
          const roleLabel = subAmirUser.role.replace('_AMIR', '')
          const smallAmirChatName = `${roleLabel}_GROUP_${side}`
          const smallAmirGroupChat = await db.chat.findFirst({
            where: { name: smallAmirChatName, type: ChatType.SMALL_AMIR_GROUP },
            select: { id: true },
          })
          if (smallAmirGroupChat) {
            chatIdsToAdd.push(smallAmirGroupChat.id)
          }

          // Find the parent SUB_AMIR_GROUP
          // Small amirs belong to SUB_AMIR groups, find which sub amir group this small amir is in
          const smallAmirMembership = await db.chatMember.findFirst({
            where: { userId: subAmirId },
            include: {
              chat: {
                select: { id: true, type: true, name: true },
              },
            },
          })

          if (smallAmirMembership && smallAmirMembership.chat.type === ChatType.SUB_AMIR_GROUP) {
            chatIdsToAdd.push(smallAmirMembership.chat.id)
          } else if (smallAmirMembership) {
            // If the small amir is in a different chat, find the SUB_AMIR_GROUP for the same side
            // Try to find the parent sub amir group
            const subAmirChats = await db.chatMember.findMany({
              where: {
                userId: subAmirId,
                chat: { type: ChatType.SUB_AMIR_GROUP },
              },
              include: {
                chat: { select: { id: true } },
              },
            })
            for (const membership of subAmirChats) {
              chatIdsToAdd.push(membership.chat.id)
            }
          }
        }
      }
    }

    // Create chat memberships (ignore duplicates)
    if (chatIdsToAdd.length > 0) {
      for (const chatId of chatIdsToAdd) {
        await db.chatMember.upsert({
          where: {
            chatId_userId: { chatId, userId: user.id },
          },
          create: { chatId, userId: user.id },
          update: {},
        })
      }
    }

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('POST /api/users error:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}

// PUT /api/users
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, username, displayName, password, avatarUrl } = body

    const data: Record<string, unknown> = {}
    if (username !== undefined) data.username = username
    if (displayName !== undefined) data.displayName = displayName
    if (password !== undefined) data.password = password
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl

    const updatedUser = await db.user.update({
      where: { id: userId },
      data,
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('PUT /api/users error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

// DELETE /api/users
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    await db.user.delete({
      where: { id: userId },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('DELETE /api/users error:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
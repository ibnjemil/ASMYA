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

const ROLE_TO_CHAT: Record<string, string> = {
  EDUCATION_AMIR: 'Education Group',
  COMMUNITY_AMIR: 'Community Group',
  ADMIN_AMIR: 'Admin Group',
  FINANCE_AMIR: 'Finance Group',
  PROGRAM_AMIR: 'Program Group',
  SOCIAL_MEDIA_AMIR: 'Social Media Group',
}

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

    const raw = await db.user.findMany({
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
        other_User: {
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

    return NextResponse.json(raw)
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

    const chatIdsToAdd: string[] = []

    if (TOP_ROLES.includes(role as Role)) {
      const chats = await db.chat.findMany({
        where: {
          side: side as Side,
          type: { in: [ChatType.NINE_AMIR, ChatType.THREE_MAIN] },
        },
        select: { id: true },
      })
      chatIdsToAdd.push(...chats.map((c) => c.id))
    } else if (SUB_AMIR_ROLES.includes(role as Role)) {
      const nineAmirChat = await db.chat.findFirst({
        where: { side: side as Side, type: ChatType.NINE_AMIR },
        select: { id: true },
      })
      if (nineAmirChat) chatIdsToAdd.push(nineAmirChat.id)

      const chatName = ROLE_TO_CHAT[role as string]
      if (chatName) {
        const ownGroup = await db.chat.findFirst({
          where: { name: chatName, type: ChatType.SUB_AMIR_GROUP, side: side as Side },
          select: { id: true },
        })
        if (ownGroup) chatIdsToAdd.push(ownGroup.id)
      }
    } else if (SMALL_AMIR_ROLES.includes(role as Role)) {
      const nineAmirChat = await db.chat.findFirst({
        where: { side: side as Side, type: ChatType.NINE_AMIR },
        select: { id: true },
      })
      if (nineAmirChat) chatIdsToAdd.push(nineAmirChat.id)

      const chatName = ROLE_TO_CHAT[role as string]
      if (chatName) {
        const ownGroup = await db.chat.findFirst({
          where: { name: chatName, type: ChatType.SMALL_AMIR_GROUP, side: side as Side },
          select: { id: true },
        })
        if (ownGroup) chatIdsToAdd.push(ownGroup.id)
      }
    } else if (role === Role.FOLLOWER && subAmirId) {
      const subAmirUser = await db.user.findUnique({
        where: { id: subAmirId },
        select: { role: true },
      })

      if (subAmirUser) {
        const amirRole = subAmirUser.role as string
        const chatName = ROLE_TO_CHAT[amirRole]

        if (SUB_AMIR_ROLES.includes(subAmirUser.role)) {
          if (chatName) {
            const groupChat = await db.chat.findFirst({
              where: { name: chatName, type: ChatType.SUB_AMIR_GROUP, side: side as Side },
              select: { id: true },
            })
            if (groupChat) chatIdsToAdd.push(groupChat.id)
          }
        } else if (SMALL_AMIR_ROLES.includes(subAmirUser.role)) {
          if (chatName) {
            const smallGroup = await db.chat.findFirst({
              where: { name: chatName, type: ChatType.SMALL_AMIR_GROUP, side: side as Side },
              select: { id: true },
            })
            if (smallGroup) chatIdsToAdd.push(smallGroup.id)
          }

          const parentMemberships = await db.chatMember.findMany({
            where: {
              userId: subAmirId,
              chat: { type: ChatType.SUB_AMIR_GROUP },
            },
            include: { chat: { select: { id: true } } },
          })
          for (const m of parentMemberships) {
            chatIdsToAdd.push(m.chat.id)
          }
        }
      }
    }

    for (const chatId of chatIdsToAdd) {
      await db.chatMember.upsert({
        where: { chatId_userId: { chatId, userId: user.id } },
        create: { chatId, userId: user.id },
        update: {},
      })
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
    const tables = [
      ['chatMember', { userId }],
      ['message', { senderId: userId }],
      ['report', { createdBy: userId }],
      ['announcement', { createdBy: userId }],
      ['cashEntry', { createdBy: userId }],
      ['planAssignment', { userId }],
      ['pushSubscription', { userId }],
    ]
    for (const [model, where] of tables) {
      try {
        const items = await db[model].findMany({ where, select: { id: true } })
        for (const item of items) {
          try { await db[model].delete({ where: { id: item.id } }) } catch {}
        }
      } catch {}
    }
    await db.user.delete({ where: { id: userId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/users error:', error)
    return NextResponse.json({ error: 'Failed to delete user: ' + String(error) }, { status: 500 })
  }
}
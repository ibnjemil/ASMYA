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
    } else if (SUB_AMIR_ROLES.includes(role as Role)) {
      // Add to NINE_AMIR for their side
      const nineAmirChat = await db.chat.findFirst({
        where: { side: side as Side, type: ChatType.NINE_AMIR },
        select: { id: true },
      })
      if (nineAmirChat) {
        chatIdsToAdd.push(nineAmirChat.id)
      }
      // Also add to their own SUB_AMIR_GROUP
      const roleLabel = (role as string).replace('_AMIR', '')
      const ownGroup = await db.chat.findFirst({
        where: { name: `${roleLabel}_GROUP_${side}`, type: ChatType.SUB_AMIR_GROUP },
        select: { id: true },
      })
      if (ownGroup) {
        chatIdsToAdd.push(ownGroup.id)
      }
    } else if (SMALL_AMIR_ROLES.includes(role as Role)) {
      // Add to NINE_AMIR for their side
      const nineAmirChat = await db.chat.findFirst({
        where: { side: side as Side, type: ChatType.NINE_AMIR },
        select: { id: true },
      })
      if (nineAmirChat) {
        chatIdsToAdd.push(nineAmirChat.id)
      }
      // Also add to their own SMALL_AMIR_GROUP
      const roleLabel = (role as string).replace('_AMIR', '')
      const ownGroup = await db.chat.findFirst({
        where: { name: `${roleLabel}_GROUP_${side}`, type: ChatType.SMALL_AMIR_GROUP },
        select: { id: true },
      })
      if (ownGroup) {
        chatIdsToAdd.push(ownGroup.id)
      }
    } else if (role === Role.FOLLOWER && subAmirId) {
      const subAmirUser = await db.user.findUnique({ where: { id: subAmirId }, select: { role: true } })
      if (subAmirUser) {
        async function findOrCreateGroup(name, type, chatSide) {
          let group = await db.chat.findFirst({ where: { name, type }, select: { id: true } })
          if (!group) {
            group = await db.chat.create({ data: { name, type, side: chatSide }, select: { id: true } })
            await db.chatMember.upsert({ where: { chatId_userId: { chatId: group.id, userId: subAmirId } }, create: { chatId: group.id, userId: subAmirId }, update: {} })
            console.log("Created group chat:", name)
          }
          return group
        }
        if (SUB_AMIR_ROLES.includes(subAmirUser.role)) {
          const roleLabel = subAmirUser.role.replace("_AMIR", "")
          const group = await findOrCreateGroup(roleLabel + "_GROUP_" + side, "SUB_AMIR_GROUP", side)
          if (group) chatIdsToAdd.push(group.id)
        } else if (SMALL_AMIR_ROLES.includes(subAmirUser.role)) {
          const roleLabel = subAmirUser.role.replace("_AMIR", "")
          const smallGroup = await findOrCreateGroup(roleLabel + "_GROUP_" + side, "SMALL_AMIR_GROUP", side)
          if (smallGroup) chatIdsToAdd.push(smallGroup.id)
          const parentMemberships = await db.chatMember.findMany({ where: { userId: subAmirId, chat: { type: "SUB_AMIR_GROUP" } }, include: { chat: { select: { id: true } } } })
          for (const m of parentMemberships) chatIdsToAdd.push(m.chat.id)
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
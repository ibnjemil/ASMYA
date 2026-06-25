import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Role, Side, ChatType } from '@prisma/client'

export const runtime = 'nodejs'

const DEFAULT_PASSWORD = '12345678'

interface UserSeed {
  username: string
  displayName: string
  role: Role
  side: Side
}

const MEN_USERS: UserSeed[] = [
  { username: 'ustaz_jihad_m', displayName: 'Ustaz Jihad', role: Role.SUPERIOR_AMIR, side: Side.MEN },
  { username: 'vice_amir_m', displayName: 'Vice Amir', role: Role.VICE_AMIR, side: Side.MEN },
  { username: 'secretary_m', displayName: 'Secretary', role: Role.SECRETARY, side: Side.MEN },
  { username: 'education_amir_m', displayName: 'Education Amir', role: Role.EDUCATION_AMIR, side: Side.MEN },
  { username: 'community_amir_m', displayName: 'Community Amir', role: Role.COMMUNITY_AMIR, side: Side.MEN },
  { username: 'admin_amir_m', displayName: 'Admin Amir', role: Role.ADMIN_AMIR, side: Side.MEN },
  { username: 'finance_amir_m', displayName: 'Finance Amir', role: Role.FINANCE_AMIR, side: Side.MEN },
  { username: 'program_amir_m', displayName: 'Program Amir', role: Role.PROGRAM_AMIR, side: Side.MEN },
  { username: 'social_media_amir_m', displayName: 'Social Media Amir', role: Role.SOCIAL_MEDIA_AMIR, side: Side.MEN },
]

const WOMEN_USERS: UserSeed[] = [
  { username: 'vice_amir_w', displayName: 'Vice Amirah', role: Role.VICE_AMIR, side: Side.WOMEN },
  { username: 'secretary_w', displayName: 'Secretary Amirah', role: Role.SECRETARY, side: Side.WOMEN },
  { username: 'education_amir_w', displayName: 'Education Amirah', role: Role.EDUCATION_AMIR, side: Side.WOMEN },
  { username: 'community_amir_w', displayName: 'Community Amirah', role: Role.COMMUNITY_AMIR, side: Side.WOMEN },
  { username: 'admin_amir_w', displayName: 'Admin Amirah', role: Role.ADMIN_AMIR, side: Side.WOMEN },
  { username: 'finance_amir_w', displayName: 'Finance Amirah', role: Role.FINANCE_AMIR, side: Side.WOMEN },
  { username: 'program_amir_w', displayName: 'Program Amirah', role: Role.PROGRAM_AMIR, side: Side.WOMEN },
  { username: 'social_media_amir_w', displayName: 'Social Media Amirah', role: Role.SOCIAL_MEDIA_AMIR, side: Side.WOMEN },
]

interface ChatSeed {
  name: string
  type: ChatType
  side: Side
  roleFilter?: Role
}

const CHAT_TEMPLATES: ChatSeed[] = [
  { name: 'Nine Amir Council', type: ChatType.NINE_AMIR, side: Side.MEN },
  { name: 'Nine Amir Council', type: ChatType.NINE_AMIR, side: Side.WOMEN },
  { name: 'Three Main Amirs', type: ChatType.THREE_MAIN, side: Side.MEN },
  { name: 'Three Main Amirs', type: ChatType.THREE_MAIN, side: Side.WOMEN },
  { name: 'Education Group', type: ChatType.SUB_AMIR_GROUP, side: Side.MEN, roleFilter: Role.EDUCATION_AMIR },
  { name: 'Education Group', type: ChatType.SUB_AMIR_GROUP, side: Side.WOMEN, roleFilter: Role.EDUCATION_AMIR },
  { name: 'Community Group', type: ChatType.SUB_AMIR_GROUP, side: Side.MEN, roleFilter: Role.COMMUNITY_AMIR },
  { name: 'Community Group', type: ChatType.SUB_AMIR_GROUP, side: Side.WOMEN, roleFilter: Role.COMMUNITY_AMIR },
  { name: 'Admin Group', type: ChatType.SUB_AMIR_GROUP, side: Side.MEN, roleFilter: Role.ADMIN_AMIR },
  { name: 'Admin Group', type: ChatType.SUB_AMIR_GROUP, side: Side.WOMEN, roleFilter: Role.ADMIN_AMIR },
  { name: 'Finance Group', type: ChatType.SMALL_AMIR_GROUP, side: Side.MEN, roleFilter: Role.FINANCE_AMIR },
  { name: 'Finance Group', type: ChatType.SMALL_AMIR_GROUP, side: Side.WOMEN, roleFilter: Role.FINANCE_AMIR },
  { name: 'Program Group', type: ChatType.SMALL_AMIR_GROUP, side: Side.MEN, roleFilter: Role.PROGRAM_AMIR },
  { name: 'Program Group', type: ChatType.SMALL_AMIR_GROUP, side: Side.WOMEN, roleFilter: Role.PROGRAM_AMIR },
  { name: 'Social Media Group', type: ChatType.SMALL_AMIR_GROUP, side: Side.MEN, roleFilter: Role.SOCIAL_MEDIA_AMIR },
  { name: 'Social Media Group', type: ChatType.SMALL_AMIR_GROUP, side: Side.WOMEN, roleFilter: Role.SOCIAL_MEDIA_AMIR },
  { name: 'Public Channel', type: ChatType.PUBLIC, side: Side.MEN },
  { name: 'Public Channel', type: ChatType.PUBLIC, side: Side.WOMEN },
]

export async function POST() {
  try {
    // --- Seed Users ---
    const allUsers = [...MEN_USERS, ...WOMEN_USERS]
    const createdUsers = new Map<string, string>()

    for (const userSeed of allUsers) {
      const existing = await db.user.findUnique({
        where: { username: userSeed.username },
      })

      if (existing) {
        createdUsers.set(userSeed.username, existing.id)
        continue
      }

      const user = await db.user.create({
        data: {
          username: userSeed.username,
          displayName: userSeed.displayName,
          password: DEFAULT_PASSWORD,
          role: userSeed.role,
          side: userSeed.side,
        },
      })
      createdUsers.set(userSeed.username, user.id)
    }

    // --- Seed Chats and Members ---
    for (const chatSeed of CHAT_TEMPLATES) {
      // Upsert chat by unique name+side combo
      const existingChat = await db.chat.findFirst({
        where: { name: chatSeed.name, side: chatSeed.side },
      })

      let chatId: string
      if (existingChat) {
        chatId = existingChat.id
      } else {
        const chat = await db.chat.create({
          data: {
            name: chatSeed.name,
            type: chatSeed.type,
            side: chatSeed.side,
          },
        })
        chatId = chat.id
      }

      // Determine member user IDs based on chat type and side
      const memberIds: string[] = []

      if (chatSeed.type === ChatType.NINE_AMIR) {
        if (chatSeed.side === Side.MEN) {
          // All 9 men's amirs
          for (const u of MEN_USERS) {
            const id = createdUsers.get(u.username)
            if (id) memberIds.push(id)
          }
        } else {
          // All 8 women's amirs PLUS ustaz_jihad_m
          for (const u of WOMEN_USERS) {
            const id = createdUsers.get(u.username)
            if (id) memberIds.push(id)
          }
          const ustazId = createdUsers.get('ustaz_jihad_m')
          if (ustazId) memberIds.push(ustazId)
        }
      } else if (chatSeed.type === ChatType.THREE_MAIN) {
        if (chatSeed.side === Side.MEN) {
          // ustaz_jihad_m, vice_amir_m, secretary_m
          for (const uname of ['ustaz_jihad_m', 'vice_amir_m', 'secretary_m']) {
            const id = createdUsers.get(uname)
            if (id) memberIds.push(id)
          }
        } else {
          // vice_amir_w, secretary_w, ustaz_jihad_m
          for (const uname of ['vice_amir_w', 'secretary_w', 'ustaz_jihad_m']) {
            const id = createdUsers.get(uname)
            if (id) memberIds.push(id)
          }
        }
      } else if (chatSeed.type === ChatType.SUB_AMIR_GROUP && chatSeed.roleFilter) {
        // The corresponding sub amir for that side
        const sideUsers = chatSeed.side === Side.MEN ? MEN_USERS : WOMEN_USERS
        for (const u of sideUsers) {
          if (u.role === chatSeed.roleFilter) {
            const id = createdUsers.get(u.username)
            if (id) memberIds.push(id)
          }
        }
      } else if (chatSeed.type === ChatType.SMALL_AMIR_GROUP && chatSeed.roleFilter) {
        // The corresponding small amir for that side
        const sideUsers = chatSeed.side === Side.MEN ? MEN_USERS : WOMEN_USERS
        for (const u of sideUsers) {
          if (u.role === chatSeed.roleFilter) {
            const id = createdUsers.get(u.username)
            if (id) memberIds.push(id)
          }
        }
      } else if (chatSeed.type === ChatType.PUBLIC) {
        // All amirs for that side
        const sideUsers = chatSeed.side === Side.MEN ? MEN_USERS : WOMEN_USERS
        for (const u of sideUsers) {
          const id = createdUsers.get(u.username)
          if (id) memberIds.push(id)
        }
      }

      // Add members one by one using upsert to handle duplicates
      if (memberIds.length > 0) {
        for (const userId of memberIds) {
          await db.chatMember.upsert({
            where: { chatId_userId: { chatId, userId } },
            create: { chatId, userId },
            update: {},
          })
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Database initialized' })
  } catch (error) {
    console.error('POST init error:', error)
    return NextResponse.json({ error: 'Failed to initialize database' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const steps: Record<string, unknown>[] = []

    const reqUser = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, side: true, subAmirId: true },
    })
    steps.push({ step: '1-get-user', user: reqUser })

    if (!reqUser || String(reqUser.role) !== 'FOLLOWER') {
      return NextResponse.json({ steps, error: 'Not a follower or user not found' })
    }
    if (!reqUser.subAmirId) {
      return NextResponse.json({ steps, error: 'Follower has no subAmirId' })
    }
    if (!reqUser.side) {
      return NextResponse.json({ steps, error: 'Follower has no side' })
    }

    const amir = await db.user.findUnique({
      where: { id: reqUser.subAmirId },
      select: { role: true, displayName: true },
    })
    steps.push({ step: '2-get-amir', amir })

    if (!amir) {
      return NextResponse.json({ steps, error: 'Amir not found' })
    }

    const amirMemberships = await db.chatMember.findMany({
      where: { userId: reqUser.subAmirId },
      select: { chatId: true },
    })
    steps.push({ step: '3-amir-memberships', count: amirMemberships.length, chatIds: amirMemberships.map(m => m.chatId) })

    let targetChatId: string | null = null
    for (const m of amirMemberships) {
      const chat = await db.chat.findFirst({
        where: { id: m.chatId, type: 'AMIR_GROUP', side: reqUser.side },
        select: { id: true, name: true, type: true, side: true },
      })
      if (chat) {
        steps.push({ step: '4-found-amir-group', chat })
        targetChatId = chat.id
        break
      }
    }

    if (!targetChatId) {
      steps.push({ step: '5-no-group-found-creating', amirRole: amir.role })
      try {
        const roleName = String(amir.role).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())
        const newChat = await db.chat.create({
          data: { name: roleName, type: 'AMIR_GROUP', side: reqUser.side },
        })
        steps.push({ step: '6-chat-created', chat: newChat })
        targetChatId = newChat.id
        try {
          await db.chatMember.create({ data: { chatId: targetChatId, userId: reqUser.subAmirId } })
          steps.push({ step: '7-amir-added', status: 'ok' })
        } catch (e) {
          steps.push({ step: '7-amir-added', status: 'ERROR', error: String(e) })
        }
      } catch (e) {
        steps.push({ step: '6-create-failed', error: String(e) })
        return NextResponse.json({ steps })
      }
    }

    try {
      const existing = await db.chatMember.findFirst({
        where: { chatId: targetChatId, userId: userId },
      })
      steps.push({ step: '8-check-member', found: !!existing })
      if (!existing) {
        await db.chatMember.create({ data: { chatId: targetChatId, userId: userId } })
        steps.push({ step: '9-follower-added', status: 'ok' })
      } else {
        steps.push({ step: '9-already-member', status: 'ok' })
      }
    } catch (e) {
      steps.push({ step: '9-add-failed', error: String(e) })
    }

    const finalChats = await db.chatMember.findMany({
      where: { userId },
      include: { chat: { select: { id: true, name: true, type: true } } },
    })
    steps.push({ step: '10-final-chats', count: finalChats.length, chats: finalChats.map(m => m.chat) })

    return NextResponse.json({ steps })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

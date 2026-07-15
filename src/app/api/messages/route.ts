import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const chatId = searchParams.get('chatId')
    if (!chatId) {
      return NextResponse.json({ error: 'chatId required' }, { status: 400 })
    }

    const rawLimit = searchParams.get('limit')
    const before = searchParams.get('before')

    // Backward compat: no limit = return raw array (old behavior)
    if (!rawLimit) {
      const messages = await db.message.findMany({
        where: { chatId },
        orderBy: { createdAt: 'asc' },
        include: {
          sender: {
            select: { id: true, username: true, displayName: true, avatarUrl: true, role: true, side: true },
          },
        },
      })
      return NextResponse.json(messages)
    }

    // New paginated behavior
    const limit = Math.min(parseInt(rawLimit) || 50, 100)
    const whereClause: any = { chatId }
    if (before) {
      whereClause.createdAt = { lt: new Date(before) }
    }

    const messages = await db.message.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, role: true, side: true },
        },
      },
    })

    let hasMore = false
    if (messages.length === limit && messages.length > 0) {
      const oldest = messages[messages.length - 1]
      hasMore = (await db.message.count({
        where: { chatId, createdAt: { lt: new Date(oldest.createdAt) } },
      })) > 0
    }

    return NextResponse.json({
      messages: messages.reverse(),
      hasMore,
    })
  } catch (error) {
    console.error('GET /api/messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chatId, senderId, type, content, mediaUrl } = body as {
      chatId: string
      senderId: string
      type: 'TEXT' | 'IMAGE' | 'FILE' | 'VOICE' | 'VIDEO'
      content: string
      mediaUrl?: string | null
    }

    if (!chatId || !senderId || !type || !content) {
      return NextResponse.json(
        { error: 'chatId, senderId, type, and content are required' },
        { status: 400 },
      )
    }

    const message = await db.message.create({
      data: { chatId, senderId, type, content, mediaUrl: mediaUrl ?? null },
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, role: true, side: true },
        },
      },
    })

    await db.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error('POST /api/messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { messageId, content } = body as { messageId: string; content: string }
    if (!messageId || content === undefined) {
      return NextResponse.json({ error: 'messageId and content are required' }, { status: 400 })
    }
    const message = await db.message.findUnique({ where: { id: messageId } })
    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    const updated = await db.message.update({ where: { id: messageId }, data: { content } })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('PUT /api/messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const messageId = searchParams.get('messageId')
    if (!messageId) return NextResponse.json({ error: 'messageId required' }, { status: 400 })
    const message = await db.message.findUnique({ where: { id: messageId } })
    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    await db.message.delete({ where: { id: messageId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

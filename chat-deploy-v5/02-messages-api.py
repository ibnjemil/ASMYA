#!/usr/bin/env python3
"""v5 Fix 2: Messages API - add limit/before pagination support"""
import os

BASE = '/workspaces/ASMYA'
FILE = os.path.join(BASE, 'src/app/api/messages/route.ts')

with open(FILE, 'r') as f:
    c = f.read()

# Check if pagination already exists
if 'limit' in c and 'before' in c and 'searchParams' in c:
    # Already has some query params, check if limit/before are supported
    if 'searchParams.get' in c and 'limit' in c:
        print('  SKIP Messages API already has pagination')
        os._exit(0)

content = r"""import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const chatId = searchParams.get('chatId')
    const limitParam = searchParams.get('limit')
    const before = searchParams.get('before')

    if (!chatId) {
      return NextResponse.json(
        { error: 'chatId query param is required' },
        { status: 400 }
      )
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 9999
    const whereClause: any = { chatId }
    if (before) {
      whereClause.createdAt = { lt: new Date(before) }
    }

    // Fetch in reverse to get the latest N, then reverse back
    const messages = await db.message.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            role: true,
            side: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            type: true,
            sender: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
      },
    })

    // Reverse to chronological order
    messages.reverse()

    return NextResponse.json(messages)
  } catch (error) {
    console.error('GET /api/messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chatId, senderId, type, content, mediaUrl, replyToId } = body as {
      chatId: string
      senderId: string
      type: string
      content: string
      mediaUrl?: string | null
      replyToId?: string | null
    }

    if (!chatId || !senderId || !type || !content) {
      return NextResponse.json(
        { error: 'chatId, senderId, type, and content are required' },
        { status: 400 }
      )
    }

    const message = await db.message.create({
      data: {
        chatId,
        senderId,
        type,
        content,
        mediaUrl: mediaUrl ?? null,
        replyToId: replyToId ?? null,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            role: true,
            side: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            type: true,
            sender: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
      },
    })

    // Update chat's updatedAt to now
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
    const { messageId, content } = body as {
      messageId: string
      content: string
    }

    if (!messageId || content === undefined) {
      return NextResponse.json(
        { error: 'messageId and content are required' },
        { status: 400 }
      )
    }

    const message = await db.message.findUnique({
      where: { id: messageId },
    })

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const updated = await db.message.update({
      where: { id: messageId },
      data: { content },
    })

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
    const forEveryone = searchParams.get('forEveryone') === 'true'

    if (!messageId) {
      return NextResponse.json(
        { error: 'messageId query param is required' },
        { status: 400 }
      )
    }

    const message = await db.message.findUnique({
      where: { id: messageId },
    })

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    if (forEveryone) {
      // Delete from database entirely
      await db.message.delete({
        where: { id: messageId },
      })
    } else {
      // Soft delete: clear content and media
      await db.message.update({
        where: { id: messageId },
        data: { content: '[Message deleted]', mediaUrl: null, replyToId: null },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
"""

with open(FILE, 'w') as f:
    f.write(content)

print('  OK Messages API: added limit/before pagination + kept replyTo + delete')
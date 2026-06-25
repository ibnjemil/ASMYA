import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Side } from '@prisma/client'

export const runtime = 'nodejs'

// GET /api/announcements
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const side = searchParams.get('side') as Side | null

    const where: Record<string, unknown> = {}
    if (side) where.side = side

    const announcements = await db.announcement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    })

    return NextResponse.json(announcements)
  } catch (error) {
    console.error('GET /api/announcements error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch announcements' },
      { status: 500 },
    )
  }
}

// POST /api/announcements
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, content, mediaUrl, createdBy, side, isPublic } = body

    const announcement = await db.announcement.create({
      data: {
        title,
        content,
        mediaUrl: mediaUrl || null,
        createdBy,
        side: side as Side,
        isPublic: isPublic ?? false,
      },
      include: {
        creator: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    })

    return NextResponse.json(announcement, { status: 201 })
  } catch (error) {
    console.error('POST /api/announcements error:', error)
    return NextResponse.json(
      { error: 'Failed to create announcement' },
      { status: 500 },
    )
  }
}

// PUT /api/announcements
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { announcementId, title, content, mediaUrl } = body

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title
    if (content !== undefined) data.content = content
    if (mediaUrl !== undefined) data.mediaUrl = mediaUrl

    const updated = await db.announcement.update({
      where: { id: announcementId },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PUT /api/announcements error:', error)
    return NextResponse.json(
      { error: 'Failed to update announcement' },
      { status: 500 },
    )
  }
}

// DELETE /api/announcements
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const announcementId = searchParams.get('announcementId')

    if (!announcementId) {
      return NextResponse.json(
        { error: 'announcementId is required' },
        { status: 400 },
      )
    }

    await db.announcement.delete({
      where: { id: announcementId },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('DELETE /api/announcements error:', error)
    return NextResponse.json(
      { error: 'Failed to delete announcement' },
      { status: 500 },
    )
  }
}
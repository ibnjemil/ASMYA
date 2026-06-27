import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Side } from '@/lib/enums'

export const runtime = 'nodejs'

// GET: ?side=X - Get all public posts for side with poster and comments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const side = searchParams.get('side') as Side | null

    if (!side || !['MEN', 'WOMEN'].includes(side)) {
      return NextResponse.json({ error: 'Valid side parameter (MEN/WOMEN) is required' }, { status: 400 })
    }

    const posts = await db.publicPost.findMany({
      where: { side },
      orderBy: { createdAt: 'desc' },
      include: {
        poster: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            poster: {
              select: { id: true, displayName: true, avatarUrl: true },
            },
          },
        },
      },
    })

    return NextResponse.json(posts)
  } catch (error) {
    console.error('GET public-posts error:', error)
    return NextResponse.json({ error: 'Failed to fetch public posts' }, { status: 500 })
  }
}

// POST: Create a new public post
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { content, mediaUrl, mediaType, postedBy, side } = body

    if (!content || !postedBy || !side) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const post = await db.publicPost.create({
      data: {
        content,
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
        postedBy,
        side,
      },
      include: {
        poster: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    })

    return NextResponse.json({ ...post, comments: [] }, { status: 201 })
  } catch (error) {
    console.error('POST public-posts error:', error)
    return NextResponse.json({ error: 'Failed to create public post' }, { status: 500 })
  }
}

// DELETE: ?postId=X - Delete a public post (cascades comments)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')

    if (!postId) {
      return NextResponse.json({ error: 'postId query parameter is required' }, { status: 400 })
    }

    await db.publicPost.delete({
      where: { id: postId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE public-posts error:', error)
    return NextResponse.json({ error: 'Failed to delete public post' }, { status: 500 })
  }
}

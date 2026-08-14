import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
])

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const avatarFile = formData.get('avatar') as File | null
    const userId = formData.get('userId') as string | null

    if (!avatarFile || !userId) {
      return NextResponse.json({ error: 'avatar file and userId are required' }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.has(avatarFile.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PNG, JPG, WebP, and GIF are allowed.' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await avatarFile.arrayBuffer())
    const base64 = buffer.toString('base64')
    const avatarUrl = 'data:' + avatarFile.type + ';base64,' + base64

    await db.user.update({
      where: { id: userId },
      data: { avatarUrl },
    })

    return NextResponse.json({ avatarUrl })
  } catch (error) {
    console.error('POST upload-avatar error:', error)
    return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 })
  }
}

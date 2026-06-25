import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFile, unlink } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export const runtime = 'nodejs'

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
])

const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const UPLOAD_DIR = '/home/z/my-project/upload/avatars'

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

    const ext = MIME_TO_EXT[avatarFile.type]
    const timestamp = Date.now()
    const filename = `${userId}-${timestamp}.${ext}`
    const filePath = path.join(UPLOAD_DIR, filename)

    const buffer = Buffer.from(await avatarFile.arrayBuffer())
    await writeFile(filePath, buffer)

    // Check if user had an old avatar, delete it from disk
    const user = await db.user.findUnique({ where: { id: userId } })
    if (user?.avatarUrl) {
      const oldFilename = user.avatarUrl.replace('/api/files/avatars/', '')
      if (oldFilename) {
        const oldPath = path.join(UPLOAD_DIR, oldFilename)
        try {
          if (existsSync(oldPath)) {
            await unlink(oldPath)
          }
        } catch {
          // Gracefully handle old file deletion failure
        }
      }
    }

    // Update user avatarUrl in database
    const avatarUrl = `/api/files/avatars/${filename}`
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

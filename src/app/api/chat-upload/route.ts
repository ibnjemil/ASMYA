import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'

export const runtime = 'nodejs'

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'chat')

export async function POST(request: NextRequest) {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const ext = extname(file.name) || '.bin'
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filename = Date.now() + '-' + safeName
    const filepath = join(UPLOAD_DIR, filename)

    await writeFile(filepath, Buffer.from(bytes))
    const url = '/uploads/chat/' + filename

    return NextResponse.json({ url })
  } catch (error) {
    console.error('chat-upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

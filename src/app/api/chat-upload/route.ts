import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
const MAX_SIZE = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mime = file.type || 'application/octet-stream'
    const url = 'data:' + mime + ';base64,' + base64

    return NextResponse.json({ url })
  } catch (error) {
    console.error('chat-upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

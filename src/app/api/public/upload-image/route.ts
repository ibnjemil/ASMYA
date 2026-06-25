import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'

export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get('x-public-role')
    if (role !== 'TEACHER') return NextResponse.json({ error: 'Teacher only' }, { status: 403 })

    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const ext = file.name.split('.').pop() || 'jpg'
    const filename = `${Date.now()}.${ext}`
    const filepath = join(process.cwd(), 'public', 'uploads', 'test-results', filename)

    await writeFile(filepath, Buffer.from(bytes))
    return NextResponse.json({ imageUrl: `/uploads/test-results/${filename}` })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
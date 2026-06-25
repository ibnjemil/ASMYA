import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export const runtime = 'nodejs'

const UPLOAD_ROOT = '/home/z/my-project/upload'

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params

    if (!segments || segments.length === 0) {
      return NextResponse.json({ error: 'No path specified' }, { status: 400 })
    }

    // Resolve the requested file path
    const requestedPath = path.resolve(UPLOAD_ROOT, ...segments)

    // Security: ensure the resolved path is within UPLOAD_ROOT (prevent path traversal)
    if (!requestedPath.startsWith(UPLOAD_ROOT + path.sep) && requestedPath !== UPLOAD_ROOT) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (!existsSync(requestedPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const fileStat = await stat(requestedPath)
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: 'Not a file' }, { status: 400 })
    }

    const fileBuffer = await readFile(requestedPath)
    const ext = path.extname(requestedPath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileBuffer.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('GET files error:', error)
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 })
  }
}

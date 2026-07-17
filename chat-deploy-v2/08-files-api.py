#!/usr/bin/env python3
"""Fix 8: Update files API to support chat media from /tmp/asmya-uploads on Vercel"""
import os

BASE = '/workspaces/ASMYA'
FILE = os.path.join(BASE, 'src/app/api/files/[...path]/route.ts')

content = r"""import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export const runtime = 'nodejs'

// Try multiple upload roots for different environments
const UPLOAD_ROOTS = [
  process.env.UPLOAD_DIR || '/tmp/asmya-uploads',
  '/home/z/my-project/upload',
  '/tmp/asmya-uploads',
]

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
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv',
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

    const filename = segments.join('/')

    // Try each upload root to find the file
    let requestedPath: string | null = null
    let foundRoot = ''
    for (const root of UPLOAD_ROOTS) {
      const candidate = path.resolve(root, filename)
      // Security check
      if (candidate.startsWith(root + path.sep) || candidate === root) {
        if (existsSync(candidate)) {
          requestedPath = candidate
          foundRoot = root
          break
        }
      }
    }

    if (!requestedPath) {
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
"""

with open(FILE, 'w') as f:
    f.write(content)

print(f"✅ Updated {FILE} with multi-root file serving")
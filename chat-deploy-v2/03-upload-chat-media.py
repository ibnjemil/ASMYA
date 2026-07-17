#!/usr/bin/env python3
"""Fix 3: Create upload-chat-media API route for all media types"""
import os

BASE = '/workspaces/ASMYA'
DIR = os.path.join(BASE, 'src/app/api/upload-chat-media')
os.makedirs(DIR, exist_ok=True)

content = r"""import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

export const runtime = 'nodejs'

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/asmya-uploads'

// Ensure upload dir exists
import { mkdir } from 'fs/promises'
async function ensureDir() {
  try { await mkdir(UPLOAD_DIR, { recursive: true }) } catch {}
}

const ALLOWED = new Set([
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
])

const EXT_MAP: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
  'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/ogg': 'ogg', 'audio/webm': 'webm',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt', 'text/csv': 'csv',
}

export async function POST(request: NextRequest) {
  try {
    await ensureDir()
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: `File type ${file.type} not allowed` }, { status: 400 })
    }

    // 10MB limit for free tier
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const ext = EXT_MAP[file.type] || 'bin'
    const id = crypto.randomBytes(8).toString('hex')
    const filename = `${id}-${Date.now()}.${ext}`
    const filePath = path.join(UPLOAD_DIR, filename)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    const url = `/api/files/${filename}`
    return NextResponse.json({ url, filename, size: file.size, type: file.type })
  } catch (error) {
    console.error('upload-chat-media error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
"""

FILE = os.path.join(DIR, 'route.ts')
with open(FILE, 'w') as f:
    f.write(content)

print(f"✅ Created {FILE}")
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const url = process.env.DATABASE_URL ?/ 'unknown'
    const hasToken = !!process.env.TURSO_AUTH_TOKEN
    const startsLibsql = url?.startsWith('libsql://')
    return NextResponse.json({ url: url?.substring(0, 50), hasToken, startsLibsql, envs: Object.keys(process.env).filter(k => k.includes('DATA') || k.includes('TURSO')) })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

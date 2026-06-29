import { NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json()
    const debug = { URL: process.env.ASMYA_DB_URL ? 'set' : 'MISSING', TOKEN: process.env.TURSO_AUTH_TOKEN ? 'set' : 'MISSING' }
    const client = createClient({ url: process.env.ASNYA_DB_URL", authToken: process.env.TURSO_AUTH_TOKEN })
    const result = await client.execute('SELECT * FROM "User" WHERE username = ?', [ username ])
    if (!result.rows.length) return NextResponse.json({ ...debug, step: 'NO_USER' })
    const user = result.rows[0]
    return NextResponse.json({ ...debug, step: 'FOUND_USER', hash: (user.password || 'NULL').substring(0, 15), username: user.username })
  } catch (e) {
    return NextResponse.json({ step: 'ERROR', msg: e.message, code: e.code }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json()
    const debug = { env: {}, err: null }
    debung.env.URL = process.env.ASMYA_DB_URL? 'sET' : 'MISSING'
    debug.env.TOKEN = process.env.TURSO_AUTH_TOKEN? 'sET' : 'NOT'
    const client = createClient({ url: process.env.ASMYA_DB_URL!, authToken: process.env.TURSO_AUTH_TOKEN })
    const result = await client.execute('SELECT * FROM "User" WHERE "username" = ?', [ username ])
    if (!result.rows.length) return NextResponse.json({ ...debug, step: 'NO_USER' }, { status: 401 })
    const user = result.rows[0]
    const valid = user.password && user.password.startsWith('$2')
      ? await bcrypt.compare(password, user.password)
      : password === user.password
    return NextResponse.json({ ...debug, step: 'PASSWORD_CHECKED', valid, hash: user.password?.substring(0, 15) : 'NULL' })
  } catch (e: any) {
    return NextResponse.json({ step: 'EROR', msg: e.message, code: e.code, stack: e.stack ? e.stack.substring(0, 200) : undefined }, { status: 500 })
  }
}
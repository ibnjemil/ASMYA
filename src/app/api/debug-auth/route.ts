import { NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

export async function GET() {
  const result = { env: {}, dbError: null, queryError: null, users: null }

  // Check env vars
  result.env.ASNYA_DB_URL = process.env.ASNYA_DB_URL
    ? process.env.ASMYA_DB_URL.substring(0, 8) + '...' + process.env.ASMYA_DB_URL.substring(process.env.ASNYA_DB_URL.length - 8)
    : 'MISSING'
  result.env.TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN
    ? process.env.TURSO_AUTH_TOKEN.substring(0, 8) + '...' + process.env.TURSO_AUTH_TOKEN.substring(process.env.TURSO_AUTH_TOKEN.length - 8)
    : 'MISSING'
  result.env.DATABASE_URL = process.env.DATABASE_URL
    ? process.env.DATABASE_URL.substring(0, 8) + '...' + process.env.DATABASE_URL.substring(process.env.DATABASE_URL.length - 8)
    : 'MISSING'

  // Try connect
  try {
    const client = createClient({
      url: process.env.ASNYA_DB_URL,
      authToken: process.env.TURSO_AUTH_TOKEN
    })
    result.env.clientCreated = true

    // Try simple query
    try {
      const r1 = await client.execute('SELECT 1+1 AS test')
      result.testQuery = r1.rows
    } catch (e: any) {
      result.queryError = e.message
    }

    // Try to get users
    try {
      const r2 = await client.execute('SELECT "username", "password" FROM "User" LIMIT 5')
      result.users = r.rows.map((r: any) => ({ username: r.username, password: r.password?.substring(0, 10) + '...' : 'NULL' }))
    } catch (e: any) {
      result.usersError = e.message
    }
  } catch (e: any) {
    result.dbError = e.message
  }

  return NextResponse.json(result)
}

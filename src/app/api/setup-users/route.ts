import { NextResponse } from 'next/server'
import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'

const client = createClient({
  url: process.env.ASMYA_DB_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

const DEMO_USERS = [
  { username: 'ustaz_jihad_m', password: '12345678', role: 'SUPERIOR_AMIR', displayName: 'Superior Amir', side: 'men' },
  { username: 'ustaz_jihad', password: '12345678', role: 'TEACHER', displayName: 'Ustaz Jihad', side: 'men' },
  { username: 'student_ahmed', password: '12345678', role: 'STUDENT', displayName: 'Ahmed', side: 'men' },
  { username: 'parent_mohamed', password: '12345678', role: 'PARENT', displayName: 'Mohamed', side: 'men' },
]

export async function GET() {
  const results: string[] = []
  for (const u of DEMO_USERS) {
    const hash = await bcrypt.hash(u.password, 10)
    try {
      const existing = await client.execute({ sql: `SELECT id FROM "User" WHERE "username" = ?`, args: [u.username] })
      if (existing.rows.length > 0) {
        await client.execute({ sql: `UPDATE "User" SET "password" = ? WHERE "username" = ?`, args: [hash, u.username] })
        results.push(`Updated password for ${u.username}`)
      } else {
        const id = crypto.randomUUID()
        await client.execute({ sql: `INSERT INTO "User" ("id","username","password","role","displayName","side","createdAt","updatedAt") VALUES (?,?,?,?,?,?,?,?)`, args: [id, u.username, hash, u.role, u.displayName, u.side, new Date().toISOString(), new Date().toISOString()] })
        results.push(`Created user ${u.username}`)
      }
    } catch (e: any) {
      results.push(`Error for ${u.username}: ${e.message}`)
    }
  }
  return NextResponse.json({ results })
}
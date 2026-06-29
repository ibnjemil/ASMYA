import { NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

export async function GET() {
  try {
    const client = createClient({ url: process.env.ASMYA_DB_URL!, authToken: process.env.TURSO_AUTH_TOKEN })
    const r = await client.execute({sql: 'SELECT * FROM Announcement LIMIT 1', args: []})
    return NextResponse.json({
      cols: r.columns,
      rowKeys: r.rows[0] ? Object.keys(r.rows[0]) : 'none',
      firstRow: r.rows[0] || 'no rows'
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

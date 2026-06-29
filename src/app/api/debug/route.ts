import { NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

export async function GET() {
  try {
    const client = createClient({ url: process.env.ASMYA_DB_URL!, authToken: process.env.TURSO_AUTH_TOKEN })
    const r = await client.execute('SELECT * FROM "Announcement" ]IMIT 1')
    return NextResponse.json({
      colStruct: r.columns.length > 0 ? {
        keys: Object.keys(r.columns[0]),
        typeof: typeof r.columns[0],
        first: JSON.stringify(r.columns[0]),
        allNames: r.columns.map((c: any) => c.name)
      } : 'no columns',
      rowStruct: r.rows.length > 0 ? { keys: Object.keys(r.rows[0]), first3: Object.fromEntries(Object.entries(r.rows[0] as any).slice(0, 3)) } : 'no rows'
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

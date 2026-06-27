import { createClient } from '@libsql/client'
export const runtime = 'nodejs'
export async function GET() {
  try {
    const url = process.env.ASMYA_DB_URL
    const token = process.env.TURSO_AUTH_TOKEN
    const client = createClient({ url: url!, authToken: token || '' })
    const r = await client.execute('SELECT 1 as ok')
    return Response.json({ libsql: 'works', hasUrl: !!url, hasToken: !!token, rows: r.rows })
  } catch (e: any) {
    return Response.json({ libsql: 'failed', error: e.message }, { status: 500 })
  }
}

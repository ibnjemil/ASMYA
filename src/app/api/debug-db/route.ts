import { createClient } from '@libsql/client'
import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
export const runtime = 'nodejs'

async function test(label: string, opts: any) {
  try {
    const prisma = new PrismaClient(opts)
    const count = await prisma.user.count()
    return { label, ok: true, count }
  } catch (e: any) {
    return { label, ok: false, err: e.message?.substring(0, 120) }
  }
}

export async function GET() {
  const url = process.env.DATABASE_URL!
  const libsql = createClient({ url })
  const adapter = new PrismaLibSQL(libsql)

  const r1 = await test('a: adapter only', { adapter })
  const r2 = await test('b: adapter + datasources', { adapter, datasources: { db: { url: 'file:./dev.db' } } })
  const r3 = await test('c: adapter + datasourceUrl', { adapter, datasourceUrl: 'file:./dev.db' })
  const r4 = await test('d: datasourceUrl only (libsql)', { datasourceUrl: url })
  const r5 = await test('e: no opts', {})

  // Also test raw libsql
  let r6: any
  try {
    const result = await libsql.execute('SELECT count(*) as c FROM users')
    r6 = { label: 'f: raw libsql', ok: true, count: result.rows[0].c }
  } catch (e: any) {
    r6 = { label: 'f: raw libsql', ok: false, err: e.message?.substring(0, 120) }
  }

  return Response.json([r1, r2, r3, r4, r5, r6])
}

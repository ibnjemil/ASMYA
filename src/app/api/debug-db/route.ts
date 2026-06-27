import { createClient } from '@libsql/client'
export const runtime = 'nodejs'
export async function GET() {
  const s: string[] = []
  try {
    s.push('1. start')
    const url = process.env.DATABASE_URL
    s.push('2. url=' + (url ? url.substring(0,30) : 'MISSING'))
    s.push('3. creating libsql...')
    const libsql = createClient({ url: url! })
    s.push('4. libsql ok')
    const { PrismaLibSQL: P } = await import('@prisma/adapter-libsql')
    s.push('5. PrismaLibSQL type=' + typeof P)
    const adapter = new P(libsql)
    s.push('6. adapter ok')
    const { PrismaClient } = await import('@prisma/client')
    s.push('7. PrismaClient imported')
    const prisma = new PrismaClient({ adapter })
    s.push('8. prisma created with adapter')
    const count = await prisma.user.count()
    s.push('9. count=' + count)
    return Response.json({ ok: true, s })
  } catch (e: any) {
    s.push('ERR: ' + e.message)
    return Response.json({ ok: false, s }, { status: 500 })
  }
}

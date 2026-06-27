export const runtime = 'nodejs'
export async function GET() {
  try {
    const am = await import('@prisma/adapter-libsql')
    const lm = await import('@libsql/client')
    return Response.json({
      adapterKeys: Object.keys(am),
      hasPrismaLibSQL: 'PrismaLibSQL' in am,
      hasDefault: 'default' in am,
      defaultType: typeof am.default,
      libsqlKeys: Object.keys(lm),
      env: {
        hasAsmyaDbUrl: !!process.env.ASMYA_DB_URL,
        hasTursoToken: !!process.env.TURSO_AUTH_TOKEN,
        databaseUrl: process.env.DATABASE_URL || 'not set',
      }
    })
  } catch (e: any) {
    return Response.json({ error: e.message, stack: e.stack?.split('\n').slice(0,5) }, { status: 500 })
  }
}

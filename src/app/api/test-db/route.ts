import { PrismaClient } from "@prisma/client"
import { createClient } from "@libsql/client"
export const runtime = "nodejs"
export async function GET() {
  const url = process.env.ASMYA_DB_URL || "NOT_SET"
  const tok = process.env.TURSO_AUTH_TOKEN ? "SET" : "NOT_SET"
  let prismaErr = null, rawErr = null, count = null, tables = null
  try {
    const p = new PrismaClient()
    count = await p.user.count()
    await p.$disconnect()
  } catch(e:any) { prismaErr = e.message?.substring(0,400) }
  try {
    const lib = createClient({url, authToken: process.env.TURSO_AUTH_TOKEN})
    tables = await lib.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  } catch(e:any) { rawErr = e.message?.substring(0,400) }
  return Response.json({url: url.substring(0,60), tok, count, prismaErr, tables: tables?.rows?.map((r:any)=>r.name), rawErr})
}

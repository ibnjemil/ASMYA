import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const tursoUrl = process.env.TURSO_URL
    const tursoToken = process.env.TURSO_AUTH_TOKEN
    if (!tursoUrl || !tursoToken) {
      return NextResponse.json({ error: "Missing env", tursoUrl: tursoUrl ? "set" : "missing", tursoToken: tursoToken ? "set" : "missing" })
    }
    const { createClient } = require("@libsql/client")
    const { PrismaLibSQL } = require("@prisma/adapter-libsql")
    const { PrismaClient } = require("@prisma/client")
    const libsql = createClient({ url: tursoUrl, authToken: tursoToken })
    const adapter = new PrismaLibSQL(libsql)
    const prisma = new PrismaClient({ adapter })
    const user = await prisma.user.findUnique({ where: { username: "admin" } })
    return NextResponse.json({ ok: true, user: user ? { username: user.username, role: user.role, passLen: user.password.length, passStart: user.password.substring(0, 3) } : "NOT FOUND" })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
export async function GET() {
  try {
    const mod = require("@prisma/adapter-libsql")
    return NextResponse.json({ ok: true, keys: Object.keys(mod) })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

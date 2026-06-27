import { NextResponse } from "next/server"
export async function GET() {
  return NextResponse.json({ ASMYA_DB_URL: process.env.ASMYA_DB_URL ? process.env.ASMYA_DB_URL.substring(0, 50) + "..." : "UNDEFINED", DATABASE_URL: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 50) + "..." : "UNDEFINED" })
}

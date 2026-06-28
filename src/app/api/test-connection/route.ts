import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const cols = await db.execute("PRAGMA table_info(User)");
    const users = await db.execute("SELECT * FROM User LIMIT 2");
    return NextResponse.json({ columns: cols.rows, users: users.rows });
  } catch(e: any) { return NextResponse.json({ ok: false, error: e.message }, { status: 500 }); }
}

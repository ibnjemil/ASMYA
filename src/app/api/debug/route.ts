import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
export async function GET() {
  try {
    const u = await db.user.findFirst();
    return NextResponse.json({ok:true,user:u});
  } catch(e) {
    return NextResponse.json({
      ok:false,
      error: e.message?.substring(0,200),
      DATABASE_URL: process.env.DATABASE_URL || 'MISSING',
      ASMYA_DB_URL: process.env.ASMYA_DB_URL || 'MISSING',
      TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ? 'SET' : 'MISSING',
      node_env: process.env.NODE_ENV,
    },{status:500});
  }
}
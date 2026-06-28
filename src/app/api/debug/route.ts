import { db } from "@/lib/db";
import { NextResponse } from "next/server";
export async function GET() { try { const u = await db.user.findFirst(); return NextResponse.json({ok:true, user:u}); } catch(e:any) { return NextResponse.json({ok:false, error:e.message, code:e.code, stack:e.stack?.split(String.fromCharCode(10)).slice(0,8), envUrl: process.env.ASMYA_DB_URL?.substring(0,30), hasToken: !!process.env.TURSO_AUTH_TOKEN, dbUrl: process.env.DATABASE_URL?.substring(0,30)}, {status:500}); } }

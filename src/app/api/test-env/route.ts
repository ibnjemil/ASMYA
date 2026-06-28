import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({url: process.env.ASMYA_DB_URL || "MISSING", hasToken: !!process.env.TURSO_AUTH_TOKEN}); }

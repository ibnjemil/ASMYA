import { db } from "@/lib/db";
import { NextResponse } from "next/server";
export async function GET() { try { const u = await db.user.findFirst(); return NextResponse.json({ok:true, user:u}); } catch(e:any) { return NextResponse.json({ok:false, error:e.message}, {status:500}); } }

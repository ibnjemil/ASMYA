import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const u = await db.user.findFirst();
    return NextResponse.json({ok:true,user:u});
  } catch(e) {
    return NextResponse.json({ok:false,error:e.message,url:process.env.ASMYA_DB_URL},{status:500});
  }
}

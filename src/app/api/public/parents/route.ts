import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'


export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get('x-public-role')
    if (role !== 'TEACHER') return NextResponse.json({ error: 'Teacher only' }, { status: 403 })

    const parents = await db.parentProfile.findMany({
      include: {
        user: { select: { id: true, displayName: true, username: true } },
        children: { include: { user: { select: { id: true, displayName: true, username: true } } } },
      },
      orderBy: { user: { displayName: 'asc' } },
    })
    return NextResponse.json(parents)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
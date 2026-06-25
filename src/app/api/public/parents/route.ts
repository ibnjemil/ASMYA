import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get('x-public-role')
    if (role !== 'TEACHER') return NextResponse.json({ error: 'Teacher only' }, { status: 403 })

    const parents = await prisma.parentProfile.findMany({
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
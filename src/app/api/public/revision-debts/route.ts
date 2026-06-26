import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'


export async function GET(req: NextRequest) {
  try {
    const { role, userId } = { role: req.headers.get('x-public-role'), userId: req.headers.get('x-public-user-id') }
    const studentId = req.nextUrl.searchParams.get('studentId')

    let where: any = { status: 'PENDING' }

    if (role === 'STUDENT') {
      where.studentId = userId
    } else if (role === 'PARENT') {
      const children = await db.studentProfile.findMany({ where: { parentId: userId }, select: { userId: true } })
      where.studentId = { in: children.map(c => c.userId) }
    } else if (role === 'TEACHER' && studentId) {
      where.studentId = studentId
    }

    const debts = await db.revisionDebt.findMany({
      where, include: { student: { select: { displayName: true } } },
      orderBy: { date: 'desc' },
    })
    return NextResponse.json(debts)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get('x-public-role')
    if (role !== 'TEACHER') return NextResponse.json({ error: 'Teacher only' }, { status: 403 })

    const { debtId, status } = await req.json()
    const debt = await db.revisionDebt.update({
      where: { id: debtId },
      data: { status, resolvedAt: status !== 'PENDING' ? new Date() : null },
    })
    return NextResponse.json(debt)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
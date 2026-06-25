import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get('x-public-role')
    if (role !== 'TEACHER') return NextResponse.json({ error: 'Teacher only' }, { status: 403 })

    const today = new Date(); today.setHours(0,0,0,0); const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1)

    const students = await prisma.studentProfile.findMany({
      include: {
        user: { select: { id: true, displayName: true, username: true } },
        parent: { select: { id: true, displayName: true } },
      },
      orderBy: { user: { displayName: 'asc' } },
    })

    const enriched = await Promise.all(students.map(async (s) => {
      const attendance = await prisma.attendanceRecord.findFirst({
        where: { studentId: s.userId, date: { gte: today, lt: tomorrow } }
      })
      const testCount = await prisma.testResult.count({ where: { studentId: s.userId } })
      const debtCount = await prisma.revisionDebt.count({ where: { studentId: s.userId, status: 'PENDING' } })
      const avgScore = await prisma.testResult.aggregate({
        where: { studentId: s.userId },
        _avg: { score: true }
      })
      return { ...s, todayAttendance: attendance?.status ?? null, testCount, debtCount, avgScore: avgScore._avg.score ? Math.round(avgScore._avg.score * 10) / 10 : null }
    }))

    return NextResponse.json(enriched)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get('x-public-role')
    if (role !== 'TEACHER') return NextResponse.json({ error: 'Teacher only' }, { status: 403 })

    const { displayName, grade, parentId } = await req.json()
    const hash = await bcrypt.hash('12345678', 10)
    const username = 'student_' + displayName.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now().toString(36)

    const user = await prisma.user.create({
      data: { username, password: hash, displayName, role: 'STUDENT', side: 'MEN' }
    })
    const profile = await prisma.studentProfile.create({
      data: { userId: user.id, grade: grade || null, parentId: parentId || null }
    })

    return NextResponse.json({ user: { id: user.id, username, displayName }, profile }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
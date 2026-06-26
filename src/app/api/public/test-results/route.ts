import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'


export async function GET(req: NextRequest) {
  try {
    const { role, userId } = { role: req.headers.get('x-public-role'), userId: req.headers.get('x-public-user-id') }
    const studentId = req.nextUrl.searchParams.get('studentId')
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })

    if (role === 'PARENT') {
      const child = await db.studentProfile.findFirst({ where: { parentId: userId, userId: studentId } })
      if (!child) return NextResponse.json({ error: 'Not your child' }, { status: 403 })
    }

    const results = await db.testResult.findMany({
      where: { studentId },
      include: { User_TestResult_teacherIdToUser: { select: { displayName: true } } },
      orderBy: { createdAt: 'desc' },
    })
    // Map teacher relation for frontend
    const mapped = results.map((r: any) => ({
      ...r,
      teacher: r.User_TestResult_teacherIdToUser ? { displayName: r.User_TestResult_teacherIdToUser.displayName } : null,
      User_TestResult_teacherIdToUser: undefined,
    }))
    return NextResponse.json(mapped)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get('x-public-role')
    const userId = req.headers.get('x-public-user-id')
    if (role !== 'TEACHER') return NextResponse.json({ error: 'Teacher only' }, { status: 403 })

    const { studentId, title, score, maxScore, imageUrl, notes } = await req.json()
    const result = await db.testResult.create({
      data: { studentId, teacherId: userId!, title, score: parseFloat(score), maxScore: parseFloat(maxScore), imageUrl, notes },
      include: { User_TestResult_teacherIdToUser: { select: { displayName: true } } },
    })
    const mapped = {
      ...result,
      teacher: (result as any).User_TestResult_teacherIdToUser ? { displayName: (result as any).User_TestResult_teacherIdToUser.displayName } : null,
      User_TestResult_teacherIdToUser: undefined,
    }
    return NextResponse.json(mapped, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const role = req.headers.get('x-public-role')
    if (role !== 'TEACHER') return NextResponse.json({ error: 'Teacher only' }, { status: 403 })
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await db.testResult.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const role = req.headers.get('x-public-role')
    if (role !== 'TEACHER') return NextResponse.json({ error: 'Teacher only' }, { status: 403 })

    const students = await db.studentProfile.findMany({
      include: { user: { select: { id: true, displayName: true } } },
    })

    const leaderboard = await Promise.all(students.map(async (s) => {
      const [testResults, attendance, debts, revising, reading] = await Promise.all([
        db.testResult.findMany({ where: { studentId: s.userId } }),
        db.attendanceRecord.findMany({ where: { studentId: s.userId } }),
        db.revisionDebt.findMany({ where: { studentId: s.userId, status: 'PENDING' } }),
        db.dailyActivityRecord.findMany({ where: { studentId: s.userId, type: 'REVISING', completed: true } }),
        db.dailyActivityRecord.findMany({ where: { studentId: s.userId, type: 'READING', completed: true } }),
      ])

      const totalTests = testResults.length
      const avgScore = totalTests > 0 ? Math.round(testResults.reduce((sum: number, r: any) => sum + (r.maxScore > 0 ? (r.score / r.maxScore) * 100 : 0), 0) / totalTests) : 0
      const totalPresent = attendance.filter((a: any) => a.status === 'PRESENT' || a.status === 'LATE').length
      const attendanceRate = attendance.length > 0 ? Math.round((totalPresent / attendance.length) * 100) : 0
      const bookRate = attendance.length > 0 ? Math.round((attendance.filter((a: any) => a.hasBook).length / attendance.length) * 100) : 0
      const pendingDebts = debts.length
      const totalRevised = revising.length
      const totalRead = reading.length

      return {
        userId: s.userId, displayName: s.user.displayName,
        totalTests, avgScore, totalPresent, attendanceRate, bookRate,
        pendingDebts, totalRevised, totalRead,
        compositeScore: avgScore * 0.3 + attendanceRate * 0.3 + Math.min(totalRevised * 5, 20) + Math.min(totalRead * 5, 20) - pendingDebts * 10,
      }
    }))

    return NextResponse.json(leaderboard)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
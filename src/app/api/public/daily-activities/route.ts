import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'


function todayStr() { return new Date().toISOString().split('T')[0] }

export async function GET(req: NextRequest) {
  try {
    const { role, userId } = { role: req.headers.get('x-public-role'), userId: req.headers.get('x-public-user-id') }
    const date = req.nextUrl.searchParams.get('date') || todayStr()
    const start = new Date(date); start.setHours(0,0,0,0)
    const end = new Date(start); end.setDate(end.getDate()+1)

    if (role === 'TEACHER') {
      const students = await db.studentProfile.findMany({
        include: { user: { select: { id: true, displayName: true } } },
        orderBy: { user: { displayName: 'asc' } },
      })
      const records = await db.dailyActivityRecord.findMany({
        where: { date: { gte: start, lt: end } },
      })
      const attendance = await db.attendanceRecord.findMany({
        where: { date: { gte: start, lt: end } },
      })

      const result = students.map(s => {
        const revising = records.find(r => r.studentId === s.userId && r.type === 'REVISING')
        const reading = records.find(r => r.studentId === s.userId && r.type === 'READING')
        const att = attendance.find(a => a.studentId === s.userId)
        return {
          studentId: s.userId, displayName: s.user.displayName, grade: s.grade,
          attendance: att?.status ?? 'NOT_MARKED',
          revising: revising ? revising.completed : false,
          reading: reading ? reading.completed : false,
          readingSkipped: att?.status === 'ABSENT',
        }
      })
      return NextResponse.json(result)
    }

    if (role === 'STUDENT') {
      const records = await db.dailyActivityRecord.findMany({
        where: { studentId: userId, date: { gte: start, lt: end } },
      })
      return NextResponse.json(records.map(r => ({ type: r.type, completed: r.completed, notes: r.notes })))
    }

    if (role === 'PARENT') {
      const children = await db.studentProfile.findMany({ where: { parentId: userId }, select: { userId: true } })
      const ids = children.map(c => c.userId)
      const students = await db.studentProfile.findMany({
        where: { userId: { in: ids } },
        include: { user: { select: { id: true, displayName: true } } },
      })
      const records = await db.dailyActivityRecord.findMany({ where: { studentId: { in: ids }, date: { gte: start, lt: end } } })
      const result = students.map(s => {
        const revising = records.find(r => r.studentId === s.userId && r.type === 'REVISING')
        const reading = records.find(r => r.studentId === s.userId && r.type === 'READING')
        return { studentId: s.userId, displayName: s.user.displayName, revising: revising?.completed ?? false, reading: reading?.completed ?? false }
      })
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Unknown role' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { role, userId } = { role: req.headers.get('x-public-role'), userId: req.headers.get('x-public-user-id') }
    if (role !== 'TEACHER' && role !== 'STUDENT') return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

    const { studentId, type, completed, date } = await req.json()
    const recordDate = date ? new Date(date) : new Date()
    recordDate.setHours(12, 0, 0, 0)
    const sid = role === 'STUDENT' ? userId! : studentId

    const record = await db.dailyActivityRecord.upsert({
      where: { studentId_date_type: { studentId: sid!, date: recordDate, type } },
      create: { studentId: sid!, date: recordDate, type, completed: !!completed },
      update: { completed: !!completed },
    })

    return NextResponse.json(record)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
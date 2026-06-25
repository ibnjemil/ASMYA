import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function todayRange() {
  const today = new Date(); today.setHours(0,0,0,0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1)
  return { gte: today, lt: tomorrow }
}

export async function GET(req: NextRequest) {
  try {
    const { role, userId } = { role: req.headers.get('x-public-role'), userId: req.headers.get('x-public-user-id') }
    const studentId = req.nextUrl.searchParams.get('studentId')

    if (role === 'TEACHER') {
      if (studentId) {
        const records = await prisma.attendanceRecord.findMany({
          where: { studentId }, orderBy: { date: 'desc' }, take: 30,
          include: { student: { select: { displayName: true } } }
        })
        return NextResponse.json(records)
      }
      const records = await prisma.attendanceRecord.findMany({
        where: { date: todayRange() },
        include: { student: { select: { displayName: true, id: true } } },
        orderBy: { student: { displayName: 'asc' } },
      })
      return NextResponse.json(records)
    }

    if (role === 'PARENT') {
      const children = await prisma.studentProfile.findMany({ where: { parentId: userId }, select: { userId: true } })
      const ids = children.map(c => c.userId)
      const records = await prisma.attendanceRecord.findMany({
        where: { studentId: { in: ids } }, orderBy: { date: 'desc' }, take: 50,
        include: { student: { select: { displayName: true } } }
      })
      return NextResponse.json(records)
    }

    if (role === 'STUDENT') {
      const records = await prisma.attendanceRecord.findMany({
        where: { studentId: userId }, orderBy: { date: 'desc' }, take: 30,
      })
      return NextResponse.json(records)
    }

    return NextResponse.json({ error: 'Unknown role' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get('x-public-role')
    const userId = req.headers.get('x-public-user-id')
    if (role !== 'TEACHER') return NextResponse.json({ error: 'Teacher only' }, { status: 403 })

    const { studentId, status, date, notes } = await req.json()
    const recordDate = date ? new Date(date) : new Date()
    recordDate.setHours(12, 0, 0, 0)

    const record = await prisma.attendanceRecord.upsert({
      where: { studentId_date: { studentId, date: recordDate } },
      create: { studentId, date: recordDate, status, notes },
      update: { status, notes },
    })

    // If absent, create revision debt for today
    if (status === 'ABSENT') {
      await prisma.revisionDebt.create({
        data: {
          studentId,
          date: recordDate,
          reason: `Absent on ${recordDate.toISOString().split('T')[0]}`,
          status: 'PENDING',
        },
      })
    }

    return NextResponse.json(record)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
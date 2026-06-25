import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function getHeaders(req: NextRequest) {
  return {
    role: req.headers.get('x-public-role') as string,
    userId: req.headers.get('x-public-user-id') as string,
  }
}

export async function GET(req: NextRequest) {
  try {
    const { role, userId } = getHeaders(req)
    if (!role || !userId) return NextResponse.json({ error: 'Missing auth headers' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true, side: true } })

    if (role === 'TEACHER') {
      let profile = await prisma.teacherProfile.findUnique({ where: { userId } })
      if (!profile && user) {
        try { profile = await prisma.teacherProfile.create({ data: { userId } }) } catch { /* already exists or FK */ }
      }
      const studentCount = await prisma.studentProfile.count()
      const today = new Date(); today.setHours(0,0,0,0)
      const presentToday = await prisma.attendanceRecord.count({
        where: { date: { gte: today }, status: 'PRESENT' }
      })
      return NextResponse.json({ role, profile, studentCount, presentToday, displayName: user?.displayName })
    }

    if (role === 'STUDENT') {
      let profile = await prisma.studentProfile.findUnique({
        where: { userId }, include: { parent: { select: { id: true, displayName: true } } }
      })
      if (!profile && user) {
        try {
          await prisma.studentProfile.create({ data: { userId } })
          profile = await prisma.studentProfile.findUnique({
            where: { userId }, include: { parent: { select: { id: true, displayName: true } } }
          })
        } catch { /* already exists or FK */ }
      }
      const debtCount = await prisma.revisionDebt.count({ where: { studentId: userId, status: 'PENDING' } })
      const testCount = await prisma.testResult.count({ where: { studentId: userId } })
      return NextResponse.json({ role, profile, debtCount, testCount, displayName: user?.displayName })
    }

    if (role === 'PARENT') {
      let profile = await prisma.parentProfile.findUnique({
        where: { userId },
        include: { user: { select: { displayName: true } } }
      })
      if (!profile && user) {
        try {
          await prisma.parentProfile.create({ data: { userId } })
          profile = await prisma.parentProfile.findUnique({
            where: { userId },
            include: { user: { select: { displayName: true } } }
          })
        } catch { /* already exists or FK */ }
      }
      const children = await prisma.studentProfile.findMany({
        where: { parentId: userId },
        include: { user: { select: { id: true, displayName: true, username: true } } }
      })
      return NextResponse.json({ role, profile, children, displayName: (profile as any)?.user?.displayName || user?.displayName })
    }

    return NextResponse.json({ error: 'Unknown role' }, { status: 400 })
  } catch (e: any) {
    console.error('GET /api/public error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
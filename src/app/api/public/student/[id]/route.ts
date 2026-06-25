import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const student = await prisma.user.findUnique({
      where: { id },
      include: {
        StudentProfile: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const testResults = await prisma.testResult.findMany({
      where: { studentId: id },
      include: {
        User_TestResult_teacherIdToUser: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: { studentId: id, date: { gte: thirtyDaysAgo } },
      orderBy: { date: 'desc' },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dailyActivities = await prisma.dailyActivityRecord.findMany({
      where: { studentId: id, date: { gte: today, lt: tomorrow } },
      orderBy: { type: 'asc' },
    });

    const revisionDebts = await prisma.revisionDebt.findMany({
      where: { studentId: id, status: 'PENDING' },
      orderBy: { date: 'desc' },
    });

    let avgScore: number | null = null;
    if (testResults.length > 0) {
      const totalPercentage = testResults.reduce((sum, tr) => {
        return sum + (tr.maxScore > 0 ? (tr.score / tr.maxScore) * 100 : 0);
      }, 0);
      avgScore = Math.round((totalPercentage / testResults.length) * 100) / 100;
    }

    let attendanceRate: number | null = null;
    if (attendanceRecords.length > 0) {
      const presentCount = attendanceRecords.filter(
        (r) => r.status === 'PRESENT' || r.status === 'LATE'
      ).length;
      attendanceRate = Math.round((presentCount / attendanceRecords.length) * 10000) / 100;
    }

    // Map testResults to include teacher displayName
    const mappedResults = testResults.map((r: any) => ({
      ...r,
      teacher: r.User_TestResult_teacherIdToUser ? { displayName: r.User_TestResult_teacherIdToUser.displayName } : null,
      User_TestResult_teacherIdToUser: undefined,
    }))

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        username: student.username,
        displayName: student.displayName,
        avatarUrl: student.avatarUrl,
        side: student.side,
        role: student.role,
        studentProfile: (student as any).StudentProfile,
      },
      testResults: mappedResults,
      attendanceRecords,
      dailyActivities,
      revisionDebts,
      stats: {
        avgScore,
        attendanceRate,
        totalTests: testResults.length,
        totalAttendanceDays: attendanceRecords.length,
        pendingDebts: revisionDebts.length,
      },
    });
  } catch (error: any) {
    console.error('Get student detail error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch student details' }, { status: 500 });
  }
}
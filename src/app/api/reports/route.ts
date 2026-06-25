import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Side } from '@prisma/client'

export const runtime = 'nodejs'

// GET /api/reports
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const side = searchParams.get('side') as Side | null
    const planId = searchParams.get('planId') || null

    const where: Record<string, unknown> = {}
    if (side) where.side = side
    if (planId) where.planId = planId

    const reports = await db.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        plan: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    return NextResponse.json(reports)
  } catch (error) {
    console.error('GET /api/reports error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 },
    )
  }
}

// POST /api/reports
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, content, planId, createdBy, side } = body

    const report = await db.report.create({
      data: {
        title,
        content,
        planId: planId || null,
        createdBy,
        side: side as Side,
      },
      include: {
        creator: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        plan: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    console.error('POST /api/reports error:', error)
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 },
    )
  }
}

// PUT /api/reports
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { reportId, title, content } = body

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title
    if (content !== undefined) data.content = content

    const updated = await db.report.update({
      where: { id: reportId },
      data,
      include: {
        creator: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        plan: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PUT /api/reports error:', error)
    return NextResponse.json(
      { error: 'Failed to update report' },
      { status: 500 },
    )
  }
}

// DELETE /api/reports
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('reportId')

    if (!reportId) {
      return NextResponse.json(
        { error: 'reportId is required' },
        { status: 400 },
      )
    }

    await db.report.delete({
      where: { id: reportId },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('DELETE /api/reports error:', error)
    return NextResponse.json(
      { error: 'Failed to delete report' },
      { status: 500 },
    )
  }
}
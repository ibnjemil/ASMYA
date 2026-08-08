import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendPushToUser } from '@/lib/push'
import { Side } from '@/lib/enums'

let _rm = false
async function ensureReportMedia() {
  if (_rm) return; _rm = true
  try {
    var libsql = await import('@libsql/client')
    var cl = libsql.createClient({ url: process.env.ASMYA_DB_URL, authToken: process.env.TURSO_AUTH_TOKEN })
    var info = await cl.execute('PRAGMA table_info("Report")')
    var cols = new Set(info.rows.map(function(r) { return r.name }))
    if (!cols.has('mediaUrl')) await cl.execute('ALTER TABLE "Report" ADD COLUMN "mediaUrl" TEXT')
  } catch (e) { console.error('Report migrate:', e) }
}

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
    const { title, content, planId, createdBy, side, mediaUrl } = body

    const report = await db.report.create({
      data: {
        title,
        content,
        planId: planId || null,
        createdBy,
        side: side as Side,
        mediaUrl: mediaUrl || null,
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

    // Notify plan creator about new report
    if (report.planId) {
      const { db: d } = await import("@/lib/db")
      const plan = await d.plan.findUnique({ where: { id: report.planId }, include: { assignments: true } })
      if (plan) {
        const notifyIds = [plan.createdBy, ...plan.assignments.map((a: any) => a.userId)]
        Promise.all(notifyIds.map((uid: string) => sendPushToUser(uid, 'New Report: ' + title, content?.substring(0, 80) || title, { planId: report.planId }))).catch(() => {})
      }
    }
    if (mediaUrl) {
      try {
        var lib = await import('@libsql/client')
        var cr = lib.createClient
        if (!cr) { var mod = lib; cr = mod.createClient || mod.default }
        var cl = cr({ url: process.env.ASMYA_DB_URL, authToken: process.env.TURSO_AUTH_TOKEN })
        await cl.execute({ sql: 'UPDATE "Report" SET "mediaUrl" = ? WHERE id = ?', args: [mediaUrl, report.id] })
      } catch (e) { console.error('Report mediaUrl:', e) }
    }
    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    console.error('POST /api/reports error:', error, error instanceof Error ? error.stack : '')
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
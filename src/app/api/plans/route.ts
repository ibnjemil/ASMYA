import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Side, PlanStatus } from '@/lib/enums'

export const runtime = 'nodejs'

// GET /api/plans
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const side = searchParams.get('side') as Side | null

    const where: Record<string, unknown> = {}
    if (side) where.side = side

    const plans = await db.plan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        reports: {
          select: { id: true },
        },
        creator: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    })

    const now = new Date()

    const enriched = plans.map((plan) => {
      const dueDate = new Date(plan.dueDate)
      const daysLeft = Math.ceil(
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      )
      const isUrgent =
        daysLeft <= 3 && daysLeft >= 0 && plan.status !== PlanStatus.COMPLETED

      return {
        ...plan,
        reportsCount: plan.reports.length,
        daysLeft,
        isUrgent,
        // Remove raw reports array, keep count only
        reports: undefined,
      }
    })

    return NextResponse.json(enriched)
  } catch (error) {
    console.error('GET /api/plans error:', error)
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 })
  }
}

// POST /api/plans
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, dueDate, createdBy, side, assignmentIds } =
      body as {
        title: string
        description: string
        dueDate: string
        createdBy: string
        side: Side
        assignmentIds?: string[]
      }

    const dueDateObj = new Date(dueDate)
    // Auto-set reminderAt to dueDate - 1 day
    const reminderAt = new Date(dueDateObj.getTime() - 24 * 60 * 60 * 1000)

    const plan = await db.plan.create({
      data: {
        title,
        description,
        dueDate: dueDateObj,
        reminderAt,
        createdBy,
        side,
        assignments: assignmentIds
          ? {
              create: assignmentIds.map((userId: string) => ({ userId })),
            }
          : undefined,
      },
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    })

    return NextResponse.json(plan, { status: 201 })
  } catch (error) {
    console.error('POST /api/plans error:', error)
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 })
  }
}

// PUT /api/plans
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { planId, status, title, description, dueDate, assignmentIds } =
      body as {
        planId: string
        status?: PlanStatus
        title?: string
        description?: string
        dueDate?: string
        assignmentIds?: string[]
      }

    const data: Record<string, unknown> = {}
    if (status !== undefined) data.status = status
    if (title !== undefined) data.title = title
    if (description !== undefined) data.description = description
    if (dueDate !== undefined) {
      const dueDateObj = new Date(dueDate)
      data.dueDate = dueDateObj
      // Update reminderAt accordingly
      data.reminderAt = new Date(dueDateObj.getTime() - 24 * 60 * 60 * 1000)
    }

    // If assignmentIds provided, delete old and create new
    // Auto-convert completed plans to reports
    if (status === PlanStatus.COMPLETED) {
      const ep = await db.plan.findUnique({ where: { id: planId } })
      if (ep) {
        await db.report.create({ data: { title: ep.title, content: ep.description || "Plan completed successfully", createdBy: ep.createdBy, side: ep.side } })
        await db.plan.delete({ where: { id: planId } })
        return NextResponse.json({ converted: true })
      }
    }

        if (assignmentIds !== undefined) {
      await db.planAssignment.deleteMany({ where: { planId } })

      const updated = await db.plan.update({
        where: { id: planId },
        data: {
          ...data,
          assignments: {
            create: assignmentIds.map((userId: string) => ({ userId })),
          },
        },
        include: {
          assignments: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
          creator: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      })

      return NextResponse.json(updated)
    }

    const updated = await db.plan.update({
      where: { id: planId },
      data,
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PUT /api/plans error:', error)
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 })
  }
}

// DELETE /api/plans
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const planId = searchParams.get('planId')

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 })
    }

    await db.plan.delete({
      where: { id: planId },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('DELETE /api/plans error:', error)
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 })
  }
}
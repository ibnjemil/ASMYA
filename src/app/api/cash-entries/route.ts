import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CashFlowType, Side } from '@/lib/enums'

export const runtime = 'nodejs'

// GET: ?side=X - Get all cash entries for side with totals
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const side = searchParams.get('side') as Side | null

    if (!side || !['MEN', 'WOMEN'].includes(side)) {
      return NextResponse.json({ error: 'Valid side parameter (MEN/WOMEN) is required' }, { status: 400 })
    }

    const entries = await db.cashEntry.findMany({
      where: { side },
      orderBy: { date: 'desc' },
      include: {
        creator: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    })

    const totalIn = entries
      .filter((e) => e.type === CashFlowType.CASH_IN)
      .reduce((sum, e) => sum + e.amount, 0)

    const totalOut = entries
      .filter((e) => e.type === CashFlowType.CASH_OUT)
      .reduce((sum, e) => sum + e.amount, 0)

    const balance = totalIn - totalOut

    return NextResponse.json({ entries, totalIn, totalOut, balance })
  } catch (error) {
    console.error('GET cash-entries error:', error)
    return NextResponse.json({ error: 'Failed to fetch cash entries' }, { status: 500 })
  }
}

// POST: Create a new cash entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, amount, category, description, accountType, createdBy, side, date } = body

    if (!type || !amount || !category || !accountType || !createdBy || !side || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const entry = await db.cashEntry.create({
      data: {
        type,
        amount: Number(amount),
        category,
        description: description || null,
        accountType,
        createdBy,
        side,
        date: new Date(date),
      },
      include: {
        creator: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error('POST cash-entries error:', error)
    return NextResponse.json({ error: 'Failed to create cash entry' }, { status: 500 })
  }
}

// PUT: Update an existing cash entry
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { entryId, type, amount, category, description, accountType, date } = body

    if (!entryId) {
      return NextResponse.json({ error: 'entryId is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (type !== undefined) updateData.type = type
    if (amount !== undefined) updateData.amount = Number(amount)
    if (category !== undefined) updateData.category = category
    if (description !== undefined) updateData.description = description
    if (accountType !== undefined) updateData.accountType = accountType
    if (date !== undefined) updateData.date = new Date(date)

    const updated = await db.cashEntry.update({
      where: { id: entryId },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PUT cash-entries error:', error)
    return NextResponse.json({ error: 'Failed to update cash entry' }, { status: 500 })
  }
}

// DELETE: ?entryId=X - Delete a cash entry
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entryId = searchParams.get('entryId')

    if (!entryId) {
      return NextResponse.json({ error: 'entryId query parameter is required' }, { status: 400 })
    }

    await db.cashEntry.delete({
      where: { id: entryId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE cash-entries error:', error)
    return NextResponse.json({ error: 'Failed to delete cash entry' }, { status: 500 })
  }
}

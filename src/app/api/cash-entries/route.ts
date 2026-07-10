import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

// GET: ?side=X - Get all cash entries for side with totals
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const side = searchParams.get('side')

    if (!side || !['MEN', 'WOMEN'].includes(side)) {
      return NextResponse.json({ error: 'Valid side parameter (MEN/WOMEN) is required' }, { status: 400 })
    }

    const rows = await db.cashEntry.findMany({
      where: { side },
      orderBy: { date: 'desc' },
    }) as Array<Record<string, unknown>>

    // Fetch creators separately to avoid include type issues
    const creatorIds = [...new Set(rows.map((r) => r.createdBy as string))]
    const creators = creatorIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: creatorIds } },
          select: { id: true, displayName: true, avatarUrl: true },
        })
      : []
    const creatorMap = Object.fromEntries(creators.map((c) => [c.id, c]))

    const entries = rows.map((r) => ({
      id: r.id,
      type: r.type,
      amount: r.amount,
      category: r.category,
      description: r.description,
      accountType: r.accountType,
      createdBy: r.createdBy,
      side: r.side,
      date: new Date(r.date as string).toISOString().split('T')[0],
      createdAt: new Date(r.createdAt as string).toISOString(),
      updatedAt: new Date(r.updatedAt as string).toISOString(),
      creator: creatorMap[r.createdBy as string] || { id: '', displayName: 'Unknown', avatarUrl: null },
    }))

    const totalIn = entries
      .filter((e) => e.type === 'CASH_IN')
      .reduce((sum, e) => sum + Number(e.amount), 0)

    const totalOut = entries
      .filter((e) => e.type === 'CASH_OUT')
      .reduce((sum, e) => sum + Number(e.amount), 0)

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
    }) as Record<string, unknown>

    const creator = await db.user.findUnique({
      where: { id: createdBy },
      select: { id: true, displayName: true, avatarUrl: true },
    })

    const mapped = {
      id: entry.id,
      type: entry.type,
      amount: entry.amount,
      category: entry.category,
      description: entry.description,
      accountType: entry.accountType,
      createdBy: entry.createdBy,
      side: entry.side,
      date: new Date(entry.date as string).toISOString().split('T')[0],
      createdAt: new Date(entry.createdAt as string).toISOString(),
      updatedAt: new Date(entry.updatedAt as string).toISOString(),
      creator: creator || { id: '', displayName: 'Unknown', avatarUrl: null },
    }

    return NextResponse.json(mapped, { status: 201 })
  } catch (error) {
    console.error('POST cash-entries error:', error)
    return NextResponse.json({ error: 'Failed to create cash entry' }, { status: 500 })
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

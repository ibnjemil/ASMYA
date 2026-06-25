import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { Role } from '@prisma/client'

export const runtime = 'nodejs'

// GET: Return AI usage stats aggregated by category and language
// Only allowed for SUPERIOR_AMIR users (check userId query param)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const mode = searchParams.get('mode') // 'recent' to get individual entries

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Verify user is SUPERIOR_AMIR
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== Role.SUPERIOR_AMIR) {
      return NextResponse.json({ error: 'Unauthorized. Only SUPERIOR_AMIR can access AI usage stats.' }, { status: 403 })
    }

    // mode=recent returns recent individual entries
    if (mode === 'recent') {
      const limit = parseInt(searchParams.get('limit') || '20', 10)
      const recent = await db.aiUsage.findMany({
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 100),
        select: {
          id: true,
          query: true,
          category: true,
          language: true,
          side: true,
          responseTimeMs: true,
          createdAt: true,
        },
      })
      return NextResponse.json(recent)
    }

    // Default: aggregated stats grouped by category and language
    const stats = await db.aiUsage.groupBy({
      by: ['category', 'language'],
      _count: { id: true },
      _avg: { responseTimeMs: true },
      _min: { createdAt: true },
      _max: { createdAt: true },
    })

    return NextResponse.json(stats)
  } catch (error) {
    console.error('GET ai-usage error:', error)
    return NextResponse.json({ error: 'Failed to fetch AI usage stats' }, { status: 500 })
  }
}

// POST: Accept AI usage log entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, query, category, language, side, responseTimeMs } = body

    if (!userId || !query || !category || !language || !side) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const usage = await db.aiUsage.create({
      data: {
        userId,
        query,
        category,
        language,
        side,
        responseTimeMs: responseTimeMs ?? null,
      },
    })

    return NextResponse.json(usage, { status: 201 })
  } catch (error) {
    console.error('POST ai-usage error:', error)
    return NextResponse.json({ error: 'Failed to log AI usage' }, { status: 500 })
  }
}

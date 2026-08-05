import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const { createClient } = await import('@libsql/client')
    const client = createClient({
      url: process.env.ASMYA_DB_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })

    const results: string[] = []

    const tableInfo = await client.execute('PRAGMA table_info("Plan")')
    const cols = new Set(tableInfo.rows.map((r) => r.name as string))

    if (cols.size === 0) {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS "Plan" (
          "id" TEXT PRIMARY KEY,
          "title" TEXT NOT NULL,
          "description" TEXT,
          "dueDate" TEXT NOT NULL,
          "reminderAt" TEXT,
          "status" TEXT DEFAULT 'PENDING',
          "urgency" TEXT DEFAULT 'NORMAL',
          "createdBy" TEXT NOT NULL,
          "side" TEXT NOT NULL,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL
        )
      `)
      results.push('Created Plan table')
    } else {
      if (!cols.has('urgency')) {
        await client.execute(`ALTER TABLE "Plan" ADD COLUMN "urgency" TEXT DEFAULT 'NORMAL'`)
        results.push('Added urgency column')
      }
      if (!cols.has('reminderAt')) {
        await client.execute(`ALTER TABLE "Plan" ADD COLUMN "reminderAt" TEXT`)
        results.push('Added reminderAt column')
      }
      if (!cols.has('status')) {
        await client.execute(`ALTER TABLE "Plan" ADD COLUMN "status" TEXT DEFAULT 'PENDING'`)
        results.push('Added status column')
      }
    }

    const paInfo = await client.execute('PRAGMA table_info("PlanAssignment")')
    if (paInfo.rows.length === 0) {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS "PlanAssignment" (
          "id" TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "planId" TEXT NOT NULL,
          "createdAt" TEXT NOT NULL
        )
      `)
      results.push('Created PlanAssignment table')
    }

    const reportInfo = await client.execute('PRAGMA table_info("Report")')
    const reportCols = new Set(reportInfo.rows.map((r) => r.name as string))
    if (reportCols.size > 0) {
      if (!reportCols.has('planId')) {
        await client.execute(`ALTER TABLE "Report" ADD COLUMN "planId" TEXT`)
        results.push('Added planId to Report')
      }
      if (!reportCols.has('mediaUrl')) {
        await client.execute(`ALTER TABLE "Report" ADD COLUMN "mediaUrl" TEXT`)
        results.push('Added mediaUrl to Report')
      }
    }

    if (results.length === 0) {
      return NextResponse.json({ success: true, message: 'Already up to date' })
    }

    return NextResponse.json({ success: true, message: 'Migration complete', changes: results })
  } catch (error) {
    console.error('Migration error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Migration failed', details: msg }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/admin/sync-db
// Syncs the production DB schema with the Prisma schema by running ALTER TABLE
// statements directly. This is needed because:
//   1. The vercel-build 'prisma db push' step is silently failing.
//   2. The runtime 'npx prisma db push' approach doesn't work on Vercel serverless
//      (no writable HOME for npm cache).
//
// So we do it manually with raw SQL. We use IF NOT EXISTS clauses to make this
// idempotent — running it multiple times is safe.
//
// USAGE:
//   curl -X POST https://erp-ea.vercel.app/api/admin/sync-db
export async function POST(request: NextRequest) {
  const results: { step: string; status: 'ok' | 'skipped' | 'error'; message: string }[] = []

  // ───────────────────────────────────────────────────────────────────────
  // 1. Add missing columns to Task table (additive — no data loss)
  // ───────────────────────────────────────────────────────────────────────
  const taskColumns: { name: string; type: string }[] = [
    { name: 'reviseReason',    type: 'TEXT' },
    { name: 'reviseNextDate',  type: 'TIMESTAMP(3)' },
    { name: 'revisedAt',       type: 'TIMESTAMP(3)' },
    { name: 'reviseCount',     type: 'INTEGER DEFAULT 0' },
    { name: 'score',           type: 'DOUBLE PRECISION' },
    { name: 'frequency',       type: 'TEXT' },
    { name: 'weekDays',        type: 'TEXT' },
    { name: 'monthDates',      type: 'TEXT' },
    { name: 'directorDependency', type: 'TEXT' },
    { name: 'projectId',       type: 'TEXT' },
    // Foreign key for projectId is added separately below.
  ]

  for (const col of taskColumns) {
    try {
      await db.$executeRaw`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`
      results.push({ step: `Add Task.${col.name}`, status: 'ok', message: 'Column added (or already existed)' })
    } catch (e: any) {
      // For non-IF-NOT-EXISTS-friendly DBs we may need to handle the unique violation
      results.push({ step: `Add Task.${col.name}`, status: 'error', message: String(e?.message || e).substring(0, 200) })
    }
  }

  // ───────────────────────────────────────────────────────────────────────
  // 2. Add missing columns to TaskStep table
  // ───────────────────────────────────────────────────────────────────────
  const taskStepColumns: { name: string; type: string }[] = [
    { name: 'needsDirectorApproval', type: 'BOOLEAN DEFAULT false' },
    { name: 'directorName',          type: 'TEXT' },
    { name: 'directorNote',          type: 'TEXT' },
  ]
  for (const col of taskStepColumns) {
    try {
      await db.$executeRaw`ALTER TABLE "TaskStep" ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`
      results.push({ step: `Add TaskStep.${col.name}`, status: 'ok', message: 'Column added (or already existed)' })
    } catch (e: any) {
      results.push({ step: `Add TaskStep.${col.name}`, status: 'error', message: String(e?.message || e).substring(0, 200) })
    }
  }

  // ───────────────────────────────────────────────────────────────────────
  // 3. Add missing columns to Leave table
  // ───────────────────────────────────────────────────────────────────────
  const leaveColumns: { name: string; type: string }[] = [
    { name: 'applicationTag', type: 'TEXT DEFAULT \'AL\'' },
    { name: 'eaRemark',       type: 'TEXT' },
    { name: 'approvedById',   type: 'TEXT' },
    { name: 'approvedAt',     type: 'TIMESTAMP(3)' },
    { name: 'totalDays',      type: 'DOUBLE PRECISION DEFAULT 1' },
  ]
  for (const col of leaveColumns) {
    try {
      await db.$executeRaw`ALTER TABLE "Leave" ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`
      results.push({ step: `Add Leave.${col.name}`, status: 'ok', message: 'Column added (or already existed)' })
    } catch (e: any) {
      results.push({ step: `Add Leave.${col.name}`, status: 'error', message: String(e?.message || e).substring(0, 200) })
    }
  }

  // ───────────────────────────────────────────────────────────────────────
  // 4. Create TaskActivity table if it doesn't exist
  // ───────────────────────────────────────────────────────────────────────
  try {
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "TaskActivity" (
        "id"          TEXT NOT NULL,
        "action"      TEXT NOT NULL,
        "taskTitle"   TEXT NOT NULL,
        "taskId"      TEXT NOT NULL,
        "priority"    TEXT,
        "department"  TEXT,
        "category"    TEXT,
        "status"      TEXT,
        "actorId"     TEXT,
        "description" TEXT,
        "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TaskActivity_pkey" PRIMARY KEY ("id")
      )
    `
    results.push({ step: 'Create TaskActivity table', status: 'ok', message: 'Table created (or already existed)' })
  } catch (e: any) {
    results.push({ step: 'Create TaskActivity table', status: 'error', message: String(e?.message || e).substring(0, 200) })
  }

  // Create indexes on TaskActivity (idempotent)
  for (const idx of ['taskId', 'createdAt', 'action']) {
    try {
      await db.$executeRaw`CREATE INDEX IF NOT EXISTS "TaskActivity_${idx}_idx" ON "TaskActivity"("${idx}")`
      results.push({ step: `Create index TaskActivity.${idx}`, status: 'ok', message: 'Index created (or already existed)' })
    } catch (e: any) {
      results.push({ step: `Create index TaskActivity.${idx}`, status: 'error', message: String(e?.message || e).substring(0, 200) })
    }
  }

  // Add foreign key from TaskActivity.actorId → User.id (if not exists)
  try {
    await db.$executeRaw`
      ALTER TABLE "TaskActivity"
      ADD CONSTRAINT IF NOT EXISTS "TaskActivity_actorId_fkey"
      FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
    `
    results.push({ step: 'Add FK TaskActivity.actorId → User.id', status: 'ok', message: 'FK added (or already existed)' })
  } catch (e: any) {
    results.push({ step: 'Add FK TaskActivity.actorId → User.id', status: 'error', message: String(e?.message || e).substring(0, 200) })
  }

  // ───────────────────────────────────────────────────────────────────────
  // 5. Final verification — count tasks to confirm DB is reachable
  // ───────────────────────────────────────────────────────────────────────
  let finalTaskCount = 0
  try {
    finalTaskCount = await db.task.count()
    results.push({ step: 'Verify Task.count()', status: 'ok', message: `Counted ${finalTaskCount} tasks` })
  } catch (e: any) {
    results.push({ step: 'Verify Task.count()', status: 'error', message: String(e?.message || e).substring(0, 200) })
  }

  return NextResponse.json({
    success: true,
    finalTaskCount,
    steps: results,
  })
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to run the DB schema sync (additive ALTER TABLE statements).',
    warning: 'Takes 5-10 seconds. Idempotent — safe to run multiple times.',
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// POST /api/admin/sync-db
// Runs `prisma db push --accept-data-loss` at runtime to sync the schema with the
// production database. This is needed because the vercel-build step appears to be
// silently failing — the schema in code has fields (reviseCount, score, etc.) that
// don't exist in the production DB yet.
//
// USAGE: After deploying a new version, hit this endpoint once to sync the DB.
//   curl -X POST https://erp-ea.vercel.app/api/admin/sync-db
//
// Returns the stdout/stderr of the prisma command so we can see what happened.
export async function POST(request: NextRequest) {
  try {
    console.log('[sync-db] Starting prisma db push...')

    // Run prisma db push with a 60s timeout
    const { stdout, stderr } = await execAsync(
      'npx prisma db push --accept-data-loss --skip-generate 2>&1',
      {
        cwd: process.cwd(),
        timeout: 60000,
        env: process.env,
      }
    )

    console.log('[sync-db] stdout:', stdout)
    console.log('[sync-db] stderr:', stderr)

    return NextResponse.json({
      success: true,
      stdout: stdout.substring(0, 5000),
      stderr: stderr.substring(0, 5000),
    })
  } catch (error: any) {
    console.error('[sync-db] FAILED:', error)
    return NextResponse.json({
      success: false,
      error: String(error?.message || error),
      stdout: error?.stdout?.substring(0, 5000) || '',
      stderr: error?.stderr?.substring(0, 5000) || '',
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to run prisma db push and sync the schema with the production DB.',
    warning: 'This may take 30-60 seconds to complete.',
  })
}

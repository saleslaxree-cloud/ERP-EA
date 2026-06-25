import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ════════════════════════════════════════════════════════════════════════
// v24·0625 — EXTERNAL ATTENDANCE QUERIES API (for HRMS to consume)
// ════════════════════════════════════════════════════════════════════════
// HRMS HR dashboard calls this endpoint to display ERP-raised attendance
// queries so HR can review and respond.
//
// AUTH: Requires `x-erp-api-key` header matching env var ERP_BRIDGE_API_KEY.
// This is a static shared secret — does NOT touch any DB table.
//
// SAFETY: Read-only endpoint. Does not modify any data.
// ════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    // Validate API key
    const apiKey = request.headers.get('x-erp-api-key')
    const expectedKey = process.env.ERP_BRIDGE_API_KEY
    if (!expectedKey || apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')  // OPEN | RESPONDED | CLOSED — optional

    const where: any = {}
    if (status) where.status = status

    const queries = await db.attendanceQuery.findMany({
      where,
      include: {
        user: {
          select: {
            id: true, name: true, email: true,
            department: true, designation: true, phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ queries: Array.isArray(queries) ? queries : [] })
  } catch (error: any) {
    console.error('External attendance-queries GET error:', error)
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}

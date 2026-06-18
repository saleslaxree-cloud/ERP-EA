import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/task-activity
// Fetches the persistent audit log of task events (CREATED, DELETED, UPDATED, etc.)
// Optional query params:
//   ?limit=20   — max items to return (default 30, max 100)
//   ?action=CREATED  — filter by action type
//   ?taskId=... — filter by task ID
//   ?actorId=... — filter by who did the action
export async function GET(request: NextRequest) {
  try {
    const limitParam = request.nextUrl.searchParams.get('limit')
    const action = request.nextUrl.searchParams.get('action')
    const taskId = request.nextUrl.searchParams.get('taskId')
    const actorId = request.nextUrl.searchParams.get('actorId')

    const limit = Math.min(parseInt(limitParam || '30', 10) || 30, 100)

    const where: Record<string, unknown> = {}
    if (action) where.action = action
    if (taskId) where.taskId = taskId
    if (actorId) where.actorId = actorId

    const activities = await db.taskActivity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        actor: { select: { id: true, name: true, email: true, role: true, avatar: true } },
      },
    })

    return NextResponse.json({ activities, count: activities.length })
  } catch (error) {
    console.error('TaskActivity GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch task activity' }, { status: 500 })
  }
}

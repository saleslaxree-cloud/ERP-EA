import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { WorkflowStatus } from '@/lib/constants'

// GET /api/weekly-score?userId=xxx&weekStart=ISO&weekEnd=ISO
// Returns per-user weekly task statistics for live score auto-calculation
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const weekStart = searchParams.get('weekStart')
    const weekEnd = searchParams.get('weekEnd')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }
    if (!weekStart || !weekEnd) {
      return NextResponse.json({ error: 'weekStart and weekEnd are required' }, { status: 400 })
    }

    const startDate = new Date(weekStart)
    const endDate = new Date(weekEnd)
    // Set endDate to end of day
    endDate.setHours(23, 59, 59, 999)

    // Fetch all tasks owned by the user that are relevant to the selected week
    // A task is "in the week" if:
    //   - Its dueDate falls within the week, OR
    //   - Its createdAt falls within the week, OR
    //   - Its completedAt falls within the week
    const tasks = await db.task.findMany({
      where: {
        ownerId: userId,
        status: { notIn: [WorkflowStatus.CANCELLED, WorkflowStatus.DRAFT] },
        OR: [
          { dueDate: { gte: startDate, lte: endDate } },
          { createdAt: { gte: startDate, lte: endDate } },
          { completedAt: { gte: startDate, lte: endDate } },
        ],
      },
      select: {
        id: true,
        status: true,
        dueDate: true,
        completedAt: true,
        createdAt: true,
      },
    })

    const now = new Date()
    let completedOnTime = 0      // Completed before or on due date
    let completedLate = 0        // Completed after due date
    let inProgressOnTrack = 0    // In progress / in review, not yet overdue
    let overdue = 0              // Past due date, not completed
    let pending = 0              // Pending, not yet overdue
    let rejected = 0             // Rejected status

    for (const task of tasks) {
      const isOverdue = task.dueDate
        ? new Date(task.dueDate) < now && task.status !== WorkflowStatus.COMPLETED && task.status !== WorkflowStatus.CANCELLED
        : false

      switch (task.status) {
        case WorkflowStatus.COMPLETED:
          if (task.dueDate && task.completedAt && new Date(task.completedAt) > new Date(task.dueDate)) {
            completedLate++
          } else {
            completedOnTime++
          }
          break
        case WorkflowStatus.REJECTED:
          rejected++
          break
        case WorkflowStatus.IN_PROGRESS:
        case WorkflowStatus.IN_REVIEW:
        case WorkflowStatus.ON_HOLD:
        case WorkflowStatus.ESCALATED:
        case WorkflowStatus.EXTERNAL_HOLD:
          if (isOverdue) {
            overdue++
          } else {
            inProgressOnTrack++
          }
          break
        case WorkflowStatus.PENDING:
        case WorkflowStatus.RE_OPENED:
          if (isOverdue) {
            overdue++
          } else {
            pending++
          }
          break
        case WorkflowStatus.APPROVED:
          // Approved but not yet completed - treat as on track
          inProgressOnTrack++
          break
        default:
          break
      }
    }

    const totalTasks = tasks.length

    // Calculate percentage scores (out of total tasks)
    // Green = completedOnTime / total * 100
    // Yellow = (inProgressOnTrack + completedLate) / total * 100
    // Red = (overdue + rejected) / total * 100
    const greenScore = totalTasks > 0 ? Math.round((completedOnTime / totalTasks) * 100) : 0
    const yellowScore = totalTasks > 0 ? Math.round(((inProgressOnTrack + completedLate) / totalTasks) * 100) : 0
    const redScore = totalTasks > 0 ? Math.round(((overdue + rejected) / totalTasks) * 100) : 0

    // PR Score: weighted performance rating
    // Green * 10 + Yellow * 5 + Red * 0, normalized to 0-100
    const prScore = totalTasks > 0
      ? Math.round(((greenScore * 10 + yellowScore * 5 + redScore * 0) / (100 * 10 / 100)) * 10) / 10
      : 0

    return NextResponse.json({
      totalTasks,
      completedOnTime,
      completedLate,
      inProgressOnTrack,
      overdue,
      pending,
      rejected,
      greenScore,
      yellowScore,
      redScore,
      prScore,
    })
  } catch (error: any) {
    console.error('Weekly score error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

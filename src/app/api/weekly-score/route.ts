import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { WorkflowStatus } from '@/lib/constants'

// GET /api/weekly-score?userId=xxx&weekStart=ISO&weekEnd=ISO
// Returns per-user weekly task statistics with STRICT revision-aware scoring.
//
// ─── Strict score system (v8 · 2026-06-17) ───────────────────────────────
// Each task gets a base score (0–100) based on its current state:
//   COMPLETED on time            → 100
//   COMPLETED late (within 2d)   → 70
//   COMPLETED late (> 2d)        → 40
//   IN_PROGRESS / IN_REVIEW      → 70 (on track) or 20 (overdue)
//   PENDING / RE_OPENED          → 50 (on track) or 20 (overdue)
//   ON_HOLD / EXTERNAL_HOLD      → 60
//   ESCALATED                    → 20
//   REJECTED                     → 0
//   No due date set              → 80 (treated as on-track by default)
//
// REVISION PENALTY (progressive — each revise hurts MORE than the last):
//   1st revision: -10
//   2nd revision: -15  (cumulative -25)
//   3rd revision: -20  (cumulative -45)
//   4th+ revision: -25 each
//   Final per-task score floor: 0
//
// PR Score = average of per-task scores across all tasks in the week.
// Green / Yellow / Red bands are computed from the per-task scores:
//   Green  = task score >= 70
//   Yellow = task score 40–69
//   Red    = task score < 40

// Helper: compute the revision penalty for a given reviseCount
function revisionPenalty(reviseCount: number): number {
  if (reviseCount <= 0) return 0
  let penalty = 0
  for (let i = 1; i <= reviseCount; i++) {
    if (i === 1) penalty += 10
    else if (i === 2) penalty += 15
    else if (i === 3) penalty += 20
    else penalty += 25
  }
  return penalty
}

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
    endDate.setHours(23, 59, 59, 999)

    // Fetch all tasks owned by the user that are relevant to the selected week
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
        reviseCount: true,
      },
    })

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    let completedOnTime = 0
    let completedLate = 0
    let inProgressOnTrack = 0
    let overdue = 0
    let pending = 0
    let rejected = 0

    let totalRevisions = 0          // Sum of reviseCount across all tasks in the week
    let tasksRevised = 0            // How many distinct tasks have reviseCount > 0
    let totalRevisionPenalty = 0    // Sum of penalty points across all tasks

    let greenCount = 0   // task score >= 70
    let yellowCount = 0  // task score 40-69
    let redCount = 0     // task score < 40
    let totalTaskScore = 0

    for (const task of tasks) {
      const isOverdue = task.dueDate
        ? new Date(task.dueDate) < todayStart && task.status !== WorkflowStatus.COMPLETED && task.status !== WorkflowStatus.CANCELLED
        : false

      let baseScore = 0

      switch (task.status) {
        case WorkflowStatus.COMPLETED:
          if (task.dueDate && task.completedAt && new Date(task.completedAt) > new Date(task.dueDate)) {
            completedLate++
            // Late completion: check how late
            const diffDays = (new Date(task.completedAt).getTime() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24)
            baseScore = diffDays <= 2 ? 70 : 40
          } else if (task.dueDate) {
            completedOnTime++
            baseScore = 100
          } else {
            completedOnTime++
            baseScore = 80  // No due date — completed, treated as on-time
          }
          break
        case WorkflowStatus.REJECTED:
          rejected++
          baseScore = 0
          break
        case WorkflowStatus.IN_PROGRESS:
        case WorkflowStatus.IN_REVIEW:
        case WorkflowStatus.ESCALATED:
        case WorkflowStatus.EXTERNAL_HOLD:
        case WorkflowStatus.ON_HOLD:
          if (isOverdue) {
            overdue++
            baseScore = task.status === WorkflowStatus.ESCALATED ? 10 : 20
          } else {
            inProgressOnTrack++
            baseScore = task.status === WorkflowStatus.ON_HOLD || task.status === WorkflowStatus.EXTERNAL_HOLD ? 60 : 70
          }
          break
        case WorkflowStatus.PENDING:
        case WorkflowStatus.RE_OPENED:
          if (isOverdue) {
            overdue++
            baseScore = 20
          } else {
            pending++
            baseScore = 50
          }
          break
        case WorkflowStatus.APPROVED:
          inProgressOnTrack++
          baseScore = 75
          break
        default:
          break
      }

      // Apply revision penalty
      const reviseCount = (task as any).reviseCount || 0
      const penalty = revisionPenalty(reviseCount)
      const finalScore = Math.max(0, baseScore - penalty)

      if (reviseCount > 0) {
        tasksRevised++
        totalRevisions += reviseCount
        totalRevisionPenalty += penalty
      }

      totalTaskScore += finalScore
      if (finalScore >= 70) greenCount++
      else if (finalScore >= 40) yellowCount++
      else redCount++
    }

    const totalTasks = tasks.length

    // Percentage bands (count-based, for backwards-compat with UI)
    const greenScore = totalTasks > 0 ? Math.round((greenCount / totalTasks) * 100) : 0
    const yellowScore = totalTasks > 0 ? Math.round((yellowCount / totalTasks) * 100) : 0
    const redScore = totalTasks > 0 ? Math.round((redCount / totalTasks) * 100) : 0

    // ─── PR Score (strict, revision-aware) ───────────────────────────
    // Average of per-task final scores (0-100). Revisions drag this down.
    const prScore = totalTasks > 0
      ? Math.round((totalTaskScore / totalTasks) * 10) / 10
      : 0

    // Average penalty per task — useful to surface in UI
    const avgRevisionPenalty = totalTasks > 0
      ? Math.round((totalRevisionPenalty / totalTasks) * 10) / 10
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
      // New strict-score fields
      tasksRevised,            // how many distinct tasks have been revised
      totalRevisions,          // total revision count across all tasks
      avgRevisionPenalty,      // average score penalty per task (0 if no revisions)
      totalRevisionPenalty,    // sum of all revision penalties
      greenCount,
      yellowCount,
      redCount,
      avgTaskScore: prScore,   // alias for clarity
    })
  } catch (error: any) {
    console.error('Weekly score error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

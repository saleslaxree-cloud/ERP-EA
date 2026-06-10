import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { WorkflowStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')
    const now = new Date()

    // ══ TASK STATS (lightweight counts) ══
    const totalTasks = await db.task.count()
    const completedTasks = await db.task.count({ where: { status: WorkflowStatus.COMPLETED } })
    const pendingTasks = await db.task.count({ where: { status: WorkflowStatus.PENDING } })
    const inProgressTasks = await db.task.count({ where: { status: WorkflowStatus.IN_PROGRESS } })

    const overdueTasks = await db.task.count({
      where: {
        status: { in: [WorkflowStatus.PENDING, WorkflowStatus.IN_PROGRESS] },
        dueDate: { lt: now },
      },
    })

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
    const todayTasks = await db.task.count({
      where: { dueDate: { gte: todayStart, lt: todayEnd } },
    })

    const nextWeekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const upcomingTasks = await db.task.count({
      where: {
        dueDate: { gte: todayEnd, lt: nextWeekEnd },
        status: { notIn: [WorkflowStatus.COMPLETED, WorkflowStatus.CANCELLED] },
      },
    })

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // ══ ALL TASKS (lightweight - no taskSteps) ══
    const allTasks = await db.task.findMany({
      select: {
        id: true, title: true, description: true, status: true, priority: true,
        department: true, category: true, dueDate: true, completedAt: true, createdAt: true,
        frequency: true, weekDays: true, monthDates: true, directorDependency: true,
        owner: { select: { id: true, name: true, department: true, role: true } },
        taskSteps: { select: { id: true, title: true, status: true, order: true }, orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // ══ ALL USERS ══
    const allUsers = await db.user.findMany({
      select: { id: true, name: true, email: true, role: true, department: true, isActive: true },
    })

    // ══ USER PERFORMANCE ══
    const userPerformance = allUsers.map(user => {
      const userTasks = allTasks.filter(t => t.owner?.id === user.id)
      const done = userTasks.filter(t => t.status === WorkflowStatus.COMPLETED).length
      const overdue = userTasks.filter(t =>
        t.dueDate && new Date(t.dueDate) < now && !([WorkflowStatus.COMPLETED, WorkflowStatus.CANCELLED] as WorkflowStatus[]).includes(t.status)
      ).length
      const inProgress = userTasks.filter(t => t.status === WorkflowStatus.IN_PROGRESS).length
      const score = userTasks.length > 0 ? Math.round((done / userTasks.length) * 100 - overdue * 5) : 0
      return {
        id: user.id, name: user.name, department: user.department, role: user.role,
        total: userTasks.length, done, inProgress, overdue,
        score: Math.max(0, score),
        completionRate: userTasks.length > 0 ? Math.round((done / userTasks.length) * 100) : 0,
      }
    }).sort((a, b) => b.score - a.score)

    // ══ DEPARTMENT STATS ══
    const deptMap: Record<string, { total: number; done: number; overdue: number; inProgress: number; pending: number }> = {}
    allTasks.forEach(t => {
      const dept = t.department || t.owner?.department || 'Unassigned'
      if (!deptMap[dept]) deptMap[dept] = { total: 0, done: 0, overdue: 0, inProgress: 0, pending: 0 }
      deptMap[dept].total++
      if (t.status === WorkflowStatus.COMPLETED) deptMap[dept].done++
      if (t.status === WorkflowStatus.IN_PROGRESS) deptMap[dept].inProgress++
      if (t.status === WorkflowStatus.PENDING) deptMap[dept].pending++
      if (t.dueDate && new Date(t.dueDate) < now && !([WorkflowStatus.COMPLETED, WorkflowStatus.CANCELLED] as WorkflowStatus[]).includes(t.status)) deptMap[dept].overdue++
    })

    // ══ CATEGORY STATS ══
    const catMap: Record<string, { total: number; done: number; inProgress: number }> = {}
    allTasks.forEach(t => {
      const cat = t.category || 'Uncategorized'
      if (!catMap[cat]) catMap[cat] = { total: 0, done: 0, inProgress: 0 }
      catMap[cat].total++
      if (t.status === WorkflowStatus.COMPLETED) catMap[cat].done++
      if (t.status === WorkflowStatus.IN_PROGRESS) catMap[cat].inProgress++
    })

    // ══ STATUS COUNTS ══
    const statusCounts: Record<string, number> = {}
    allTasks.forEach(t => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1
    })

    // ══ FILTERED LISTS ══
    const todayTasksList = allTasks.filter(t => t.dueDate && new Date(t.dueDate) >= todayStart && new Date(t.dueDate) < todayEnd)
    const upcomingTasksList = allTasks.filter(t =>
      t.dueDate && new Date(t.dueDate) >= todayEnd && new Date(t.dueDate) < nextWeekEnd &&
      !([WorkflowStatus.COMPLETED, WorkflowStatus.CANCELLED] as WorkflowStatus[]).includes(t.status)
    )
    const overdueTasksList = allTasks.filter(t =>
      t.dueDate && new Date(t.dueDate) < now &&
      !([WorkflowStatus.COMPLETED, WorkflowStatus.CANCELLED] as WorkflowStatus[]).includes(t.status)
    )

    return NextResponse.json({
      statusCounts,
      totalWorkflows: 0,
      totalTasks, completedTasks, pendingTasks, inProgressTasks, overdueTasks,
      todayTasks, upcomingTasks, externalHoldTasks: 0,
      pendingApprovals: 0, escalationCount: 0,
      completionRate, performanceScore: completionRate,
      allTasks: [], // Removed for performance - use /api/tasks instead
      allUsers, userPerformance, deptMap, catMap,
      recentActivities: [],
      todayTasksList: todayTasksList.map(t => ({
        id: t.id, title: t.title, status: t.status, priority: t.priority,
        department: t.department, category: t.category, dueDate: t.dueDate?.toISOString(), owner: t.owner,
      })),
      upcomingTasksList: upcomingTasksList.map(t => ({
        id: t.id, title: t.title, status: t.status, priority: t.priority,
        department: t.department, category: t.category, dueDate: t.dueDate?.toISOString(), owner: t.owner,
      })),
      overdueTasksList: overdueTasksList.map(t => ({
        id: t.id, title: t.title, status: t.status, priority: t.priority,
        department: t.department, category: t.category, dueDate: t.dueDate?.toISOString(), owner: t.owner,
      })),
      pendingApprovalsList: [],
      notifications: [],
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}

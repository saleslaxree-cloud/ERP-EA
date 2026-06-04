import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { WorkflowStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    // ══ WORKFLOW STATS ══
    const workflowsByStatus = await db.workflowInstance.groupBy({
      by: ['status'],
      _count: { status: true },
    })

    const statusCounts = Object.values(WorkflowStatus).reduce((acc, status) => {
      acc[status] = 0
      return acc
    }, {} as Record<string, number>)

    workflowsByStatus.forEach((item) => {
      statusCounts[item.status] = item._count.status
    })

    const totalWorkflows = await db.workflowInstance.count()

    // ══ TASK STATS ══
    const totalTasks = await db.task.count()
    const completedTasks = await db.task.count({ where: { status: WorkflowStatus.COMPLETED } })
    const pendingTasks = await db.task.count({ where: { status: WorkflowStatus.PENDING } })
    const inProgressTasks = await db.task.count({ where: { status: WorkflowStatus.IN_PROGRESS } })

    const now = new Date()
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

    const externalHoldTasks = await db.task.count({
      where: { status: WorkflowStatus.EXTERNAL_HOLD },
    })

    // ══ PENDING APPROVALS ══
    let pendingApprovals = 0
    if (userId) {
      const pendingSteps = await db.stepInstance.count({
        where: {
          assigneeId: userId,
          status: { in: [WorkflowStatus.PENDING, WorkflowStatus.IN_REVIEW] },
        },
      })
      pendingApprovals = pendingSteps
    }

    // ══ ESCALATION COUNT ══
    const escalationCount = await db.workflowInstance.count({
      where: { status: WorkflowStatus.ESCALATED },
    })

    // ══ COMPLETION RATE ══
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // ══ ALL TASKS WITH OWNER INFO ══
    const allTasks = await db.task.findMany({
      include: {
        owner: { select: { id: true, name: true, department: true, role: true } },
        taskSteps: { select: { id: true, title: true, status: true, order: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // ══ ALL USERS ══
    const allUsers = await db.user.findMany({
      select: {
        id: true, name: true, email: true, role: true, department: true, isActive: true,
      },
    })

    // ══ USER PERFORMANCE ══
    const userPerformance = allUsers.map(user => {
      const userTasks = allTasks.filter(t => t.ownerId === user.id)
      const done = userTasks.filter(t => t.status === WorkflowStatus.COMPLETED).length
      const overdue = userTasks.filter(t =>
        t.dueDate && new Date(t.dueDate) < now && ![WorkflowStatus.COMPLETED, WorkflowStatus.CANCELLED].includes(t.status)
      ).length
      const inProgress = userTasks.filter(t => t.status === WorkflowStatus.IN_PROGRESS).length
      const score = userTasks.length > 0 ? Math.round((done / userTasks.length) * 100 - overdue * 5) : 0
      return {
        id: user.id,
        name: user.name,
        department: user.department,
        role: user.role,
        total: userTasks.length,
        done,
        inProgress,
        overdue,
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
      if (t.dueDate && new Date(t.dueDate) < now && ![WorkflowStatus.COMPLETED, WorkflowStatus.CANCELLED].includes(t.status)) deptMap[dept].overdue++
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

    // ══ RECENT ACTIVITIES ══
    const recentActivities = await db.statusHistory.findMany({
      take: 15,
      orderBy: { createdAt: 'desc' },
      include: {
        workflow: { select: { id: true, title: true } },
      },
    })

    // ══ TODAY'S TASKS DETAIL ══
    const todayTasksList = allTasks.filter(t => t.dueDate && new Date(t.dueDate) >= todayStart && new Date(t.dueDate) < todayEnd)

    // ══ UPCOMING TASKS DETAIL ══
    const upcomingTasksList = allTasks.filter(t =>
      t.dueDate && new Date(t.dueDate) >= todayEnd && new Date(t.dueDate) < nextWeekEnd &&
      ![WorkflowStatus.COMPLETED, WorkflowStatus.CANCELLED].includes(t.status)
    )

    // ══ OVERDUE TASKS DETAIL ══
    const overdueTasksList = allTasks.filter(t =>
      t.dueDate && new Date(t.dueDate) < now &&
      ![WorkflowStatus.COMPLETED, WorkflowStatus.CANCELLED].includes(t.status)
    )

    // ══ PENDING APPROVALS DETAIL ══
    const pendingApprovalsList = await db.stepInstance.findMany({
      where: { status: { in: [WorkflowStatus.PENDING, WorkflowStatus.IN_REVIEW] } },
      include: {
        workflow: { select: { id: true, title: true, priority: true } },
        assignee: { select: { id: true, name: true, department: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    // ══ NOTIFICATIONS ══
    let notifications: any[] = []
    if (userId) {
      notifications = await db.notification.findMany({
        where: { receiverId: userId },
        take: 20,
        orderBy: { createdAt: 'desc' },
      })
    }

    return NextResponse.json({
      // Aggregated stats
      statusCounts,
      totalWorkflows,
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      overdueTasks,
      todayTasks,
      upcomingTasks,
      externalHoldTasks,
      pendingApprovals,
      escalationCount,
      completionRate,
      performanceScore: completionRate,

      // Detailed data
      allTasks: allTasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        department: t.department,
        category: t.category,
        dueDate: t.dueDate?.toISOString(),
        completedAt: t.completedAt?.toISOString(),
        createdAt: t.createdAt.toISOString(),
        owner: t.owner,
        stepsCount: t.taskSteps.length,
        stepsDone: t.taskSteps.filter(s => s.status === WorkflowStatus.COMPLETED).length,
        taskSteps: t.taskSteps,
      })),

      allUsers,
      userPerformance,
      deptMap,
      catMap,
      recentActivities: recentActivities.map(a => ({
        id: a.id,
        fromStatus: a.fromStatus,
        toStatus: a.toStatus,
        changedBy: a.changedBy,
        reason: a.reason,
        createdAt: a.createdAt.toISOString(),
        workflow: a.workflow,
      })),
      todayTasksList: todayTasksList.map(t => ({
        id: t.id, title: t.title, status: t.status, priority: t.priority,
        department: t.department, category: t.category, dueDate: t.dueDate?.toISOString(),
        owner: t.owner,
      })),
      upcomingTasksList: upcomingTasksList.map(t => ({
        id: t.id, title: t.title, status: t.status, priority: t.priority,
        department: t.department, category: t.category, dueDate: t.dueDate?.toISOString(),
        owner: t.owner,
      })),
      overdueTasksList: overdueTasksList.map(t => ({
        id: t.id, title: t.title, status: t.status, priority: t.priority,
        department: t.department, category: t.category, dueDate: t.dueDate?.toISOString(),
        owner: t.owner,
      })),
      pendingApprovalsList: pendingApprovalsList.map(s => ({
        id: s.id, name: s.name, stepType: s.stepType, status: s.status, order: s.order,
        workflow: s.workflow, assignee: s.assignee,
        slaDeadline: s.slaDeadline?.toISOString(),
        startedAt: s.startedAt?.toISOString(),
      })),
      notifications,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}

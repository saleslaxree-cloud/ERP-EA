import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { WorkflowStatus } from '@/lib/constants'

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    // ══ TASK STATS (lightweight counts) ══
    const totalTasks = await db.task.count()
    const completedTasks = await db.task.count({ where: { status: WorkflowStatus.COMPLETED } })
    const pendingTasks = await db.task.count({ where: { status: WorkflowStatus.PENDING } })
    const inProgressTasks = await db.task.count({ where: { status: WorkflowStatus.IN_PROGRESS } })

    // OVERDUE = due date strictly before TODAY (start of day), NOT before current timestamp.
    // Using `lt: now` caused today's tasks (midnight UTC) to be counted as overdue.
    const overdueTasks = await db.task.count({
      where: {
        status: { in: [WorkflowStatus.PENDING, WorkflowStatus.IN_PROGRESS] },
        dueDate: { lt: todayStart },
      },
    })
    // Today count: tasks without a dueDate OR with dueDate today (excludes COMPLETED/CANCELLED)
    const todayTasks = await db.task.count({
      where: {
        status: { notIn: [WorkflowStatus.COMPLETED, WorkflowStatus.CANCELLED] },
        OR: [
          { dueDate: null },
          { dueDate: { gte: todayStart, lt: todayEnd } },
        ],
      },
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
      // NOTE: loginUsername and loginPassword intentionally excluded for security
    })

    // ══ RECENT LEAVES (all statuses, for dashboard display) ══
    const recentLeaves = await db.leave.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, department: true, designation: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // ══ USER PERFORMANCE ══
    const userPerformance = allUsers.map(user => {
      const userTasks = allTasks.filter(t => t.owner?.id === user.id)
      const done = userTasks.filter(t => t.status === WorkflowStatus.COMPLETED).length
      const overdue = userTasks.filter(t =>
        t.dueDate && new Date(t.dueDate) < todayStart && t.status !== WorkflowStatus.COMPLETED && t.status !== WorkflowStatus.CANCELLED
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
      if (t.dueDate && new Date(t.dueDate) < todayStart && t.status !== WorkflowStatus.COMPLETED && t.status !== WorkflowStatus.CANCELLED) deptMap[dept].overdue++
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
    // Today: tasks WITHOUT a dueDate (need attention today) OR with dueDate today.
    // Excludes COMPLETED/CANCELLED so they don't clutter the "Today" panel.
    const todayTasksList = allTasks.filter(t =>
      t.status !== WorkflowStatus.COMPLETED && t.status !== WorkflowStatus.CANCELLED &&
      (!t.dueDate || (new Date(t.dueDate) >= todayStart && new Date(t.dueDate) < todayEnd))
    )
    const upcomingTasksList = allTasks.filter(t =>
      t.dueDate && new Date(t.dueDate) >= todayEnd && new Date(t.dueDate) < nextWeekEnd &&
      t.status !== WorkflowStatus.COMPLETED && t.status !== WorkflowStatus.CANCELLED
    )
    // OVERDUE LIST = due date strictly before TODAY (start of day).
    // This prevents overlap with todayTasksList.
    const overdueTasksList = allTasks.filter(t =>
      t.dueDate && new Date(t.dueDate) < todayStart &&
      t.status !== WorkflowStatus.COMPLETED && t.status !== WorkflowStatus.CANCELLED
    )

    // ══ PENDING APPROVALS ══
    const pendingApprovals = await db.workflowInstance.count({
      where: { status: { in: [WorkflowStatus.PENDING, WorkflowStatus.IN_REVIEW, WorkflowStatus.ON_HOLD] } },
    })
    const escalationCount = await db.workflowInstance.count({
      where: { status: WorkflowStatus.ESCALATED },
    })

    // ══ NOTIFICATIONS ══
    const notifications = await db.notification.findMany({
      where: { receiverId: userId || 'user-admin', isRead: false },
      select: {
        id: true, type: true, title: true, message: true, isRead: true, createdAt: true,
        sender: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 15,
    })

    // ══ PENDING APPROVALS LIST ══
    const pendingApprovalsList = await db.workflowInstance.findMany({
      where: { status: { in: [WorkflowStatus.PENDING, WorkflowStatus.IN_REVIEW] } },
      select: {
        id: true, title: true, status: true, priority: true,
        creator: { select: { id: true, name: true, role: true, department: true } },
        steps: { select: { id: true, name: true, status: true, order: true, assignee: { select: { id: true, name: true, role: true } } }, orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // ══ RECENT ACTIVITIES ══
    const recentStatusChanges = await db.statusHistory.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, fromStatus: true, toStatus: true, reason: true, createdAt: true,
        workflow: { select: { id: true, title: true } },
        changedBy: true,
      },
    })
    const recentActivities = recentStatusChanges.map(sh => ({
      id: sh.id,
      action: `${sh.workflow?.title || 'Workflow'}: ${sh.fromStatus} → ${sh.toStatus}`,
      time: sh.createdAt?.toISOString(),
      reason: sh.reason,
    }))

    return NextResponse.json({
      statusCounts: statusCounts || {},
      totalWorkflows: await db.workflowInstance.count(),
      totalTasks, completedTasks, pendingTasks, inProgressTasks, overdueTasks,
      todayTasks, upcomingTasks,
      externalHoldTasks: await db.task.count({ where: { status: WorkflowStatus.EXTERNAL_HOLD } }),
      pendingApprovals, escalationCount,
      completionRate, performanceScore: completionRate,
      allTasks: [],
      allUsers: Array.isArray(allUsers) ? allUsers : [],
      userPerformance: Array.isArray(userPerformance) ? userPerformance : [],
      deptMap: deptMap || {},
      catMap: catMap || {},
      recentActivities: Array.isArray(recentActivities) ? recentActivities : [],
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
      pendingApprovalsList: Array.isArray(pendingApprovalsList) ? pendingApprovalsList : [],
      notifications: Array.isArray(notifications) ? notifications : [],
      recentLeaves: Array.isArray(recentLeaves) ? recentLeaves.map(l => ({
        id: l.id,
        userId: l.userId,
        leaveType: l.leaveType,
        fromDate: l.fromDate?.toISOString(),
        toDate: l.toDate?.toISOString(),
        reason: l.reason,
        status: l.status,
        applicationTag: l.applicationTag,
        totalDays: l.totalDays,
        eaRemark: l.eaRemark,
        createdAt: l.createdAt?.toISOString(),
        user: l.user ? { id: l.user.id, name: l.user.name, department: l.user.department, designation: l.user.designation } : null,
        approvedBy: l.approvedBy ? { id: l.approvedBy.id, name: l.approvedBy.name } : null,
      })) : [],
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    // Return safe default structure instead of error object to prevent .filter() crashes
    return NextResponse.json({
      statusCounts: {}, totalWorkflows: 0,
      totalTasks: 0, completedTasks: 0, pendingTasks: 0, inProgressTasks: 0, overdueTasks: 0,
      todayTasks: 0, upcomingTasks: 0, externalHoldTasks: 0,
      pendingApprovals: 0, escalationCount: 0,
      completionRate: 0, performanceScore: 0,
      allTasks: [], allUsers: [], userPerformance: [],
      deptMap: {}, catMap: {},
      recentActivities: [],
      todayTasksList: [], upcomingTasksList: [], overdueTasksList: [],
      pendingApprovalsList: [], notifications: [],
      recentLeaves: [],
    })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { WorkflowStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    // Total workflows by status
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

    // Pending approvals for current user
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

    // Active tasks count
    let activeTasks = 0
    let overdueTasks = 0
    if (userId) {
      activeTasks = await db.task.count({
        where: {
          ownerId: userId,
          status: { in: [WorkflowStatus.PENDING, WorkflowStatus.IN_PROGRESS] },
        },
      })

      const now = new Date()
      overdueTasks = await db.task.count({
        where: {
          ownerId: userId,
          status: { in: [WorkflowStatus.PENDING, WorkflowStatus.IN_PROGRESS] },
          dueDate: { lt: now },
        },
      })
    }

    // Escalation count
    const escalationCount = await db.workflowInstance.count({
      where: { status: WorkflowStatus.ESCALATED },
    })

    // Workflow completion rate
    const completedWorkflows = await db.workflowInstance.count({
      where: { status: WorkflowStatus.COMPLETED },
    })
    const completionRate = totalWorkflows > 0 ? Math.round((completedWorkflows / totalWorkflows) * 100) : 0

    // Recent activities (last 10 status changes)
    const recentActivities = await db.statusHistory.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        workflow: {
          select: { id: true, title: true },
        },
      },
    })

    return NextResponse.json({
      statusCounts,
      totalWorkflows,
      pendingApprovals,
      activeTasks,
      overdueTasks,
      escalationCount,
      completionRate,
      recentActivities,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}

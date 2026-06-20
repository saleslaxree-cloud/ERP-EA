import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { WorkflowStatus, TaskPriority } from '@/lib/constants'

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId') || request.nextUrl.searchParams.get('ownerId')
    const status = request.nextUrl.searchParams.get('status')
    const assignedTo = request.nextUrl.searchParams.get('assignedTo')
    const assignedById = request.nextUrl.searchParams.get('assignedById')

    console.log('[tasks] GET params:', { userId, status, assignedTo, assignedById })

    const where: Record<string, unknown> = {}
    if (userId) where.ownerId = userId
    if (status) where.status = status
    if (assignedById) where.assignedById = assignedById

    // ─── DIAGNOSTIC: First, try a minimal query to see if DB itself is reachable ──
    const totalTaskCount = await db.task.count()
    console.log('[tasks] DB task count:', totalTaskCount)

    // If assignedTo is provided, also find tasks where the user is a task step assignee
    let assignedStepTasks: any[] = []
    if (assignedTo) {
      const stepTasks = await db.taskStep.findMany({
        where: { assigneeId: assignedTo },
        select: { taskId: true },
      })
      const taskIdsFromSteps = [...new Set(stepTasks.map(s => s.taskId))]
      if (taskIdsFromSteps.length > 0) {
        const stepWhere: Record<string, unknown> = { id: { in: taskIdsFromSteps }, parentTaskId: null }
        if (status) stepWhere.status = status
        if (assignedById) stepWhere.assignedById = assignedById
        assignedStepTasks = await db.task.findMany({
          where: stepWhere,
          include: {
            owner: { select: { id: true, name: true, email: true, role: true, department: true, avatar: true } },
            assignedBy: { select: { id: true, name: true, role: true } },
            workflow: {
              include: {
                steps: { orderBy: { order: 'asc' }, include: { assignee: { select: { id: true, name: true, role: true } } } },
              },
            },
            taskSteps: {
              orderBy: { order: 'asc' },
              include: { assignee: { select: { id: true, name: true, role: true } } },
            },
            subTasks: {
              include: {
                owner: { select: { id: true, name: true, email: true, role: true } },
              },
            },
            dependencies: {
              include: {
                dependsOnTask: { select: { id: true, title: true, status: true } },
              },
            },
            dependents: {
              include: {
                task: { select: { id: true, title: true, status: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      }
    }

    // ─── TRY SIMPLE QUERY FIRST ──────────────────────────────────────────
    // Some production deployments are failing on the heavy `include` clause (likely
    // because `dependencies`/`dependents` relations reference Task rows that no
    // longer exist). Use a LIGHTER query: only basic relations, no dependency graph.
    let tasks: any[]
    try {
      tasks = await db.task.findMany({
        where: { ...where, parentTaskId: null },
        include: {
          owner: { select: { id: true, name: true, email: true, role: true, department: true, avatar: true } },
          assignedBy: { select: { id: true, name: true, role: true } },
          taskSteps: {
            orderBy: { order: 'asc' },
            include: { assignee: { select: { id: true, name: true, role: true } } },
          },
          subTasks: {
            include: {
              owner: { select: { id: true, name: true, email: true, role: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      console.log('[tasks] Light query succeeded, returned', tasks.length, 'tasks')
    } catch (heavyErr: any) {
      console.error('[tasks] Light query FAILED, retrying with minimal include:', heavyErr?.message || heavyErr)
      // Fallback: even simpler — just owner + taskSteps, no subTasks
      tasks = await db.task.findMany({
        where: { ...where, parentTaskId: null },
        include: {
          owner: { select: { id: true, name: true, email: true, role: true, department: true, avatar: true } },
          assignedBy: { select: { id: true, name: true, role: true } },
          taskSteps: {
            orderBy: { order: 'asc' },
            include: { assignee: { select: { id: true, name: true, role: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      console.log('[tasks] Minimal query returned', tasks.length, 'tasks')
    }

    // Merge and deduplicate: tasks owned by user + tasks where user is step assignee
    if (assignedTo && assignedStepTasks.length > 0) {
      const existingIds = new Set(tasks.map(t => t.id))
      const newTasks = assignedStepTasks.filter(t => !existingIds.has(t.id))
      const allTasks = [...tasks, ...newTasks]
      // Sort by createdAt desc
      allTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      return NextResponse.json(allTasks)
    }

    return NextResponse.json(tasks)
  } catch (error: any) {
    console.error('Tasks GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks', detail: String(error?.message || error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title, description, priority, ownerId, dueDate, parentTaskId,
      department, category,
      frequency, weekDays, monthDates,
      assignedById,
    } = body

    if (!title || !ownerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Parse taskSteps from body - simplified, no director approval fields
    const taskStepsData = body.taskSteps || []

    // Create the task WITHOUT a workflow - simple task management
    const task = await db.task.create({
      data: {
        title,
        description: description || null,
        status: WorkflowStatus.IN_PROGRESS,
        priority: priority || TaskPriority.MEDIUM,
        ownerId,
        assignedById: assignedById || null,
        department: department || null,
        category: category || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        workflowId: null,
        parentTaskId: parentTaskId || null,
        directorDependency: null,
        frequency: frequency || null,
        weekDays: weekDays || null,
        monthDates: monthDates || null,
        taskSteps: {
          create: taskStepsData.map((step: { title: string; order: number; assigneeId?: string }) => ({
            title: step.title,
            status: WorkflowStatus.IN_PROGRESS,
            order: step.order || 0,
            assigneeId: step.assigneeId || null,
            needsDirectorApproval: false,
            directorName: null,
            directorNote: null,
          })),
        },
      },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true, department: true } },
        assignedBy: { select: { id: true, name: true, role: true } },
        workflow: { select: { id: true, title: true, status: true } },
        taskSteps: { orderBy: { order: 'asc' } },
      },
    })

    // Notify task owner
    await db.notification.create({
      data: {
        type: 'STATUS_CHANGE',
        title: `New Task Assigned: ${title}`,
        message: `You have been assigned a new task "${title}". It is now in progress.`,
        receiverId: ownerId,
      },
    })

    // ─── Also notify any step assignees (so employees assigned to a specific
    // step also receive a push notification about the new task). We exclude
    // the ownerId since they already got notified above. ──────────────────
    try {
      const stepAssigneeIds = Array.from(new Set(
        (taskStepsData || [])
          .map((s: any) => s.assigneeId)
          .filter((id: string) => id && id !== ownerId)
      )) as string[]
      for (const assigneeId of stepAssigneeIds) {
        await db.notification.create({
          data: {
            type: 'STATUS_CHANGE',
            title: `New Task Assigned: ${title}`,
            message: `You have been assigned a step in task "${title}". Open the task to see your steps.`,
            receiverId: assigneeId,
          },
        })
      }
    } catch (stepNotifErr) {
      console.error('[tasks] Step assignee notification error (non-fatal):', stepNotifErr)
    }

    // ─── Audit log: persist a CREATED entry in TaskActivity ──────────────
    // This NEVER gets cleaned up automatically — gives the user a full history.
    try {
      await db.taskActivity.create({
        data: {
          action: 'CREATED',
          taskId: task.id,
          taskTitle: task.title,
          priority: task.priority || null,
          department: task.department || null,
          category: task.category || null,
          status: task.status,
          actorId: ownerId, // best guess — task creator/owner
          description: `Task "${task.title}" created and assigned to ${task.owner?.name || 'owner'}`,
        },
      })
    } catch (actErr) {
      console.error('TaskActivity CREATED log error (non-fatal):', actErr)
    }

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Tasks POST error:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}

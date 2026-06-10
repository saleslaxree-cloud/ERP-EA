import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { WorkflowStatus, TaskPriority } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')
    const status = request.nextUrl.searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (userId) where.ownerId = userId
    if (status) where.status = status as WorkflowStatus

    // Only get top-level tasks (no parent)
    const tasks = await db.task.findMany({
      where: { ...where, parentTaskId: null },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true, department: true, avatar: true } },
        workflow: { select: { id: true, title: true, status: true, currentStepOrder: true } },
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

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Tasks GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title, description, priority, ownerId, dueDate, parentTaskId,
      department, category,
      directorDependencies = [],
      frequency, weekDays, monthDates,
    } = body

    if (!title || !ownerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Parse taskSteps from body
    const taskStepsData = body.taskSteps || []

    // Collect director names from steps that need approval
    const stepDirectors = taskStepsData
      .filter((step: { directorName?: string | null }) => step.directorName)
      .map((step: { directorName?: string | null }) => step.directorName)
      .filter(Boolean)
    const allDirectorDeps = [...new Set([...directorDependencies, ...stepDirectors])]

    // Create the task WITHOUT a workflow - workflow is created on-the-fly
    // when a step needing director approval is completed
    const task = await db.task.create({
      data: {
        title,
        description: description || null,
        status: WorkflowStatus.PENDING,
        priority: (priority as TaskPriority) || TaskPriority.MEDIUM,
        ownerId,
        department: department || null,
        category: category || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        workflowId: null,
        parentTaskId: parentTaskId || null,
        directorDependency: allDirectorDeps.length > 0 ? JSON.stringify(allDirectorDeps) : null,
        frequency: frequency || null,
        weekDays: weekDays || null,
        monthDates: monthDates || null,
        taskSteps: {
          create: taskStepsData.map((step: { title: string; order: number; directorName?: string | null; directorNote?: string | null }) => ({
            title: step.title,
            status: WorkflowStatus.PENDING,
            order: step.order || 0,
            needsDirectorApproval: !!step.directorName,
            directorName: step.directorName || null,
            directorNote: step.directorNote || null,
          })),
        },
      },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true, department: true } },
        workflow: { select: { id: true, title: true, status: true } },
        taskSteps: { orderBy: { order: 'asc' } },
      },
    })

    // Notify task owner
    await db.notification.create({
      data: {
        type: 'STATUS_CHANGE',
        title: `New Task Assigned: ${title}`,
        message: `You have been assigned a new task.${allDirectorDeps.length > 0 ? ` Steps needing director approval: ${stepDirectors.length}` : ''}`,
        receiverId: ownerId,
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Tasks POST error:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}

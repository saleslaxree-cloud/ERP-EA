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
        owner: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        workflow: { select: { id: true, title: true, status: true } },
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
    const { title, description, priority, ownerId, dueDate, workflowId, parentTaskId } = body

    if (!title || !ownerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const task = await db.task.create({
      data: {
        title,
        description: description || null,
        status: WorkflowStatus.PENDING,
        priority: (priority as TaskPriority) || TaskPriority.MEDIUM,
        ownerId,
        dueDate: dueDate ? new Date(dueDate) : null,
        workflowId: workflowId || null,
        parentTaskId: parentTaskId || null,
      },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    // Notify task owner
    await db.notification.create({
      data: {
        type: 'STATUS_CHANGE',
        title: `New Task Assigned: ${title}`,
        message: `You have been assigned a new task.`,
        receiverId: ownerId,
        workflowId: workflowId || null,
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Tasks POST error:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}

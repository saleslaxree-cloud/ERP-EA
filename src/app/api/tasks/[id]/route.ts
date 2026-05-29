import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { WorkflowStatus } from '@prisma/client'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const task = await db.task.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        workflow: { select: { id: true, title: true, status: true } },
        parentTask: {
          select: { id: true, title: true, status: true },
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
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Task GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    const task = await db.task.findUnique({
      where: { id },
      include: { dependencies: true },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check dependency resolution before allowing IN_PROGRESS
    if (status === WorkflowStatus.IN_PROGRESS) {
      const unmetDeps = task.dependencies.filter(
        (dep) => dep.dependsOnTaskId
      )

      if (unmetDeps.length > 0) {
        const depTasks = await db.task.findMany({
          where: { id: { in: unmetDeps.map((d) => d.dependsOnTaskId) } },
        })
        const incompleteDeps = depTasks.filter(
          (t) => t.status !== WorkflowStatus.COMPLETED
        )

        if (incompleteDeps.length > 0) {
          return NextResponse.json(
            {
              error: 'Cannot start task: dependencies not completed',
              dependencies: incompleteDeps.map((t) => ({
                id: t.id,
                title: t.title,
                status: t.status,
              })),
            },
            { status: 400 }
          )
        }
      }
    }

    const now = new Date()
    const updatedTask = await db.task.update({
      where: { id },
      data: {
        status: status as WorkflowStatus,
        ...(status === WorkflowStatus.COMPLETED ? { completedAt: now } : {}),
        updatedAt: now,
      },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error('Task PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

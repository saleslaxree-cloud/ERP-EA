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
        owner: { select: { id: true, name: true, email: true, role: true, department: true, avatar: true } },
        workflow: {
          select: { id: true, title: true, status: true, currentStepOrder: true },
          include: {
            steps: { orderBy: { order: 'asc' }, include: { assignee: { select: { id: true, name: true, role: true } } } },
          },
        },
        parentTask: { select: { id: true, title: true, status: true } },
        subTasks: {
          include: { owner: { select: { id: true, name: true, email: true, role: true } } },
        },
        dependencies: {
          include: { dependsOnTask: { select: { id: true, title: true, status: true } } },
        },
        dependents: {
          include: { task: { select: { id: true, title: true, status: true } } },
        },
        taskSteps: { orderBy: { order: 'asc' } },
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
    const { status, title, description, priority, department, category, dueDate, ownerId } = body

    const task = await db.task.findUnique({
      where: { id },
      include: { dependencies: true, workflow: { include: { steps: true } } },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check dependency resolution before allowing IN_PROGRESS
    if (status === WorkflowStatus.IN_PROGRESS) {
      const unmetDeps = task.dependencies.filter(dep => dep.dependsOnTaskId)
      if (unmetDeps.length > 0) {
        const depTasks = await db.task.findMany({
          where: { id: { in: unmetDeps.map(d => d.dependsOnTaskId) } },
        })
        const incompleteDeps = depTasks.filter(t => t.status !== WorkflowStatus.COMPLETED)
        if (incompleteDeps.length > 0) {
          return NextResponse.json(
            {
              error: 'Cannot start task: dependencies not completed',
              dependencies: incompleteDeps.map(t => ({ id: t.id, title: t.title, status: t.status })),
            },
            { status: 400 }
          )
        }
      }
    }

    const now = new Date()
    const updateData: Record<string, unknown> = { updatedAt: now }

    if (status !== undefined) {
      updateData.status = status as WorkflowStatus
      if (status === WorkflowStatus.COMPLETED) updateData.completedAt = now
      if (status === WorkflowStatus.CANCELLED) updateData.completedAt = now
    }
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (priority !== undefined) updateData.priority = priority
    if (department !== undefined) updateData.department = department
    if (category !== undefined) updateData.category = category
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
    if (ownerId !== undefined) updateData.ownerId = ownerId

    const updatedTask = await db.task.update({
      where: { id },
      data: updateData,
      include: {
        owner: { select: { id: true, name: true, email: true, role: true, department: true } },
        workflow: { select: { id: true, title: true, status: true } },
      },
    })

    // If cancelling and task has a workflow, cancel the workflow too
    if (status === WorkflowStatus.CANCELLED && task.workflowId) {
      await db.workflowInstance.update({
        where: { id: task.workflowId },
        data: { status: WorkflowStatus.CANCELLED },
      })
    }

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error('Task PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const task = await db.task.findUnique({
      where: { id },
      include: { workflow: true },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Delete related records first
    await db.taskStep.deleteMany({ where: { taskId: id } })
    await db.taskDependency.deleteMany({ where: { taskId: id } })
    await db.taskDependency.deleteMany({ where: { dependsOnTaskId: id } })

    // Delete the task
    await db.task.delete({ where: { id } })

    // If task had a workflow, cancel it
    if (task.workflowId) {
      await db.workflowInstance.update({
        where: { id: task.workflowId },
        data: { status: WorkflowStatus.CANCELLED },
      }).catch(() => {}) // ignore if workflow already deleted
    }

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('Task DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}

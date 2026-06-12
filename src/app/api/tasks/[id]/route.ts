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
        taskSteps: { orderBy: { order: 'asc' }, include: { assignee: { select: { id: true, name: true, role: true } } } },
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
    const { status, title, description, priority, department, category, dueDate, ownerId, frequency, weekDays, monthDates, reviseReason, reviseNextDate, score } = body

    const task = await db.task.findUnique({
      where: { id },
      include: { dependencies: true, workflow: true, owner: true },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const now = new Date()
    const updateData: Record<string, unknown> = { updatedAt: now }

    if (status !== undefined) {
      // Simplified status transitions - no workflow approval required
      if (status === WorkflowStatus.COMPLETED) {
        updateData.status = WorkflowStatus.COMPLETED
        updateData.completedAt = now

        // Auto-calculate performance score based on task completion
        // Score logic: On-time = 100, Due soon (within 2 days) = 70, Late = 40, No due date = 80
        if (score !== undefined) {
          updateData.score = score
        } else if (task.dueDate) {
          const dueDate = new Date(task.dueDate)
          const diffMs = dueDate.getTime() - now.getTime()
          const diffDays = diffMs / (1000 * 60 * 60 * 24)
          if (diffDays >= 0) {
            updateData.score = 100  // Completed on time
          } else if (diffDays >= -2) {
            updateData.score = 70   // Slightly late (within 2 days)
          } else {
            updateData.score = 40   // Significantly late
          }
        } else {
          updateData.score = 80  // No due date set
        }

        // If task has a workflow, mark it as COMPLETED too
        if (task.workflowId) {
          await db.workflowInstance.update({
            where: { id: task.workflowId },
            data: { status: WorkflowStatus.COMPLETED },
          }).catch(() => {})
        }
      } else if (status === WorkflowStatus.IN_PROGRESS) {
        // Allow transitioning to IN_PROGRESS from any status (for "Revise" functionality)
        updateData.status = WorkflowStatus.IN_PROGRESS
        // Clear completedAt if reopening
        if (task.status === WorkflowStatus.COMPLETED) {
          updateData.completedAt = null
          // Record revise metadata
          updateData.revisedAt = now
          if (reviseReason !== undefined) updateData.reviseReason = reviseReason
          if (reviseNextDate !== undefined) updateData.reviseNextDate = reviseNextDate ? new Date(reviseNextDate) : null
        }
      } else if (status === WorkflowStatus.CANCELLED) {
        updateData.status = WorkflowStatus.CANCELLED
        updateData.completedAt = now

        // Cancel linked workflow too
        if (task.workflowId) {
          await db.workflowInstance.update({
            where: { id: task.workflowId },
            data: { status: WorkflowStatus.CANCELLED },
          }).catch(() => {})
        }
      } else {
        updateData.status = status as WorkflowStatus
      }
    }

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (priority !== undefined) updateData.priority = priority
    if (department !== undefined) updateData.department = department
    if (category !== undefined) updateData.category = category
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
    if (ownerId !== undefined) updateData.ownerId = ownerId
    if (frequency !== undefined) updateData.frequency = frequency
    if (weekDays !== undefined) updateData.weekDays = weekDays
    if (monthDates !== undefined) updateData.monthDates = monthDates
    if (score !== undefined) updateData.score = score
    if (reviseReason !== undefined && status !== WorkflowStatus.IN_PROGRESS) updateData.reviseReason = reviseReason
    if (reviseNextDate !== undefined && status !== WorkflowStatus.IN_PROGRESS) updateData.reviseNextDate = reviseNextDate ? new Date(reviseNextDate) : null

    const updatedTask = await db.task.update({
      where: { id },
      data: updateData,
      include: {
        owner: { select: { id: true, name: true, email: true, role: true, department: true } },
        workflow: { select: { id: true, title: true, status: true } },
      },
    })

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
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('Task DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}

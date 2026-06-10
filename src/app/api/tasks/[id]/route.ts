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
    const { status, title, description, priority, department, category, dueDate, ownerId, frequency, weekDays, monthDates } = body

    const task = await db.task.findUnique({
      where: { id },
      include: { dependencies: true, workflow: { include: { steps: { orderBy: { order: 'asc' } } } }, owner: true },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const now = new Date()
    const updateData: Record<string, unknown> = { updatedAt: now }

    if (status !== undefined) {
      // ═══ INTERCEPT: Employee marks COMPLETED but workflow is APPROVED → Final Submit ═══
      if (status === WorkflowStatus.COMPLETED && task.workflowId && task.workflow) {
        const workflow = task.workflow

        if (workflow.status === WorkflowStatus.APPROVED) {
          // Final Submit - employee is submitting the fully approved task
          updateData.status = WorkflowStatus.COMPLETED
          updateData.completedAt = now

          // Mark the workflow as COMPLETED too
          await db.workflowInstance.update({
            where: { id: workflow.id },
            data: { status: WorkflowStatus.COMPLETED },
          })

          // Notify employee
          if (task.ownerId) {
            await db.notification.create({
              data: {
                type: 'APPROVED',
                title: `Task Completed: ${task.title}`,
                message: `Your task "${task.title}" has been fully completed through all review stages.`,
                senderId: task.ownerId,
                receiverId: task.ownerId,
                workflowId: workflow.id,
              },
            })
          }

          await db.statusHistory.create({
            data: {
              workflowId: workflow.id,
              fromStatus: WorkflowStatus.IN_PROGRESS,
              toStatus: WorkflowStatus.COMPLETED,
              changedBy: task.ownerId,
              reason: 'Employee did final submit after all approvals - task completed',
            },
          })
        } else {
          // Workflow is NOT yet APPROVED - don't allow direct completion
          // The workflow steps handle the progression
          return NextResponse.json({
            error: 'Task cannot be completed yet - workflow approval is still pending',
            currentWorkflowStatus: workflow.status,
          }, { status: 400 })
        }
      } else if (status === WorkflowStatus.COMPLETED && !task.workflowId) {
        // No workflow - just complete directly
        updateData.status = WorkflowStatus.COMPLETED
        updateData.completedAt = now
      } else {
        updateData.status = status as WorkflowStatus
        if (status === WorkflowStatus.CANCELLED) updateData.completedAt = now
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
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('Task DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}

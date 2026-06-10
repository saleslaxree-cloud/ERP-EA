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
    const { status, title, description, priority, department, category, dueDate, ownerId, frequency, weekDays, monthDates, taskStepId, taskStepStatus } = body

    const task = await db.task.findUnique({
      where: { id },
      include: { dependencies: true, workflow: { include: { steps: { orderBy: { order: 'asc' } } } }, owner: true },
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
    if (frequency !== undefined) updateData.frequency = frequency
    if (weekDays !== undefined) updateData.weekDays = weekDays
    if (monthDates !== undefined) updateData.monthDates = monthDates

    // Handle task step status update
    if (taskStepId && taskStepStatus) {
      await db.taskStep.update({
        where: { id: taskStepId },
        data: { status: taskStepStatus as WorkflowStatus, completedAt: taskStepStatus === 'COMPLETED' ? now : null },
      })
    }

    // ═══ WORKFLOW STEP ADVANCEMENT LOGIC ═══
    // When task status changes, advance the workflow steps accordingly
    if (status && task.workflowId && task.workflow) {
      const workflow = task.workflow

      if (status === WorkflowStatus.IN_PROGRESS) {
        // Employee started working → advance step 1 (Employee Task Completion) to IN_PROGRESS
        const employeeStep = workflow.steps.find(s => s.order === 1)
        if (employeeStep && employeeStep.status === WorkflowStatus.PENDING) {
          await db.stepInstance.update({
            where: { id: employeeStep.id },
            data: { status: WorkflowStatus.IN_PROGRESS, startedAt: now },
          })
        }
      }

      if (status === WorkflowStatus.ON_HOLD) {
        // EA sends task to Director → advance EA step to APPROVED, Director step to IN_REVIEW
        const eaStep = workflow.steps.find(s => s.name.includes('EA Review') && !s.name.includes('Final'))
        const directorStep = workflow.steps.find(s => s.name.includes('Director'))

        if (eaStep) {
          await db.stepInstance.update({
            where: { id: eaStep.id },
            data: { status: WorkflowStatus.APPROVED, completedAt: now },
          })
          // Create approval record
          const eaUser = await db.user.findFirst({ where: { role: 'EA', isActive: true } })
          if (eaUser) {
            await db.approval.create({
              data: {
                stepInstanceId: eaStep.id,
                workflowId: workflow.id,
                approverId: eaUser.id,
                action: WorkflowStatus.APPROVED,
                comments: 'EA verified and sent to Director',
                level: eaStep.order,
              },
            })
          }
        }

        if (directorStep) {
          // Find the right director based on task's directorDependency
          let directorAssigneeId = directorStep.assigneeId
          if (task.directorDependency) {
            try {
              const dirNames: string[] = JSON.parse(task.directorDependency)
              if (dirNames.length > 0) {
                const matchedDirector = await db.user.findFirst({
                  where: {
                    role: 'DIRECTOR',
                    isActive: true,
                    name: { contains: dirNames[0].replace(' Sir', '').replace(' sir', '') },
                  },
                })
                if (matchedDirector) directorAssigneeId = matchedDirector.id
              }
            } catch {}
          }
          // Fallback: find any active director if no assignee
          if (!directorAssigneeId) {
            const anyDirector = await db.user.findFirst({ where: { role: 'DIRECTOR', isActive: true } })
            if (anyDirector) directorAssigneeId = anyDirector.id
          }

          await db.stepInstance.update({
            where: { id: directorStep.id },
            data: {
              status: WorkflowStatus.IN_REVIEW,
              assigneeId: directorAssigneeId,
              startedAt: now,
            },
          })

          // Update workflow current step
          await db.workflowInstance.update({
            where: { id: workflow.id },
            data: { currentStepOrder: directorStep.order, status: WorkflowStatus.IN_REVIEW },
          })

          // Notify director
          if (directorAssigneeId) {
            await db.notification.create({
              data: {
                type: 'APPROVAL_REQUIRED',
                title: `Director Approval Required: ${task.title}`,
                message: `Task "${task.title}" has been verified by EA and requires your approval. Please review and approve or send back.`,
                senderId: task.ownerId,
                receiverId: directorAssigneeId,
                workflowId: workflow.id,
              },
            })
          }

          // Log status change
          await db.statusHistory.create({
            data: {
              workflowId: workflow.id,
              fromStatus: WorkflowStatus.PENDING,
              toStatus: WorkflowStatus.IN_REVIEW,
              changedBy: task.ownerId,
              reason: 'EA verified task and sent to Director for approval',
            },
          })
        }
      }

      if (status === WorkflowStatus.IN_REVIEW) {
        // Director approved → move to EA Final Review
        // This is handled when task comes back from director approval
      }
    }

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

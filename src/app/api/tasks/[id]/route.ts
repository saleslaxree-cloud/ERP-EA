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

    // ═══ INTERCEPT: Employee marks task COMPLETED but task has workflow ═══
    // Instead of completing directly, route to EA Review
    // Exception: If workflow is already APPROVED (EA Final approved), allow direct completion (Final Submit)
    if (status === WorkflowStatus.COMPLETED && task.workflowId && task.workflow) {
      const workflow = task.workflow

      // If workflow is APPROVED, the employee is doing a "Final Submit" — allow it
      if (workflow.status === WorkflowStatus.APPROVED) {
        // Mark the workflow as COMPLETED too
        await db.workflowInstance.update({
          where: { id: workflow.id },
          data: { status: WorkflowStatus.COMPLETED },
        })

        // Notify employee that task is fully complete
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
        // Workflow is NOT yet APPROVED — route to EA Review instead of completing
        // But only if the employee step hasn't already been completed (workflow still at early stage)
        const employeeStep = workflow.steps.find(s => s.order === 1)
        const eaReviewStep = workflow.steps.find(s => s.name.includes('EA Review') && !s.name.includes('Final'))

        // Only intercept if employee step is still PENDING or IN_PROGRESS (hasn't been completed yet)
        // If employee step is already COMPLETED/APPROVED, the workflow has progressed past this point
        if (employeeStep && eaReviewStep && (employeeStep.status === WorkflowStatus.PENDING || employeeStep.status === WorkflowStatus.IN_PROGRESS)) {
          // Complete employee step
          await db.stepInstance.update({
            where: { id: employeeStep.id },
            data: { status: WorkflowStatus.COMPLETED, completedAt: now },
          })

          // Activate EA Review step
          const eaUser = await db.user.findFirst({ where: { role: 'EA', isActive: true } })
          await db.stepInstance.update({
            where: { id: eaReviewStep.id },
            data: { status: WorkflowStatus.IN_REVIEW, assigneeId: eaUser?.id, startedAt: now },
          })

          // Update workflow
          await db.workflowInstance.update({
            where: { id: workflow.id },
            data: { currentStepOrder: eaReviewStep.order, status: WorkflowStatus.IN_REVIEW },
          })

          // Override: don't complete the task, put it in IN_REVIEW
          updateData.status = WorkflowStatus.IN_REVIEW
          delete updateData.completedAt

          // Notify EA
          if (eaUser) {
            await db.notification.create({
              data: {
                type: 'APPROVAL_REQUIRED',
                title: `Task Ready for Review: ${task.title}`,
                message: `Employee has completed their work on "${task.title}". Please review and verify.`,
                senderId: task.ownerId,
                receiverId: eaUser.id,
                workflowId: workflow.id,
              },
            })
          }

          // Log status change
          await db.statusHistory.create({
            data: {
              workflowId: workflow.id,
              fromStatus: WorkflowStatus.IN_PROGRESS,
              toStatus: WorkflowStatus.IN_REVIEW,
              changedBy: task.ownerId,
              reason: 'Employee completed work and submitted for EA review',
            },
          })
        }
      }
    }

    // ═══ INTERCEPT: Task goes to IN_REVIEW and workflow is at EA Final step ═══
    // This handles Director approval routing to EA Final Review
    if (status === WorkflowStatus.IN_REVIEW && task.workflowId && task.workflow) {
      const workflow = task.workflow
      const eaFinalStep = workflow.steps.find(s => s.name.includes('EA Final'))
      const directorStep = workflow.steps.find(s => s.name.includes('Director'))

      // If director step is IN_REVIEW (Director is approving now) or already APPROVED,
      // and EA Final is not yet active, mark Director as APPROVED and activate EA Final
      if (directorStep && (directorStep.status === WorkflowStatus.IN_REVIEW || directorStep.status === WorkflowStatus.APPROVED) && eaFinalStep && eaFinalStep.status === WorkflowStatus.PENDING) {
        // Mark Director step as APPROVED if it's currently IN_REVIEW
        if (directorStep.status === WorkflowStatus.IN_REVIEW) {
          await db.stepInstance.update({
            where: { id: directorStep.id },
            data: { status: WorkflowStatus.APPROVED, completedAt: now },
          })

          // Create approval record for Director
          await db.approval.create({
            data: {
              stepInstanceId: directorStep.id,
              workflowId: workflow.id,
              approverId: directorStep.assigneeId || task.ownerId,
              action: WorkflowStatus.APPROVED,
              comments: 'Director approved and sent to EA Final Review',
              level: directorStep.order,
            },
          })
        }

        // Activate EA Final step
        const eaUser = await db.user.findFirst({ where: { role: 'EA', isActive: true } })
        await db.stepInstance.update({
          where: { id: eaFinalStep.id },
          data: { status: WorkflowStatus.IN_REVIEW, assigneeId: eaUser?.id, startedAt: now },
        })

        await db.workflowInstance.update({
          where: { id: workflow.id },
          data: { currentStepOrder: eaFinalStep.order, status: WorkflowStatus.IN_REVIEW },
        })

        // Notify EA for final review
        if (eaUser) {
          await db.notification.create({
            data: {
              type: 'APPROVAL_REQUIRED',
              title: `Final Review Required: ${task.title}`,
              message: `Director has approved "${task.title}". Please do final review and submit.`,
              senderId: task.ownerId,
              receiverId: eaUser.id,
              workflowId: workflow.id,
            },
          })
        }

        await db.statusHistory.create({
          data: {
            workflowId: workflow.id,
            fromStatus: WorkflowStatus.ON_HOLD,
            toStatus: WorkflowStatus.IN_REVIEW,
            changedBy: directorStep.assigneeId || task.ownerId,
            reason: 'Director approved - routed to EA Final Review',
          },
        })
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

      // IN_REVIEW logic is handled above in the intercept section

      if (status === WorkflowStatus.PENDING && task.status === WorkflowStatus.ON_HOLD) {
        // Director rejected the task → send back to employee as PENDING
        const directorStep = workflow.steps.find(s => s.name.includes('Director'))
        const employeeStep = workflow.steps.find(s => s.order === 1)

        if (directorStep && directorStep.status === WorkflowStatus.IN_REVIEW) {
          // Mark Director step as REJECTED
          await db.stepInstance.update({
            where: { id: directorStep.id },
            data: { status: WorkflowStatus.REJECTED, completedAt: now },
          })

          // Create rejection approval record
          await db.approval.create({
            data: {
              stepInstanceId: directorStep.id,
              workflowId: workflow.id,
              approverId: directorStep.assigneeId || task.ownerId,
              action: WorkflowStatus.REJECTED,
              comments: 'Director rejected - task returned to employee for redo',
              level: directorStep.order,
            },
          })
        }

        // Reset employee step so they can redo their work
        if (employeeStep) {
          await db.stepInstance.update({
            where: { id: employeeStep.id },
            data: { status: WorkflowStatus.PENDING, startedAt: null, completedAt: null },
          })
        }

        // Update workflow status
        await db.workflowInstance.update({
          where: { id: workflow.id },
          data: { status: WorkflowStatus.REJECTED, currentStepOrder: 1 },
        })

        // Notify employee
        if (task.ownerId) {
          await db.notification.create({
            data: {
              type: 'REJECTED',
              title: `Task Returned: ${task.title}`,
              message: `Director has rejected your task. Please redo and resubmit your work.`,
              senderId: directorStep?.assigneeId || task.ownerId,
              receiverId: task.ownerId,
              workflowId: workflow.id,
            },
          })
        }

        // Log status change
        await db.statusHistory.create({
          data: {
            workflowId: workflow.id,
            fromStatus: WorkflowStatus.ON_HOLD,
            toStatus: WorkflowStatus.PENDING,
            changedBy: directorStep?.assigneeId || task.ownerId,
            reason: 'Director rejected task - returned to employee for redo',
          },
        })
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

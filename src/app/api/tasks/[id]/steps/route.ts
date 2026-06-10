import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { WorkflowStatus } from '@prisma/client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    const body = await request.json()
    const { stepId, action } = body

    if (!stepId) {
      return NextResponse.json({ error: 'stepId is required' }, { status: 400 })
    }

    const step = await db.taskStep.findUnique({
      where: { id: stepId },
    })

    if (!step || step.taskId !== taskId) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 })
    }

    const now = new Date()

    if (action === 'complete') {
      const updatedStep = await db.taskStep.update({
        where: { id: stepId },
        data: {
          status: WorkflowStatus.COMPLETED,
          completedAt: now,
        },
      })

      // Check if all steps are completed
      const allSteps = await db.taskStep.findMany({ where: { taskId } })
      const allDone = allSteps.every(s => s.status === WorkflowStatus.COMPLETED)

      if (allDone) {
        // Check if the task has a workflow - if so, trigger workflow instead of completing
        const task = await db.task.findUnique({
          where: { id: taskId },
          include: { workflow: { include: { steps: { orderBy: { order: 'asc' } } } }, owner: true },
        })

        if (task?.workflowId && task.workflow) {
          // If workflow is already APPROVED, the employee is doing a "Final Submit" — allow completion
          if (task.workflow.status === WorkflowStatus.APPROVED) {
            await db.task.update({
              where: { id: taskId },
              data: {
                status: WorkflowStatus.COMPLETED,
                completedAt: now,
              },
            })
            // Mark workflow as COMPLETED
            await db.workflowInstance.update({
              where: { id: task.workflow.id },
              data: { status: WorkflowStatus.COMPLETED },
            })
          } else {
            // Workflow is NOT yet APPROVED — route to EA Review instead of completing
            const workflow = task.workflow
            const employeeStep = workflow.steps.find(s => s.order === 1)
            const eaReviewStep = workflow.steps.find(s => s.name.includes('EA Review') && !s.name.includes('Final'))

            // Only intercept if employee step is still PENDING or IN_PROGRESS (hasn't been completed yet)
            if (employeeStep && eaReviewStep && (employeeStep.status === WorkflowStatus.PENDING || employeeStep.status === WorkflowStatus.IN_PROGRESS)) {
              // Complete employee workflow step
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

              // Set task to IN_REVIEW (not COMPLETED)
              await db.task.update({
                where: { id: taskId },
                data: { status: WorkflowStatus.IN_REVIEW, updatedAt: now },
              })

              // Notify EA
              if (eaUser) {
                await db.notification.create({
                  data: {
                    type: 'APPROVAL_REQUIRED',
                    title: `Task Ready for Review: ${task.title}`,
                    message: `Employee has completed all steps on "${task.title}". Please review and verify.`,
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
                  reason: 'Employee completed all task steps and submitted for EA review',
                },
              })
            } else {
              // No EA Review step found - fall back to completing the task
              await db.task.update({
                where: { id: taskId },
                data: {
                  status: WorkflowStatus.COMPLETED,
                  completedAt: now,
                },
              })
            }
          }
        } else {
          // No workflow - mark the task as completed normally
          await db.task.update({
            where: { id: taskId },
            data: {
              status: WorkflowStatus.COMPLETED,
              completedAt: now,
            },
          })
        }
      }

      return NextResponse.json({ step: updatedStep, allDone })
    }

    if (action === 'reopen') {
      const updatedStep = await db.taskStep.update({
        where: { id: stepId },
        data: {
          status: WorkflowStatus.PENDING,
          completedAt: null,
        },
      })

      // If task was completed, move it back to in progress
      const task = await db.task.findUnique({ where: { id: taskId } })
      if (task?.status === WorkflowStatus.COMPLETED) {
        await db.task.update({
          where: { id: taskId },
          data: { status: WorkflowStatus.IN_PROGRESS, completedAt: null },
        })
      }

      return NextResponse.json({ step: updatedStep })
    }

    return NextResponse.json({ error: 'Invalid action. Use "complete" or "reopen"' }, { status: 400 })
  } catch (error) {
    console.error('Task step PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update step' }, { status: 500 })
  }
}

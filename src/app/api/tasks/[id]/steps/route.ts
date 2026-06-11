import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { WorkflowStatus, StepType } from '@prisma/client'

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
      // Auto-start the task if it's still PENDING
      const currentTask = await db.task.findUnique({ where: { id: taskId } })
      if (currentTask?.status === WorkflowStatus.PENDING) {
        await db.task.update({
          where: { id: taskId },
          data: { status: WorkflowStatus.IN_PROGRESS },
        })
      }

      // Complete this step
      const updatedStep = await db.taskStep.update({
        where: { id: stepId },
        data: {
          status: WorkflowStatus.COMPLETED,
          completedAt: now,
        },
      })

      // Check if this step needs director approval
      if (step.needsDirectorApproval) {
        // Find or create a workflow for this task
        const task = await db.task.findUnique({
          where: { id: taskId },
          include: { owner: true },
        })

        if (!task) {
          return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }

        // Find EA user
        const eaUser = await db.user.findFirst({ where: { role: 'EA', isActive: true } })

        // Find director user based on step's directorName
        let directorUser = await db.user.findFirst({ where: { role: 'DIRECTOR', isActive: true } })
        if (step.directorName) {
          const matchedDirector = await db.user.findFirst({
            where: {
              role: 'DIRECTOR',
              isActive: true,
              name: { contains: step.directorName.replace(' Sir', '').replace(' sir', '') },
            },
          })
          if (matchedDirector) directorUser = matchedDirector
        }

        // Check if workflow already exists for this task
        let workflow = task.workflowId ? await db.workflowInstance.findUnique({
          where: { id: task.workflowId },
          include: { steps: { orderBy: { order: 'asc' } } },
        }) : null

        if (!workflow) {
          // Create the workflow template if it doesn't exist
          let template = await db.workflowTemplate.findFirst({
            where: { id: 'tpl-task' },
            include: { steps: true },
          })

          if (!template) {
            template = await db.workflowTemplate.create({
              data: {
                id: 'tpl-task',
                name: 'Task Approval Workflow',
                description: 'Standard approval: Employee → EA → Director → EA Final Review',
                category: 'Operations',
                isActive: true,
                steps: {
                  create: [
                    { id: 'step-task-1', name: 'Employee Task Completion', stepType: StepType.NOTIFICATION, order: 1, assigneeRole: 'EMPLOYEE', approvalLevel: 1, slaHours: 72 },
                    { id: 'step-task-2', name: 'EA Review & Verification', stepType: StepType.APPROVAL, order: 2, assigneeRole: 'EA', approvalLevel: 2, slaHours: 48 },
                    { id: 'step-task-3', name: 'Director Approval', stepType: StepType.APPROVAL, order: 3, assigneeRole: 'DIRECTOR', approvalLevel: 3, slaHours: 72 },
                    { id: 'step-task-4', name: 'EA Final Review & Submit', stepType: StepType.APPROVAL, order: 4, assigneeRole: 'EA', approvalLevel: 2, slaHours: 24 },
                  ],
                },
              },
              include: { steps: true },
            })
          }

          // Create the workflow instance
          workflow = await db.workflowInstance.create({
            data: {
              templateId: template.id,
              title: `[Task] ${task.title}`,
              description: `Auto-created approval workflow for task: ${task.title}`,
              status: WorkflowStatus.PENDING,
              priority: task.priority,
              currentStepOrder: 1,
              creatorId: task.ownerId,
              dueDate: task.dueDate,
              steps: {
                create: [
                  {
                    stepTemplateId: template.steps[0]?.id || 'step-task-1',
                    name: 'Employee Task Completion',
                    stepType: StepType.NOTIFICATION,
                    order: 1,
                    status: WorkflowStatus.COMPLETED,
                    assigneeId: task.ownerId,
                    startedAt: now,
                    completedAt: now,
                    slaDeadline: new Date(now.getTime() + 72 * 60 * 60 * 1000),
                  },
                  {
                    stepTemplateId: template.steps[1]?.id || 'step-task-2',
                    name: 'EA Review & Verification',
                    stepType: StepType.APPROVAL,
                    order: 2,
                    status: WorkflowStatus.IN_REVIEW,
                    assigneeId: eaUser?.id || null,
                    startedAt: now,
                    slaDeadline: new Date(now.getTime() + 48 * 60 * 60 * 1000),
                  },
                  {
                    stepTemplateId: template.steps[2]?.id || 'step-task-3',
                    name: 'Director Approval',
                    stepType: StepType.APPROVAL,
                    order: 3,
                    status: WorkflowStatus.PENDING,
                    assigneeId: directorUser?.id || null,
                    slaDeadline: new Date(now.getTime() + (48 + 72) * 60 * 60 * 1000),
                  },
                  {
                    stepTemplateId: template.steps[3]?.id || 'step-task-4',
                    name: 'EA Final Review & Submit',
                    stepType: StepType.APPROVAL,
                    order: 4,
                    status: WorkflowStatus.PENDING,
                    assigneeId: eaUser?.id || null,
                    slaDeadline: new Date(now.getTime() + (48 + 72 + 24) * 60 * 60 * 1000),
                  },
                ],
              },
            },
            include: { steps: { orderBy: { order: 'asc' } } },
          })

          // Link workflow to task
          await db.task.update({
            where: { id: taskId },
            data: {
              workflowId: workflow.id,
              status: WorkflowStatus.IN_REVIEW,
              directorDependency: step.directorName ? JSON.stringify([step.directorName]) : null,
            },
          })

          // Notify EA
          if (eaUser) {
            await db.notification.create({
              data: {
                type: 'APPROVAL_REQUIRED',
                title: `Task Needs EA Review: ${task.title}`,
                message: `Employee completed step "${step.title}" which requires director approval. Please review and send to ${directorUser?.name || 'Director'}.`,
                senderId: task.ownerId,
                receiverId: eaUser.id,
                workflowId: workflow.id,
              },
            })
          }

          // Notify Director
          if (directorUser) {
            await db.notification.create({
              data: {
                type: 'APPROVAL_REQUIRED',
                title: `Director Approval Will Be Needed: ${task.title}`,
                message: `Task "${task.title}" requires your approval. You will be notified when EA sends it to you.`,
                senderId: task.ownerId,
                receiverId: directorUser.id,
                workflowId: workflow.id,
              },
            })
          }

          // Log
          await db.statusHistory.create({
            data: {
              workflowId: workflow.id,
              fromStatus: WorkflowStatus.DRAFT,
              toStatus: WorkflowStatus.IN_REVIEW,
              changedBy: task.ownerId,
              reason: `Step "${step.title}" needs director approval - auto-routed to EA Review → Director → EA Final`,
            },
          })
        } else {
          // Workflow already exists - just make sure it's at the right state
          // The employee step should be completed, activate EA Review
          const eaReviewStep = workflow.steps.find(s => s.name.includes('EA Review') && !s.name.includes('Final'))

          if (eaReviewStep && eaReviewStep.status === WorkflowStatus.PENDING) {
            await db.stepInstance.update({
              where: { id: eaReviewStep.id },
              data: {
                status: WorkflowStatus.IN_REVIEW,
                assigneeId: eaUser?.id,
                startedAt: now,
              },
            })

            await db.workflowInstance.update({
              where: { id: workflow.id },
              data: { currentStepOrder: eaReviewStep.order, status: WorkflowStatus.IN_REVIEW },
            })
          }

          // Update task status
          await db.task.update({
            where: { id: taskId },
            data: { status: WorkflowStatus.IN_REVIEW },
          })

          // Notify EA
          if (eaUser) {
            await db.notification.create({
              data: {
                type: 'APPROVAL_REQUIRED',
                title: `Task Step Needs Review: ${task.title}`,
                message: `Employee completed step "${step.title}" which needs director approval. Please verify and send to director.`,
                senderId: task.ownerId,
                receiverId: eaUser.id,
                workflowId: workflow.id,
              },
            })
          }
        }

        return NextResponse.json({
          step: updatedStep,
          routedToApproval: true,
          message: 'Step completed and routed to EA Review for director approval',
        })
      }

      // Step does NOT need director approval - check if all steps are done
      const allSteps = await db.taskStep.findMany({ where: { taskId } })
      const allDone = allSteps.every(s => s.status === WorkflowStatus.COMPLETED)

      if (allDone) {
        const task = await db.task.findUnique({
          where: { id: taskId },
          include: { workflow: { include: { steps: { orderBy: { order: 'asc' } } } }, owner: true },
        })

        if (task?.workflowId && task.workflow) {
          // Task has a workflow - check if it's been approved
          if (task.workflow.status === WorkflowStatus.APPROVED) {
            // Final submit - complete the task
            await db.task.update({
              where: { id: taskId },
              data: { status: WorkflowStatus.COMPLETED, completedAt: now },
            })
            await db.workflowInstance.update({
              where: { id: task.workflow.id },
              data: { status: WorkflowStatus.COMPLETED },
            })
          } else {
            // Workflow exists but not yet approved - task stays in current review state
            // Don't change task status, workflow is handling it
          }
        } else {
          // No workflow at all - just complete the task
          await db.task.update({
            where: { id: taskId },
            data: { status: WorkflowStatus.COMPLETED, completedAt: now },
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

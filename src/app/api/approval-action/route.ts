import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { WorkflowStatus } from '@prisma/client'

// POST /api/approval-action - Handle approval actions for workflow steps
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workflowId, stepInstanceId, action, comments, approverId } = body

    if (!workflowId || !stepInstanceId || !action || !approverId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const workflow = await db.workflowInstance.findUnique({
      where: { id: workflowId },
      include: { steps: { orderBy: { order: 'asc' } }, tasks: true },
    })

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    const stepInstance = await db.stepInstance.findUnique({
      where: { id: stepInstanceId },
    })

    if (!stepInstance) {
      return NextResponse.json({ error: 'Step instance not found' }, { status: 404 })
    }

    const now = new Date()

    if (action === 'APPROVE') {
      // Mark current step as approved
      await db.stepInstance.update({
        where: { id: stepInstanceId },
        data: {
          status: WorkflowStatus.APPROVED,
          completedAt: now,
        },
      })

      // Create approval record
      await db.approval.create({
        data: {
          stepInstanceId,
          workflowId,
          approverId,
          action: WorkflowStatus.APPROVED,
          comments: comments || 'Approved',
          level: stepInstance.order,
        },
      })

      // Move to next step
      const nextOrder = stepInstance.order + 1
      const nextStep = workflow.steps.find(s => s.order === nextOrder)

      if (nextStep) {
        // Update next step to in progress/review
        await db.stepInstance.update({
          where: { id: nextStep.id },
          data: {
            status: nextStep.stepType === 'APPROVAL' ? WorkflowStatus.IN_REVIEW : WorkflowStatus.IN_PROGRESS,
            startedAt: now,
          },
        })

        // Update workflow current step
        await db.workflowInstance.update({
          where: { id: workflowId },
          data: { currentStepOrder: nextOrder },
        })

        // Notify next assignee
        if (nextStep.assigneeId) {
          await db.notification.create({
            data: {
              type: 'APPROVAL_REQUIRED',
              title: `Action Required: ${nextStep.name}`,
              message: `Step "${nextStep.name}" in workflow "${workflow.title}" is now ready for your review. Previous step was approved.`,
              senderId: approverId,
              receiverId: nextStep.assigneeId,
              workflowId,
            },
          })
        }

        // Update task status based on current step
        const task = workflow.tasks[0]
        if (task) {
          if (nextStep.name.includes('Director')) {
            await db.task.update({ where: { id: task.id }, data: { status: WorkflowStatus.IN_REVIEW } })
          } else if (nextStep.name.includes('EA Final')) {
            await db.task.update({ where: { id: task.id }, data: { status: WorkflowStatus.IN_REVIEW } })
          }
        }
      } else {
        // No more steps - workflow completed
        await db.workflowInstance.update({
          where: { id: workflowId },
          data: { status: WorkflowStatus.COMPLETED },
        })

        // Complete the associated task
        const task = workflow.tasks[0]
        if (task) {
          await db.task.update({
            where: { id: task.id },
            data: { status: WorkflowStatus.COMPLETED, completedAt: now },
          })
        }

        // Notify creator
        await db.notification.create({
          data: {
            type: 'APPROVED',
            title: `Workflow Completed: ${workflow.title}`,
            message: `All approval steps have been completed. Task is now marked as completed.`,
            senderId: approverId,
            receiverId: workflow.creatorId,
            workflowId,
          },
        })
      }

      // Create status history
      await db.statusHistory.create({
        data: {
          workflowId,
          fromStatus: stepInstance.status,
          toStatus: WorkflowStatus.APPROVED,
          changedBy: approverId,
          reason: comments || `Step ${stepInstance.order} approved`,
        },
      })

    } else if (action === 'REJECT') {
      // Mark current step as rejected
      await db.stepInstance.update({
        where: { id: stepInstanceId },
        data: {
          status: WorkflowStatus.REJECTED,
          completedAt: now,
        },
      })

      // Create approval record
      await db.approval.create({
        data: {
          stepInstanceId,
          workflowId,
          approverId,
          action: WorkflowStatus.REJECTED,
          comments: comments || 'Rejected',
          level: stepInstance.order,
        },
      })

      // Update workflow status
      await db.workflowInstance.update({
        where: { id: workflowId },
        data: { status: WorkflowStatus.REJECTED },
      })

      // Update task status
      const task = workflow.tasks[0]
      if (task) {
        await db.task.update({
          where: { id: task.id },
          data: { status: WorkflowStatus.REJECTED },
        })
      }

      // Notify creator
      await db.notification.create({
        data: {
          type: 'REJECTED',
          title: `Workflow Rejected: ${workflow.title}`,
          message: `Step "${stepInstance.name}" was rejected. Reason: ${comments || 'No reason provided'}`,
          senderId: approverId,
          receiverId: workflow.creatorId,
          workflowId,
        },
      })

      // Create status history
      await db.statusHistory.create({
        data: {
          workflowId,
          fromStatus: stepInstance.status,
          toStatus: WorkflowStatus.REJECTED,
          changedBy: approverId,
          reason: comments || `Step ${stepInstance.order} rejected`,
        },
      })

    } else if (action === 'SEND_BACK') {
      // Send back to previous step (e.g., Director sends back to EA)
      const prevOrder = stepInstance.order - 1
      const prevStep = workflow.steps.find(s => s.order === prevOrder)

      if (prevStep) {
        // Reset current step
        await db.stepInstance.update({
          where: { id: stepInstanceId },
          data: {
            status: WorkflowStatus.PENDING,
            completedAt: null,
          },
        })

        // Reactivate previous step
        await db.stepInstance.update({
          where: { id: prevStep.id },
          data: {
            status: WorkflowStatus.IN_REVIEW,
            startedAt: now,
          },
        })

        // Update workflow current step
        await db.workflowInstance.update({
          where: { id: workflowId },
          data: { currentStepOrder: prevOrder },
        })

        // Notify previous assignee
        if (prevStep.assigneeId) {
          await db.notification.create({
            data: {
              type: 'STATUS_CHANGE',
              title: `Task Returned: ${workflow.title}`,
              message: `Director has completed their review and sent the task back. Director remarks: ${comments || 'No comments'}. Please review and finalize.`,
              senderId: approverId,
              receiverId: prevStep.assigneeId,
              workflowId,
            },
          })
        }

        // Create status history
        await db.statusHistory.create({
          data: {
            workflowId,
            fromStatus: stepInstance.status,
            toStatus: WorkflowStatus.IN_REVIEW,
            changedBy: approverId,
            reason: `Director completed review, sent back to EA. Comments: ${comments || 'None'}`,
          },
        })
      }
    }

    return NextResponse.json({ success: true, action, workflowId })
  } catch (error) {
    console.error('Approval action error:', error)
    return NextResponse.json({ error: 'Failed to process approval action' }, { status: 500 })
  }
}

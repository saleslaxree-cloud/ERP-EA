import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { WorkflowStatus, TaskPriority, StepType } from '@prisma/client'

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
        owner: { select: { id: true, name: true, email: true, role: true, department: true, avatar: true } },
        workflow: { select: { id: true, title: true, status: true } },
        taskSteps: { orderBy: { order: 'asc' }, include: { assignee: { select: { id: true, name: true, role: true } } } },
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
    const {
      title, description, priority, ownerId, dueDate, workflowId, parentTaskId,
      department, category,
      departmentDependencies = [],
      directorDependencies = [],
      workflowTemplateId,
      frequency, weekDays, monthDates,
    } = body

    if (!title || !ownerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Find EA user for approval flow
    const eaUsers = await db.user.findMany({ where: { role: 'EA', isActive: true } })
    const eaUser = eaUsers[0]

    // Find director users for director dependencies
    const directorUsers = await db.user.findMany({ where: { role: 'DIRECTOR', isActive: true } })

    // Determine if we need a workflow (has dependencies or explicit template)
    const needsWorkflow = departmentDependencies.length > 0 || directorDependencies.length > 0 || workflowTemplateId
    let createdWorkflowId = workflowId || null

    // If dependencies are selected, auto-create workflow
    if (needsWorkflow && !createdWorkflowId) {
      // Find or create the Task Approval Workflow template
      let template = await db.workflowTemplate.findFirst({
        where: { id: 'tpl-task' },
        include: { steps: true },
      })

      if (!template) {
        // Create the template if it doesn't exist
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

      // Find the appropriate director for the workflow
      let directorForWorkflow = directorUsers[0]
      if (directorDependencies.length > 0) {
        // Match by name
        const matchedDirector = directorUsers.find(d =>
          directorDependencies.some((dep: string) => d.name.toLowerCase().includes(dep.toLowerCase().replace(' sir', '')))
        )
        if (matchedDirector) directorForWorkflow = matchedDirector
      }

      // Create workflow instance
      const now = new Date()
      const workflow = await db.workflowInstance.create({
        data: {
          templateId: template.id,
          title: `[Task] ${title}`,
          description: `Auto-created approval workflow for task: ${title}${departmentDependencies.length > 0 ? `\nDept Dependencies: ${departmentDependencies.join(', ')}` : ''}${directorDependencies.length > 0 ? `\nDirector Dependencies: ${directorDependencies.join(', ')}` : ''}`,
          status: WorkflowStatus.PENDING,
          priority: (priority as TaskPriority) || TaskPriority.MEDIUM,
          currentStepOrder: 1,
          creatorId: ownerId,
          dueDate: dueDate ? new Date(dueDate) : null,
          steps: {
            create: [
              {
                stepTemplateId: template.steps[0]?.id || 'step-task-1',
                name: 'Employee Task Completion',
                stepType: StepType.NOTIFICATION,
                order: 1,
                status: WorkflowStatus.IN_PROGRESS,
                assigneeId: ownerId,
                startedAt: now,
                slaDeadline: new Date(now.getTime() + 72 * 60 * 60 * 1000),
              },
              {
                stepTemplateId: template.steps[1]?.id || 'step-task-2',
                name: 'EA Review & Verification',
                stepType: StepType.APPROVAL,
                order: 2,
                status: WorkflowStatus.PENDING,
                assigneeId: eaUser?.id || null,
                slaDeadline: new Date(now.getTime() + (72 + 48) * 60 * 60 * 1000),
              },
              {
                stepTemplateId: template.steps[2]?.id || 'step-task-3',
                name: 'Director Approval',
                stepType: StepType.APPROVAL,
                order: 3,
                status: WorkflowStatus.PENDING,
                assigneeId: directorForWorkflow?.id || null,
                slaDeadline: new Date(now.getTime() + (72 + 48 + 72) * 60 * 60 * 1000),
              },
              {
                stepTemplateId: template.steps[3]?.id || 'step-task-4',
                name: 'EA Final Review & Submit',
                stepType: StepType.APPROVAL,
                order: 4,
                status: WorkflowStatus.PENDING,
                assigneeId: eaUser?.id || null,
                slaDeadline: new Date(now.getTime() + (72 + 48 + 72 + 24) * 60 * 60 * 1000),
              },
            ],
          },
        },
      })

      createdWorkflowId = workflow.id

      // Notify EA about the pending review
      if (eaUser) {
        await db.notification.create({
          data: {
            type: 'APPROVAL_REQUIRED',
            title: `New Task Needs EA Review: ${title}`,
            message: `Task "${title}" has been created with department/director dependencies and requires your review after employee completion.${directorDependencies.length > 0 ? ` Directors involved: ${directorDependencies.join(', ')}` : ''}`,
            senderId: ownerId,
            receiverId: eaUser.id,
            workflowId: workflow.id,
          },
        })
      }

      // Notify directors if specified
      if (directorDependencies.length > 0) {
        for (const dirName of directorDependencies) {
          const matchedDirector = directorUsers.find(d =>
            d.name.toLowerCase().includes(dirName.toLowerCase().replace(' sir', ''))
          )
          if (matchedDirector) {
            await db.notification.create({
              data: {
                type: 'APPROVAL_REQUIRED',
                title: `Director Approval Required: ${title}`,
                message: `Task "${title}" requires your approval as a director dependency. You will be notified when it reaches your review stage.`,
                senderId: ownerId,
                receiverId: matchedDirector.id,
                workflowId: workflow.id,
              },
            })
          }
        }
      }

      // Create status history
      await db.statusHistory.create({
        data: {
          workflowId: workflow.id,
          fromStatus: WorkflowStatus.DRAFT,
          toStatus: WorkflowStatus.PENDING,
          changedBy: ownerId,
          reason: `Task created with dependencies - Dept: [${departmentDependencies.join(', ')}] Directors: [${directorDependencies.join(', ')}]`,
        },
      })
    } else if (workflowTemplateId) {
      // Use selected workflow template
      const template = await db.workflowTemplate.findUnique({
        where: { id: workflowTemplateId },
        include: { steps: { orderBy: { order: 'asc' } } },
      })

      if (template) {
        const now = new Date()
        const stepsData = template.steps.map((step, idx) => ({
          stepTemplateId: step.id,
          name: step.name,
          stepType: step.stepType,
          order: step.order,
          status: idx === 0 ? WorkflowStatus.IN_PROGRESS : WorkflowStatus.PENDING,
          assigneeId: idx === 0 ? ownerId : step.assigneeRole === 'EA' ? eaUser?.id || null
            : step.assigneeRole === 'DIRECTOR' ? directorUsers[0]?.id || null
            : null,
          startedAt: idx === 0 ? now : null,
          slaDeadline: step.slaHours ? new Date(now.getTime() + step.slaHours * 60 * 60 * 1000) : null,
        }))

        const workflow = await db.workflowInstance.create({
          data: {
            templateId: template.id,
            title: `[Task] ${title}`,
            description: `Workflow for task: ${title}`,
            status: WorkflowStatus.PENDING,
            priority: (priority as TaskPriority) || TaskPriority.MEDIUM,
            currentStepOrder: 1,
            creatorId: ownerId,
            dueDate: dueDate ? new Date(dueDate) : null,
            steps: { create: stepsData },
          },
        })

        createdWorkflowId = workflow.id
      }
    }

    // Parse taskSteps from body
    const taskStepsData = body.taskSteps || []

    // Create the task
    const task = await db.task.create({
      data: {
        title,
        description: description || null,
        status: needsWorkflow ? WorkflowStatus.IN_PROGRESS : WorkflowStatus.PENDING,
        priority: (priority as TaskPriority) || TaskPriority.MEDIUM,
        ownerId,
        department: department || null,
        category: category || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        workflowId: createdWorkflowId,
        parentTaskId: parentTaskId || null,
        taskSteps: {
          create: taskStepsData.map((step: { title: string; order: number; directorName?: string | null; directorNote?: string | null }) => ({
            title: step.title,
            status: WorkflowStatus.PENDING,
            order: step.order || 0,
          })),
        },
      },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true, department: true } },
        workflow: { select: { id: true, title: true, status: true } },
        taskSteps: { orderBy: { order: 'asc' } },
      },
    })

    // If taskSteps have directorName, add to directorDependencies if not already present
    const stepDirectors = taskStepsData
      .filter((step: { directorName?: string | null }) => step.directorName)
      .map((step: { directorName?: string | null }) => step.directorName)
      .filter(Boolean)

    if (stepDirectors.length > 0 && !needsWorkflow) {
      // Create a simple workflow even if no explicit dependencies were set
      // because steps have director assignments
    }

    // Notify task owner
    await db.notification.create({
      data: {
        type: 'STATUS_CHANGE',
        title: `New Task Assigned: ${title}`,
        message: `You have been assigned a new task.${needsWorkflow ? ' This task has an approval workflow attached.' : ''}`,
        receiverId: ownerId,
        workflowId: createdWorkflowId || null,
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Tasks POST error:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}

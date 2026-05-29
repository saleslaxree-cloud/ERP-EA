import { PrismaClient, UserRole, WorkflowStatus, StepType, TaskPriority, NotificationType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clean existing data
  await prisma.comment.deleteMany()
  await prisma.statusHistory.deleteMany()
  await prisma.escalationLog.deleteMany()
  await prisma.taskDependency.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.approval.deleteMany()
  await prisma.task.deleteMany()
  await prisma.stepInstance.deleteMany()
  await prisma.workflowInstance.deleteMany()
  await prisma.stepTemplate.deleteMany()
  await prisma.workflowTemplate.deleteMany()
  await prisma.department.deleteMany()
  await prisma.delegation.deleteMany()
  await prisma.user.deleteMany()

  // Create Users
  const admin = await prisma.user.create({
    data: { id: 'user-admin', email: 'admin@workflowpro.com', name: 'Sarah Chen', role: UserRole.ADMIN, department: 'IT', isActive: true }
  })
  const director1 = await prisma.user.create({
    data: { id: 'user-dir1', email: 'robert.kim@workflowpro.com', name: 'Robert Kim', role: UserRole.DIRECTOR, department: 'Finance', isActive: true }
  })
  const director2 = await prisma.user.create({
    data: { id: 'user-dir2', email: 'maria.garcia@workflowpro.com', name: 'Maria Garcia', role: UserRole.DIRECTOR, department: 'Operations', isActive: true }
  })
  const ea1 = await prisma.user.create({
    data: { id: 'user-ea1', email: 'james.wilson@workflowpro.com', name: 'James Wilson', role: UserRole.EA, department: 'Finance', isActive: true }
  })
  const ea2 = await prisma.user.create({
    data: { id: 'user-ea2', email: 'lisa.thompson@workflowpro.com', name: 'Lisa Thompson', role: UserRole.EA, department: 'Operations', isActive: true }
  })
  const manager1 = await prisma.user.create({
    data: { id: 'user-mgr1', email: 'david.brown@workflowpro.com', name: 'David Brown', role: UserRole.MANAGER, department: 'Engineering', isActive: true }
  })
  const manager2 = await prisma.user.create({
    data: { id: 'user-mgr2', email: 'emily.davis@workflowpro.com', name: 'Emily Davis', role: UserRole.MANAGER, department: 'Marketing', isActive: true }
  })
  const employee1 = await prisma.user.create({
    data: { id: 'user-emp1', email: 'alex.johnson@workflowpro.com', name: 'Alex Johnson', role: UserRole.EMPLOYEE, department: 'Engineering', isActive: true }
  })

  // Create Departments
  await prisma.department.createMany({
    data: [
      { id: 'dept-it', name: 'IT', description: 'Information Technology' },
      { id: 'dept-finance', name: 'Finance', description: 'Financial Operations' },
      { id: 'dept-ops', name: 'Operations', description: 'Business Operations' },
      { id: 'dept-eng', name: 'Engineering', description: 'Software Engineering' },
      { id: 'dept-mkt', name: 'Marketing', description: 'Marketing & Communications' },
    ]
  })

  // Create Workflow Templates
  const poTemplate = await prisma.workflowTemplate.create({
    data: {
      id: 'tpl-po',
      name: 'Purchase Order Approval',
      description: 'Standard purchase order approval workflow for procurement requests',
      category: 'Finance',
      isActive: true,
    }
  })

  const leaveTemplate = await prisma.workflowTemplate.create({
    data: {
      id: 'tpl-leave',
      name: 'Leave Request',
      description: 'Employee leave request approval process',
      category: 'HR',
      isActive: true,
    }
  })

  const projectTemplate = await prisma.workflowTemplate.create({
    data: {
      id: 'tpl-project',
      name: 'Project Proposal Review',
      description: 'New project proposal review and approval workflow',
      category: 'Strategy',
      isActive: true,
    }
  })

  // Create Step Templates for Purchase Order
  await prisma.stepTemplate.createMany({
    data: [
      { id: 'step-po-1', templateId: poTemplate.id, name: 'Manager Review', stepType: StepType.APPROVAL, order: 1, assigneeRole: UserRole.MANAGER, approvalLevel: 1, slaHours: 24 },
      { id: 'step-po-2', templateId: poTemplate.id, name: 'EA Verification', stepType: StepType.REVIEW, order: 2, assigneeRole: UserRole.EA, approvalLevel: 2, slaHours: 48 },
      { id: 'step-po-3', templateId: poTemplate.id, name: 'Director Approval', stepType: StepType.APPROVAL, order: 3, assigneeRole: UserRole.DIRECTOR, approvalLevel: 3, slaHours: 72 },
      { id: 'step-po-4', templateId: poTemplate.id, name: 'Finance Processing', stepType: StepType.NOTIFICATION, order: 4, assigneeRole: UserRole.EA, approvalLevel: 1, slaHours: 24 },
    ]
  })

  // Create Step Templates for Leave Request
  await prisma.stepTemplate.createMany({
    data: [
      { id: 'step-leave-1', templateId: leaveTemplate.id, name: 'Manager Approval', stepType: StepType.APPROVAL, order: 1, assigneeRole: UserRole.MANAGER, approvalLevel: 1, slaHours: 24 },
      { id: 'step-leave-2', templateId: leaveTemplate.id, name: 'HR Review', stepType: StepType.REVIEW, order: 2, assigneeRole: UserRole.EA, approvalLevel: 1, slaHours: 48 },
      { id: 'step-leave-3', templateId: leaveTemplate.id, name: 'Director Confirmation', stepType: StepType.APPROVAL, order: 3, assigneeRole: UserRole.DIRECTOR, approvalLevel: 1, slaHours: 72 },
    ]
  })

  // Create Step Templates for Project Proposal
  await prisma.stepTemplate.createMany({
    data: [
      { id: 'step-proj-1', templateId: projectTemplate.id, name: 'Manager Initial Review', stepType: StepType.REVIEW, order: 1, assigneeRole: UserRole.MANAGER, approvalLevel: 1, slaHours: 48 },
      { id: 'step-proj-2', templateId: projectTemplate.id, name: 'EA Budget Check', stepType: StepType.APPROVAL, order: 2, assigneeRole: UserRole.EA, approvalLevel: 2, slaHours: 48 },
      { id: 'step-proj-3', templateId: projectTemplate.id, name: 'Director Strategic Review', stepType: StepType.APPROVAL, order: 3, assigneeRole: UserRole.DIRECTOR, approvalLevel: 3, slaHours: 96 },
      { id: 'step-proj-4', templateId: projectTemplate.id, name: 'Escalation Check', stepType: StepType.ESCALATION_CHECK, order: 4, assigneeRole: UserRole.DIRECTOR, approvalLevel: 4, slaHours: 24 },
      { id: 'step-proj-5', templateId: projectTemplate.id, name: 'Final Admin Sign-off', stepType: StepType.APPROVAL, order: 5, assigneeRole: UserRole.ADMIN, approvalLevel: 5, slaHours: 48 },
    ]
  })

  const now = new Date()
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000)
  const daysFromNow = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000)

  // Create Workflow Instances
  // WF1: Purchase Order - PENDING (at step 1)
  const wf1 = await prisma.workflowInstance.create({
    data: {
      id: 'wf-1',
      templateId: poTemplate.id,
      title: 'Server Equipment Purchase - Q1',
      description: 'Request to purchase 5 new server units for the engineering department',
      status: WorkflowStatus.PENDING,
      priority: TaskPriority.HIGH,
      currentStepOrder: 1,
      creatorId: employee1.id,
      dueDate: daysFromNow(7),
    }
  })

  await prisma.stepInstance.createMany({
    data: [
      { id: 'si-1-1', workflowId: wf1.id, stepTemplateId: 'step-po-1', name: 'Manager Review', stepType: StepType.APPROVAL, order: 1, status: WorkflowStatus.PENDING, assigneeId: manager1.id, startedAt: daysAgo(1), slaDeadline: daysFromNow(1) },
      { id: 'si-1-2', workflowId: wf1.id, stepTemplateId: 'step-po-2', name: 'EA Verification', stepType: StepType.REVIEW, order: 2, status: WorkflowStatus.PENDING },
      { id: 'si-1-3', workflowId: wf1.id, stepTemplateId: 'step-po-3', name: 'Director Approval', stepType: StepType.APPROVAL, order: 3, status: WorkflowStatus.PENDING },
      { id: 'si-1-4', workflowId: wf1.id, stepTemplateId: 'step-po-4', name: 'Finance Processing', stepType: StepType.NOTIFICATION, order: 4, status: WorkflowStatus.PENDING },
    ]
  })

  // WF2: Leave Request - IN_REVIEW (at step 2)
  const wf2 = await prisma.workflowInstance.create({
    data: {
      id: 'wf-2',
      templateId: leaveTemplate.id,
      title: 'Annual Leave - December',
      description: 'Requesting 5 days annual leave from Dec 20-24',
      status: WorkflowStatus.IN_REVIEW,
      priority: TaskPriority.MEDIUM,
      currentStepOrder: 2,
      creatorId: employee1.id,
      dueDate: daysFromNow(5),
    }
  })

  await prisma.stepInstance.createMany({
    data: [
      { id: 'si-2-1', workflowId: wf2.id, stepTemplateId: 'step-leave-1', name: 'Manager Approval', stepType: StepType.APPROVAL, order: 1, status: WorkflowStatus.APPROVED, assigneeId: manager1.id, startedAt: daysAgo(3), completedAt: daysAgo(2) },
      { id: 'si-2-2', workflowId: wf2.id, stepTemplateId: 'step-leave-2', name: 'HR Review', stepType: StepType.REVIEW, order: 2, status: WorkflowStatus.IN_REVIEW, assigneeId: ea1.id, startedAt: daysAgo(2), slaDeadline: daysFromNow(1) },
      { id: 'si-2-3', workflowId: wf2.id, stepTemplateId: 'step-leave-3', name: 'Director Confirmation', stepType: StepType.APPROVAL, order: 3, status: WorkflowStatus.PENDING, assigneeId: director1.id },
    ]
  })

  await prisma.approval.create({
    data: { id: 'appr-2-1', stepInstanceId: 'si-2-1', workflowId: wf2.id, approverId: manager1.id, action: WorkflowStatus.APPROVED, comments: 'Approved - team schedule allows', level: 1 }
  })

  // WF3: Purchase Order - APPROVED (completed)
  const wf3 = await prisma.workflowInstance.create({
    data: {
      id: 'wf-3',
      templateId: poTemplate.id,
      title: 'Office Supplies Procurement',
      description: 'Monthly office supplies restock request',
      status: WorkflowStatus.APPROVED,
      priority: TaskPriority.LOW,
      currentStepOrder: 4,
      creatorId: manager2.id,
      dueDate: daysAgo(2),
      createdAt: daysAgo(10),
    }
  })

  await prisma.stepInstance.createMany({
    data: [
      { id: 'si-3-1', workflowId: wf3.id, stepTemplateId: 'step-po-1', name: 'Manager Review', stepType: StepType.APPROVAL, order: 1, status: WorkflowStatus.APPROVED, assigneeId: manager1.id, startedAt: daysAgo(9), completedAt: daysAgo(8) },
      { id: 'si-3-2', workflowId: wf3.id, stepTemplateId: 'step-po-2', name: 'EA Verification', stepType: StepType.REVIEW, order: 2, status: WorkflowStatus.APPROVED, assigneeId: ea1.id, startedAt: daysAgo(8), completedAt: daysAgo(6) },
      { id: 'si-3-3', workflowId: wf3.id, stepTemplateId: 'step-po-3', name: 'Director Approval', stepType: StepType.APPROVAL, order: 3, status: WorkflowStatus.APPROVED, assigneeId: director1.id, startedAt: daysAgo(6), completedAt: daysAgo(3) },
      { id: 'si-3-4', workflowId: wf3.id, stepTemplateId: 'step-po-4', name: 'Finance Processing', stepType: StepType.NOTIFICATION, order: 4, status: WorkflowStatus.APPROVED, assigneeId: ea1.id, startedAt: daysAgo(3), completedAt: daysAgo(2) },
    ]
  })

  await prisma.approval.createMany({
    data: [
      { id: 'appr-3-1', stepInstanceId: 'si-3-1', workflowId: wf3.id, approverId: manager1.id, action: WorkflowStatus.APPROVED, comments: 'Standard supplies, approved', level: 1 },
      { id: 'appr-3-2', stepInstanceId: 'si-3-2', workflowId: wf3.id, approverId: ea1.id, action: WorkflowStatus.APPROVED, comments: 'Budget verified, within limits', level: 2 },
      { id: 'appr-3-3', stepInstanceId: 'si-3-3', workflowId: wf3.id, approverId: director1.id, action: WorkflowStatus.APPROVED, comments: 'Approved by Finance Director', level: 3 },
    ]
  })

  // WF4: Leave Request - REJECTED
  const wf4 = await prisma.workflowInstance.create({
    data: {
      id: 'wf-4',
      templateId: leaveTemplate.id,
      title: 'Sick Leave Extension',
      description: 'Request to extend sick leave by 3 days',
      status: WorkflowStatus.REJECTED,
      priority: TaskPriority.MEDIUM,
      currentStepOrder: 1,
      creatorId: employee1.id,
      dueDate: daysAgo(5),
      createdAt: daysAgo(7),
    }
  })

  await prisma.stepInstance.createMany({
    data: [
      { id: 'si-4-1', workflowId: wf4.id, stepTemplateId: 'step-leave-1', name: 'Manager Approval', stepType: StepType.APPROVAL, order: 1, status: WorkflowStatus.REJECTED, assigneeId: manager1.id, startedAt: daysAgo(7), completedAt: daysAgo(6) },
      { id: 'si-4-2', workflowId: wf4.id, stepTemplateId: 'step-leave-2', name: 'HR Review', stepType: StepType.REVIEW, order: 2, status: WorkflowStatus.PENDING },
      { id: 'si-4-3', workflowId: wf4.id, stepTemplateId: 'step-leave-3', name: 'Director Confirmation', stepType: StepType.APPROVAL, order: 3, status: WorkflowStatus.PENDING },
    ]
  })

  await prisma.approval.create({
    data: { id: 'appr-4-1', stepInstanceId: 'si-4-1', workflowId: wf4.id, approverId: manager1.id, action: WorkflowStatus.REJECTED, comments: 'Insufficient medical documentation provided', level: 1 }
  })

  // WF5: Project Proposal - ESCALATED
  const wf5 = await prisma.workflowInstance.create({
    data: {
      id: 'wf-5',
      templateId: projectTemplate.id,
      title: 'AI Platform Development Proposal',
      description: 'Proposal for building an internal AI-powered analytics platform',
      status: WorkflowStatus.ESCALATED,
      priority: TaskPriority.CRITICAL,
      currentStepOrder: 3,
      creatorId: manager1.id,
      dueDate: daysFromNow(3),
      createdAt: daysAgo(5),
    }
  })

  await prisma.stepInstance.createMany({
    data: [
      { id: 'si-5-1', workflowId: wf5.id, stepTemplateId: 'step-proj-1', name: 'Manager Initial Review', stepType: StepType.REVIEW, order: 1, status: WorkflowStatus.APPROVED, assigneeId: manager2.id, startedAt: daysAgo(5), completedAt: daysAgo(4) },
      { id: 'si-5-2', workflowId: wf5.id, stepTemplateId: 'step-proj-2', name: 'EA Budget Check', stepType: StepType.APPROVAL, order: 2, status: WorkflowStatus.APPROVED, assigneeId: ea1.id, startedAt: daysAgo(4), completedAt: daysAgo(2) },
      { id: 'si-5-3', workflowId: wf5.id, stepTemplateId: 'step-proj-3', name: 'Director Strategic Review', stepType: StepType.APPROVAL, order: 3, status: WorkflowStatus.ESCALATED, assigneeId: director2.id, startedAt: daysAgo(2), isEscalated: true, slaDeadline: daysAgo(1) },
      { id: 'si-5-4', workflowId: wf5.id, stepTemplateId: 'step-proj-4', name: 'Escalation Check', stepType: StepType.ESCALATION_CHECK, order: 4, status: WorkflowStatus.PENDING },
      { id: 'si-5-5', workflowId: wf5.id, stepTemplateId: 'step-proj-5', name: 'Final Admin Sign-off', stepType: StepType.APPROVAL, order: 5, status: WorkflowStatus.PENDING },
    ]
  })

  await prisma.approval.createMany({
    data: [
      { id: 'appr-5-1', stepInstanceId: 'si-5-1', workflowId: wf5.id, approverId: manager2.id, action: WorkflowStatus.APPROVED, comments: 'Innovative proposal, moving forward', level: 1 },
      { id: 'appr-5-2', stepInstanceId: 'si-5-2', workflowId: wf5.id, approverId: ea1.id, action: WorkflowStatus.APPROVED, comments: 'Budget within acceptable range for Phase 1', level: 2 },
    ]
  })

  // WF6: Project Proposal - IN_PROGRESS
  const wf6 = await prisma.workflowInstance.create({
    data: {
      id: 'wf-6',
      templateId: projectTemplate.id,
      title: 'Customer Portal Redesign',
      description: 'Complete redesign of the customer-facing portal with modern UX',
      status: WorkflowStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      currentStepOrder: 5,
      creatorId: manager2.id,
      dueDate: daysFromNow(14),
      createdAt: daysAgo(15),
    }
  })

  await prisma.stepInstance.createMany({
    data: [
      { id: 'si-6-1', workflowId: wf6.id, stepTemplateId: 'step-proj-1', name: 'Manager Initial Review', stepType: StepType.REVIEW, order: 1, status: WorkflowStatus.APPROVED, assigneeId: manager1.id, startedAt: daysAgo(15), completedAt: daysAgo(13) },
      { id: 'si-6-2', workflowId: wf6.id, stepTemplateId: 'step-proj-2', name: 'EA Budget Check', stepType: StepType.APPROVAL, order: 2, status: WorkflowStatus.APPROVED, assigneeId: ea2.id, startedAt: daysAgo(13), completedAt: daysAgo(10) },
      { id: 'si-6-3', workflowId: wf6.id, stepTemplateId: 'step-proj-3', name: 'Director Strategic Review', stepType: StepType.APPROVAL, order: 3, status: WorkflowStatus.APPROVED, assigneeId: director2.id, startedAt: daysAgo(10), completedAt: daysAgo(7) },
      { id: 'si-6-4', workflowId: wf6.id, stepTemplateId: 'step-proj-4', name: 'Escalation Check', stepType: StepType.ESCALATION_CHECK, order: 4, status: WorkflowStatus.APPROVED, assigneeId: director1.id, startedAt: daysAgo(7), completedAt: daysAgo(5) },
      { id: 'si-6-5', workflowId: wf6.id, stepTemplateId: 'step-proj-5', name: 'Final Admin Sign-off', stepType: StepType.APPROVAL, order: 5, status: WorkflowStatus.APPROVED, assigneeId: admin.id, startedAt: daysAgo(5), completedAt: daysAgo(3) },
    ]
  })

  await prisma.approval.createMany({
    data: [
      { id: 'appr-6-1', stepInstanceId: 'si-6-1', workflowId: wf6.id, approverId: manager1.id, action: WorkflowStatus.APPROVED, comments: 'Looks good, solid plan', level: 1 },
      { id: 'appr-6-2', stepInstanceId: 'si-6-2', workflowId: wf6.id, approverId: ea2.id, action: WorkflowStatus.APPROVED, comments: 'Budget allocated from Q2 reserves', level: 2 },
      { id: 'appr-6-3', stepInstanceId: 'si-6-3', workflowId: wf6.id, approverId: director2.id, action: WorkflowStatus.APPROVED, comments: 'Strategically aligned with our goals', level: 3 },
      { id: 'appr-6-4', stepInstanceId: 'si-6-4', workflowId: wf6.id, approverId: director1.id, action: WorkflowStatus.APPROVED, comments: 'No escalation needed, proceed', level: 4 },
      { id: 'appr-6-5', stepInstanceId: 'si-6-5', workflowId: wf6.id, approverId: admin.id, action: WorkflowStatus.APPROVED, comments: 'Final approval granted', level: 5 },
    ]
  })

  // WF7: Purchase Order - ON_HOLD
  const wf7 = await prisma.workflowInstance.create({
    data: {
      id: 'wf-7',
      templateId: poTemplate.id,
      title: 'Cloud Infrastructure Upgrade',
      description: 'Upgrade cloud hosting plan from Standard to Enterprise tier',
      status: WorkflowStatus.ON_HOLD,
      priority: TaskPriority.HIGH,
      currentStepOrder: 2,
      creatorId: manager1.id,
      dueDate: daysFromNow(10),
      createdAt: daysAgo(4),
    }
  })

  await prisma.stepInstance.createMany({
    data: [
      { id: 'si-7-1', workflowId: wf7.id, stepTemplateId: 'step-po-1', name: 'Manager Review', stepType: StepType.APPROVAL, order: 1, status: WorkflowStatus.APPROVED, assigneeId: manager2.id, startedAt: daysAgo(4), completedAt: daysAgo(3) },
      { id: 'si-7-2', workflowId: wf7.id, stepTemplateId: 'step-po-2', name: 'EA Verification', stepType: StepType.REVIEW, order: 2, status: WorkflowStatus.ON_HOLD, assigneeId: ea1.id, startedAt: daysAgo(3), slaDeadline: daysFromNow(2) },
      { id: 'si-7-3', workflowId: wf7.id, stepTemplateId: 'step-po-3', name: 'Director Approval', stepType: StepType.APPROVAL, order: 3, status: WorkflowStatus.PENDING },
      { id: 'si-7-4', workflowId: wf7.id, stepTemplateId: 'step-po-4', name: 'Finance Processing', stepType: StepType.NOTIFICATION, order: 4, status: WorkflowStatus.PENDING },
    ]
  })

  await prisma.approval.create({
    data: { id: 'appr-7-1', stepInstanceId: 'si-7-1', workflowId: wf7.id, approverId: manager2.id, action: WorkflowStatus.APPROVED, comments: 'Approved, critical for Q2 launch', level: 1 }
  })

  // WF8: Leave Request - COMPLETED
  const wf8 = await prisma.workflowInstance.create({
    data: {
      id: 'wf-8',
      templateId: leaveTemplate.id,
      title: 'Team Building Day Off',
      description: 'Requesting 1 day off for team building event',
      status: WorkflowStatus.COMPLETED,
      priority: TaskPriority.LOW,
      currentStepOrder: 3,
      creatorId: employee1.id,
      dueDate: daysAgo(3),
      createdAt: daysAgo(12),
    }
  })

  await prisma.stepInstance.createMany({
    data: [
      { id: 'si-8-1', workflowId: wf8.id, stepTemplateId: 'step-leave-1', name: 'Manager Approval', stepType: StepType.APPROVAL, order: 1, status: WorkflowStatus.APPROVED, assigneeId: manager1.id, startedAt: daysAgo(12), completedAt: daysAgo(11) },
      { id: 'si-8-2', workflowId: wf8.id, stepTemplateId: 'step-leave-2', name: 'HR Review', stepType: StepType.REVIEW, order: 2, status: WorkflowStatus.APPROVED, assigneeId: ea2.id, startedAt: daysAgo(11), completedAt: daysAgo(9) },
      { id: 'si-8-3', workflowId: wf8.id, stepTemplateId: 'step-leave-3', name: 'Director Confirmation', stepType: StepType.APPROVAL, order: 3, status: WorkflowStatus.APPROVED, assigneeId: director2.id, startedAt: daysAgo(9), completedAt: daysAgo(7) },
    ]
  })

  await prisma.approval.createMany({
    data: [
      { id: 'appr-8-1', stepInstanceId: 'si-8-1', workflowId: wf8.id, approverId: manager1.id, action: WorkflowStatus.APPROVED, comments: 'Enjoy the team building!', level: 1 },
      { id: 'appr-8-2', stepInstanceId: 'si-8-2', workflowId: wf8.id, approverId: ea2.id, action: WorkflowStatus.APPROVED, comments: 'HR records updated', level: 1 },
      { id: 'appr-8-3', stepInstanceId: 'si-8-3', workflowId: wf8.id, approverId: director2.id, action: WorkflowStatus.APPROVED, comments: 'Confirmed', level: 1 },
    ]
  })

  // Status History
  await prisma.statusHistory.createMany({
    data: [
      { id: 'sh-1', workflowId: wf1.id, fromStatus: WorkflowStatus.DRAFT, toStatus: WorkflowStatus.PENDING, changedBy: employee1.id, reason: 'Submitted for approval', createdAt: daysAgo(1) },
      { id: 'sh-2', workflowId: wf2.id, fromStatus: WorkflowStatus.PENDING, toStatus: WorkflowStatus.IN_REVIEW, changedBy: manager1.id, reason: 'Manager approved, moving to HR review', createdAt: daysAgo(2) },
      { id: 'sh-3', workflowId: wf3.id, fromStatus: WorkflowStatus.PENDING, toStatus: WorkflowStatus.IN_REVIEW, changedBy: manager1.id, reason: 'Manager approved', createdAt: daysAgo(8) },
      { id: 'sh-4', workflowId: wf3.id, fromStatus: WorkflowStatus.IN_REVIEW, toStatus: WorkflowStatus.APPROVED, changedBy: director1.id, reason: 'All approvals complete', createdAt: daysAgo(3) },
      { id: 'sh-5', workflowId: wf4.id, fromStatus: WorkflowStatus.PENDING, toStatus: WorkflowStatus.REJECTED, changedBy: manager1.id, reason: 'Insufficient documentation', createdAt: daysAgo(6) },
      { id: 'sh-6', workflowId: wf5.id, fromStatus: WorkflowStatus.PENDING, toStatus: WorkflowStatus.IN_REVIEW, changedBy: manager2.id, reason: 'Initial review passed', createdAt: daysAgo(4) },
      { id: 'sh-7', workflowId: wf5.id, fromStatus: WorkflowStatus.IN_REVIEW, toStatus: WorkflowStatus.ESCALATED, changedBy: director2.id, reason: 'SLA breached, escalating to senior management', createdAt: daysAgo(1) },
      { id: 'sh-8', workflowId: wf6.id, fromStatus: WorkflowStatus.APPROVED, toStatus: WorkflowStatus.IN_PROGRESS, changedBy: admin.id, reason: 'Project kickoff initiated', createdAt: daysAgo(3) },
      { id: 'sh-9', workflowId: wf7.id, fromStatus: WorkflowStatus.PENDING, toStatus: WorkflowStatus.ON_HOLD, changedBy: ea1.id, reason: 'Awaiting budget confirmation from CFO', createdAt: daysAgo(2) },
      { id: 'sh-10', workflowId: wf8.id, fromStatus: WorkflowStatus.APPROVED, toStatus: WorkflowStatus.COMPLETED, changedBy: director2.id, reason: 'Leave completed successfully', createdAt: daysAgo(5) },
    ]
  })

  // Escalation Logs
  await prisma.escalationLog.createMany({
    data: [
      { id: 'esc-1', workflowId: wf5.id, fromStepOrder: 3, toStepOrder: 4, fromAssigneeId: director2.id, toAssigneeId: director1.id, reason: 'SLA deadline exceeded for Director Strategic Review', slaBreached: true, createdAt: daysAgo(1) },
    ]
  })

  // Tasks
  const task1 = await prisma.task.create({
    data: { id: 'task-1', workflowId: wf6.id, title: 'UI/UX Design Phase', description: 'Complete wireframes and design mockups for customer portal', status: WorkflowStatus.COMPLETED, priority: TaskPriority.HIGH, ownerId: manager2.id, dueDate: daysAgo(5), completedAt: daysAgo(5) }
  })
  const task2 = await prisma.task.create({
    data: { id: 'task-2', workflowId: wf6.id, title: 'Frontend Development', description: 'Implement the approved designs in React/Next.js', status: WorkflowStatus.IN_PROGRESS, priority: TaskPriority.HIGH, ownerId: employee1.id, dueDate: daysFromNow(7) }
  })
  const task3 = await prisma.task.create({
    data: { id: 'task-3', workflowId: wf6.id, title: 'Backend API Development', description: 'Build REST APIs for the portal', status: WorkflowStatus.IN_PROGRESS, priority: TaskPriority.HIGH, ownerId: manager1.id, dueDate: daysFromNow(10) }
  })
  const task4 = await prisma.task.create({
    data: { id: 'task-4', workflowId: wf6.id, title: 'Integration Testing', description: 'End-to-end integration testing of all components', status: WorkflowStatus.PENDING, priority: TaskPriority.MEDIUM, ownerId: employee1.id, dueDate: daysFromNow(14) }
  })
  const task5 = await prisma.task.create({
    data: { id: 'task-5', workflowId: wf1.id, title: 'Vendor Selection', description: 'Evaluate and select server equipment vendor', status: WorkflowStatus.PENDING, priority: TaskPriority.HIGH, ownerId: manager1.id, dueDate: daysFromNow(5) }
  })
  const task6 = await prisma.task.create({
    data: { id: 'task-6', title: 'Quarterly Report Preparation', description: 'Prepare Q4 financial summary report', status: WorkflowStatus.PENDING, priority: TaskPriority.MEDIUM, ownerId: ea1.id, dueDate: daysFromNow(3) }
  })
  const task7 = await prisma.task.create({
    data: { id: 'task-7', title: 'Security Audit Planning', description: 'Plan and schedule annual security audit', status: WorkflowStatus.PENDING, priority: TaskPriority.CRITICAL, ownerId: admin.id, dueDate: daysFromNow(2) }
  })
  // Subtask
  await prisma.task.create({
    data: { id: 'task-2a', title: 'Component Library Setup', description: 'Set up shared component library', status: WorkflowStatus.COMPLETED, priority: TaskPriority.MEDIUM, ownerId: employee1.id, dueDate: daysAgo(2), completedAt: daysAgo(2), parentTaskId: task2.id }
  })
  await prisma.task.create({
    data: { id: 'task-2b', title: 'Page Implementations', description: 'Implement all page layouts', status: WorkflowStatus.IN_PROGRESS, priority: TaskPriority.HIGH, ownerId: employee1.id, dueDate: daysFromNow(5), parentTaskId: task2.id }
  })

  // Task Dependencies
  await prisma.taskDependency.createMany({
    data: [
      { id: 'td-1', taskId: task4.id, dependsOnTaskId: task2.id, dependencyType: 'FINISH_TO_START' },
      { id: 'td-2', taskId: task4.id, dependsOnTaskId: task3.id, dependencyType: 'FINISH_TO_START' },
      { id: 'td-3', taskId: task2.id, dependsOnTaskId: task1.id, dependencyType: 'FINISH_TO_START' },
    ]
  })

  // Notifications
  await prisma.notification.createMany({
    data: [
      { id: 'notif-1', type: NotificationType.APPROVAL_REQUIRED, title: 'Approval Required: Server Equipment Purchase', message: 'A new purchase order requires your review and approval.', senderId: employee1.id, receiverId: manager1.id, workflowId: wf1.id, isRead: false, createdAt: daysAgo(1) },
      { id: 'notif-2', type: NotificationType.APPROVED, title: 'Leave Request Approved', message: 'Your leave request has been approved by your manager.', senderId: manager1.id, receiverId: employee1.id, workflowId: wf2.id, isRead: true, readAt: daysAgo(2), createdAt: daysAgo(2) },
      { id: 'notif-3', type: NotificationType.ESCALATION, title: 'ESCALATED: AI Platform Proposal', message: 'This workflow has been escalated due to SLA breach. Your immediate attention is required.', senderId: director2.id, receiverId: director1.id, workflowId: wf5.id, isRead: false, createdAt: daysAgo(1) },
      { id: 'notif-4', type: NotificationType.STATUS_CHANGE, title: 'Workflow On Hold', message: 'Cloud Infrastructure Upgrade has been put on hold pending budget confirmation.', senderId: ea1.id, receiverId: manager1.id, workflowId: wf7.id, isRead: false, createdAt: daysAgo(2) },
      { id: 'notif-5', type: NotificationType.REJECTED, title: 'Leave Request Rejected', message: 'Your sick leave extension has been rejected. Please provide additional documentation.', senderId: manager1.id, receiverId: employee1.id, workflowId: wf4.id, isRead: true, readAt: daysAgo(5), createdAt: daysAgo(6) },
      { id: 'notif-6', type: NotificationType.APPROVAL_REQUIRED, title: 'HR Review Required', message: 'A leave request is awaiting your HR review.', senderId: manager1.id, receiverId: ea1.id, workflowId: wf2.id, isRead: false, createdAt: daysAgo(2) },
      { id: 'notif-7', type: NotificationType.REMINDER, title: 'SLA Reminder: Server Equipment Purchase', message: 'This approval is approaching its SLA deadline. Please review soon.', senderId: admin.id, receiverId: manager1.id, workflowId: wf1.id, isRead: false, createdAt: daysAgo(0.5) },
      { id: 'notif-8', type: NotificationType.COMMENT, title: 'New Comment on AI Platform Proposal', message: 'Robert Kim commented: "Need to review the budget implications more carefully."', senderId: director2.id, receiverId: manager1.id, workflowId: wf5.id, isRead: false, createdAt: daysAgo(0.5) },
      { id: 'notif-9', type: NotificationType.STATUS_CHANGE, title: 'Project Approved', message: 'Customer Portal Redesign has been approved and is now in progress.', senderId: admin.id, receiverId: manager2.id, workflowId: wf6.id, isRead: true, readAt: daysAgo(3), createdAt: daysAgo(3) },
      { id: 'notif-10', type: NotificationType.DELEGATION, title: 'Approval Delegated', message: 'James Wilson has delegated approval authority to you for Finance workflows.', senderId: ea1.id, receiverId: ea2.id, isRead: false, createdAt: daysAgo(1) },
    ]
  })

  // Comments
  await prisma.comment.createMany({
    data: [
      { id: 'comment-1', workflowId: wf5.id, authorId: director2.id, content: 'This proposal needs more detailed cost-benefit analysis before I can approve.', createdAt: daysAgo(2) },
      { id: 'comment-2', workflowId: wf5.id, authorId: manager1.id, content: 'I have updated the proposal with ROI projections. Please review the revised document.', createdAt: daysAgo(1.5) },
      { id: 'comment-3', workflowId: wf5.id, authorId: director2.id, content: 'Need to review the budget implications more carefully. Escalating to senior management.', createdAt: daysAgo(1) },
      { id: 'comment-4', workflowId: wf7.id, authorId: ea1.id, content: 'Putting this on hold until we get CFO confirmation on the budget allocation.', createdAt: daysAgo(2) },
      { id: 'comment-5', workflowId: wf1.id, authorId: employee1.id, content: 'We need these servers urgently for the Q2 release. Please expedite the review.', createdAt: daysAgo(1) },
      { id: 'comment-6', workflowId: wf6.id, authorId: manager2.id, content: 'Design phase completed. Moving to development.', createdAt: daysAgo(5) },
    ]
  })

  // Delegations
  await prisma.delegation.create({
    data: { id: 'deleg-1', fromUserId: ea1.id, toUserId: ea2.id, startDate: daysAgo(2), endDate: daysFromNow(5), isActive: true, reason: 'Traveling for conference - delegating finance approvals' }
  })

  console.log('Seed data created successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

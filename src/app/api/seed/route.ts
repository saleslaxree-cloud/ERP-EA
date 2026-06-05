import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { WorkflowStatus, TaskPriority, UserRole } from '@prisma/client'

export async function POST() {
  try {
    const members = [
      { email: 'admin@laxree.com', name: 'Admin', role: UserRole.ADMIN, department: 'Management' },
      { email: 'sandeep@laxree.com', name: 'Sandeep', role: UserRole.MANAGER, department: 'Sales' },
      { email: 'khushboo@laxree.com', name: 'Khushboo Manglani', role: UserRole.MANAGER, department: 'Sales' },
      { email: 'aditya@laxree.com', name: 'Aditya Sharma', role: UserRole.EMPLOYEE, department: 'Sales' },
      { email: 'ronak@laxree.com', name: 'Ronak Jain', role: UserRole.MANAGER, department: 'Sales' },
      { email: 'aakash@laxree.com', name: 'Aakash', role: UserRole.EMPLOYEE, department: 'Sales' },
      { email: 'anamika@laxree.com', name: 'Anamika', role: UserRole.EMPLOYEE, department: 'Back Office' },
      { email: 'radhika@laxree.com', name: 'Radhika', role: UserRole.EMPLOYEE, department: 'Back Office' },
      { email: 'saurabh@laxree.com', name: 'Saurabh', role: UserRole.EMPLOYEE, department: 'Back Office' },
      { email: 'ruchi@laxree.com', name: 'Ruchi', role: UserRole.EMPLOYEE, department: 'Back Office' },
      { email: 'arti@laxree.com', name: 'Arti Sharma', role: UserRole.EA, department: 'Back Office' },
      { email: 'tanuja@laxree.com', name: 'Tanuja Tigaya', role: UserRole.EMPLOYEE, department: 'Back Office' },
      { email: 'aayush@laxree.com', name: 'Aayush', role: UserRole.EMPLOYEE, department: 'Back Office' },
      { email: 'kamlesh@laxree.com', name: 'Kamlesh', role: UserRole.EMPLOYEE, department: 'Back Office' },
      { email: 'hitesh@laxree.com', name: 'Hitesh Tak', role: UserRole.EMPLOYEE, department: 'Accounts' },
      { email: 'ashish@laxree.com', name: 'Ashish Sir', role: UserRole.DIRECTOR, department: 'Management' },
      { email: 'samarth@laxree.com', name: 'Samarth Sir', role: UserRole.DIRECTOR, department: 'Management' },
    ]

    const createdUsers = []
    for (const m of members) {
      const existing = await db.user.findFirst({ where: { email: m.email } })
      if (!existing) {
        const user = await db.user.create({ data: m })
        createdUsers.push(user)
      } else {
        createdUsers.push(existing)
      }
    }

    const taskData = [
      { title: 'Monthly Sales Report', description: 'Prepare and submit the monthly sales report for management review', priority: TaskPriority.HIGH, status: WorkflowStatus.IN_PROGRESS },
      { title: 'Client Follow-up - ABC Corp', description: 'Follow up with ABC Corp regarding pending proposal', priority: TaskPriority.HIGH, status: WorkflowStatus.PENDING },
      { title: 'Reconciliation - March 2025', description: 'Complete bank reconciliation for March 2025', priority: TaskPriority.MEDIUM, status: WorkflowStatus.IN_PROGRESS },
      { title: 'Update CRM Records', description: 'Update all client records in the CRM system', priority: TaskPriority.LOW, status: WorkflowStatus.COMPLETED },
      { title: 'Design Review - Hotel Brochure', description: 'Review and approve the hotel brochure design', priority: TaskPriority.MEDIUM, status: WorkflowStatus.PENDING },
      { title: 'Procurement - Office Supplies', description: 'Order office supplies for the quarter', priority: TaskPriority.LOW, status: WorkflowStatus.COMPLETED },
      { title: 'Compliance Audit Preparation', description: 'Prepare documentation for upcoming compliance audit', priority: TaskPriority.CRITICAL, status: WorkflowStatus.ON_HOLD },
      { title: 'Team Performance Review', description: 'Conduct quarterly team performance reviews', priority: TaskPriority.HIGH, status: WorkflowStatus.PENDING },
      { title: 'Invoice Processing - Vendor Payments', description: 'Process pending vendor invoices', priority: TaskPriority.MEDIUM, status: WorkflowStatus.IN_PROGRESS },
      { title: 'Roofing Project Status Update', description: 'Update roofing project status and timeline', priority: TaskPriority.HIGH, status: WorkflowStatus.EXTERNAL_HOLD },
      { title: 'HR Policy Update', description: 'Review and update HR policies', priority: TaskPriority.MEDIUM, status: WorkflowStatus.PENDING },
      { title: 'Interior Procurement - Material Sourcing', description: 'Source materials for interior procurement project', priority: TaskPriority.MEDIUM, status: WorkflowStatus.ESCALATED },
      { title: 'Daily Operations Checklist', description: 'Complete daily operations checklist', priority: TaskPriority.LOW, status: WorkflowStatus.COMPLETED },
      { title: 'MIS Report Generation', description: 'Generate monthly MIS reports', priority: TaskPriority.MEDIUM, status: WorkflowStatus.IN_PROGRESS },
      { title: 'Client Presentation - Q1 Results', description: 'Prepare Q1 results presentation for client', priority: TaskPriority.HIGH, status: WorkflowStatus.PENDING },
    ]

    const assignees = createdUsers.filter(u => u.role !== UserRole.ADMIN && u.role !== UserRole.DIRECTOR)

    for (let i = 0; i < taskData.length; i++) {
      const existing = await db.task.findFirst({ where: { title: taskData[i].title } })
      if (!existing) {
        const assignee = assignees[i % assignees.length]
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + (i % 7) - 2)

        await db.task.create({
          data: {
            ...taskData[i],
            ownerId: assignee.id,
            dueDate,
          },
        })
      }
    }

    const departments = ['Sales', 'Back Office', 'Accounts', 'Management']
    for (const dept of departments) {
      const existing = await db.department.findFirst({ where: { name: dept } })
      if (!existing) {
        await db.department.create({ data: { name: dept, description: `${dept} department` } })
      }
    }

    const admin = createdUsers.find(u => u.role === UserRole.ADMIN)
    if (admin) {
      const existingNotifs = await db.notification.count()
      if (existingNotifs === 0) {
        await db.notification.createMany({
          data: [
            { type: 'APPROVAL_REQUIRED', title: 'New approval required', message: 'Task "Monthly Sales Report" needs your review', receiverId: admin.id, senderId: admin.id },
            { type: 'ESCALATION', title: 'Task escalated', message: 'Overdue task has been escalated to director', receiverId: admin.id },
            { type: 'REMINDER', title: 'Daily reminder', message: '3 tasks due today', receiverId: admin.id },
          ],
        })
      }
    }

    return NextResponse.json({ message: 'Seed completed', users: createdUsers.length, tasks: taskData.length })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 })
  }
}

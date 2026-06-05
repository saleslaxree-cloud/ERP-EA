import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const department = request.nextUrl.searchParams.get('department')
    const role = request.nextUrl.searchParams.get('role')
    const status = request.nextUrl.searchParams.get('status')
    const search = request.nextUrl.searchParams.get('search')

    const where: Record<string, unknown> = {}
    if (department) where.department = department
    if (role) where.role = role as UserRole
    if (status === 'active') where.isActive = true
    else if (status === 'inactive') where.isActive = false

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { designation: { contains: search } },
        { phone: { contains: search } },
      ]
    }

    const employees = await db.user.findMany({
      where,
      select: {
        id: true, email: true, name: true, role: true, department: true,
        designation: true, phone: true, location: true, avatar: true,
        isActive: true, joinDate: true, createdAt: true,
        tasks: {
          select: { id: true, status: true, priority: true, dueDate: true, completedAt: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    const now = new Date()
    const employeesWithStats = employees.map(emp => {
      const totalTasks = emp.tasks.length
      const completedTasks = emp.tasks.filter(t => t.status === 'COMPLETED').length
      const inProgressTasks = emp.tasks.filter(t => t.status === 'IN_PROGRESS').length
      const overdueTasks = emp.tasks.filter(t =>
        t.dueDate && new Date(t.dueDate) < now && !['COMPLETED', 'CANCELLED'].includes(t.status)
      ).length
      const performanceScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100 - overdueTasks * 5) : 0

      return {
        id: emp.id,
        email: emp.email,
        name: emp.name,
        role: emp.role,
        department: emp.department,
        designation: emp.designation,
        phone: emp.phone,
        location: emp.location,
        avatar: emp.avatar,
        isActive: emp.isActive,
        joinDate: emp.joinDate?.toISOString(),
        createdAt: emp.createdAt.toISOString(),
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        performanceScore: Math.max(0, performanceScore),
      }
    })

    // Summary stats
    const totalEmployees = employeesWithStats.length
    const activeEmployees = employeesWithStats.filter(e => e.isActive).length
    const departments = [...new Set(employeesWithStats.map(e => e.department).filter(Boolean))].length
    const onLeave = totalEmployees - activeEmployees

    return NextResponse.json({
      employees: employeesWithStats,
      stats: { total: totalEmployees, active: activeEmployees, departments, onLeave },
    })
  } catch (error) {
    console.error('Employees GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, role, department, designation, phone, location } = body

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    const employee = await db.user.create({
      data: {
        name,
        email,
        role: (role as UserRole) || UserRole.EMPLOYEE,
        department: department || null,
        designation: designation || null,
        phone: phone || null,
        location: location || null,
        isActive: true,
      },
    })

    // Notify HR/admin
    const admins = await db.user.findMany({ where: { role: UserRole.ADMIN }, select: { id: true } })
    for (const admin of admins) {
      await db.notification.create({
        data: {
          type: 'STATUS_CHANGE',
          title: `New Employee Added: ${name}`,
          message: `${name} has joined as ${designation || role} in ${department || 'Unassigned'}.`,
          receiverId: admin.id,
        },
      })
    }

    return NextResponse.json(employee, { status: 201 })
  } catch (error) {
    console.error('Employees POST error:', error)
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 })
  }
}

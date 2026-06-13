import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { LeaveStatus } from '@prisma/client'

// PATCH /api/leaves/[id] — approve, reject, or cancel a leave
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, approvedById, eaRemark } = body

    if (!action || !['approve', 'reject', 'cancel'].includes(action)) {
      return NextResponse.json({ error: 'action must be approve, reject, or cancel' }, { status: 400 })
    }

    const leave = await db.leave.findUnique({ where: { id } })
    if (!leave) {
      return NextResponse.json({ error: 'Leave not found' }, { status: 404 })
    }

    let status: LeaveStatus
    if (action === 'approve') status = LeaveStatus.APPROVED
    else if (action === 'reject') status = LeaveStatus.REJECTED
    else status = LeaveStatus.CANCELLED

    const updated = await db.leave.update({
      where: { id },
      data: {
        status,
        approvedById: action === 'approve' ? approvedById : null,
        approvedAt: action === 'approve' ? new Date() : null,
        eaRemark: eaRemark || null,
      },
      include: {
        user: { select: { id: true, name: true, email: true, department: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ leave: updated })
  } catch (error) {
    console.error('Leave PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update leave' }, { status: 500 })
  }
}

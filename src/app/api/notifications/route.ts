import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')
    const unreadOnly = request.nextUrl.searchParams.get('unreadOnly') === 'true'

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // ══ CLEANUP: Delete notifications older than 30 days ══
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    try {
      await db.notification.deleteMany({
        where: { createdAt: { lt: thirtyDaysAgo } },
      })
    } catch (cleanupErr) {
      console.error('Notification cleanup error (non-fatal):', cleanupErr)
    }

    // ══ CLEANUP: Delete orphaned notifications referencing non-existent workflows ══
    try {
      const orphans = await db.notification.findMany({
        where: { workflowId: { not: null } },
        select: { id: true, workflowId: true },
      })
      if (orphans.length > 0) {
        const existingWorkflowIds = new Set(
          (await db.workflowInstance.findMany({
            where: { id: { in: orphans.map(n => n.workflowId!) } },
            select: { id: true },
          })).map(w => w.id)
        )
        const orphanIds = orphans.filter(n => !existingWorkflowIds.has(n.workflowId!)).map(n => n.id)
        if (orphanIds.length > 0) {
          await db.notification.deleteMany({ where: { id: { in: orphanIds } } })
        }
      }
    } catch (orphanErr) {
      console.error('Orphan notification cleanup error (non-fatal):', orphanErr)
    }

    const where: Record<string, unknown> = { receiverId: userId }
    if (unreadOnly) where.isRead = false

    const notifications = await db.notification.findMany({
      where,
      include: {
        sender: { select: { id: true, name: true, email: true, role: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const unreadCount = await db.notification.count({
      where: { receiverId: userId, isRead: false },
    })

    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    console.error('Notifications GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    const action = request.nextUrl.searchParams.get('action')
    const body = await request.json().catch(() => ({}))
    const { notificationIds } = body

    // Mark single notification as read via query params
    if (id && action === 'markRead') {
      await db.notification.update({
        where: { id },
        data: { isRead: true, readAt: new Date() },
      })
      return NextResponse.json({ success: true })
    }

    // Mark all as read for a user
    if (action === 'markAllRead') {
      const userId = request.nextUrl.searchParams.get('userId') || 'user-admin'
      await db.notification.updateMany({
        where: { receiverId: userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      })
      return NextResponse.json({ success: true })
    }

    // Batch mark as read via body
    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json({ error: 'notificationIds is required' }, { status: 400 })
    }

    const now = new Date()
    await db.notification.updateMany({
      where: { id: { in: notificationIds } },
      data: { isRead: true, readAt: now },
    })

    return NextResponse.json({ success: true, count: notificationIds.length })
  } catch (error) {
    console.error('Notifications PATCH error:', error)
    return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    const userId = request.nextUrl.searchParams.get('userId')

    if (id) {
      await db.notification.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    if (userId) {
      await db.notification.deleteMany({ where: { receiverId: userId } })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'id or userId is required' }, { status: 400 })
  } catch (error) {
    console.error('Notifications DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 })
  }
}

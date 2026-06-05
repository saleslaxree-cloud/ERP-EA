'use client'

import { useWorkflowStore } from '@/stores/workflow-store'
import { useQuery } from '@tanstack/react-query'

export function LaxreeNotifPanel() {
  const { notifPanelOpen, toggleNotifPanel, currentUser } = useWorkflowStore()

  const { data: notifData, refetch } = useQuery({
    queryKey: ['notifications-panel'],
    queryFn: () => fetch(`/api/notifications?userId=user-admin`).then(r => r.json()),
    refetchInterval: 30000,
  })

  const notifications = notifData?.notifications || []
  const unreadCount = notifications.filter((n: any) => !n.isRead).length

  const timeAgo = (iso: string) => {
    const d = Date.now() - new Date(iso).getTime()
    const m = Math.floor(d / 60000), h = Math.floor(d / 3600000), dy = Math.floor(d / 86400000)
    if (dy > 0) return dy + 'd ago'; if (h > 0) return h + 'h ago'; if (m > 0) return m + 'm ago'; return 'Just now'
  }

  if (!notifPanelOpen) return null

  return (
    <div className="np show">
      <div className="np-hdr">
        <span>🔔 Notifications</span>
        <div className="flex">
          <span style={{ fontSize: 11, color: 'var(--g2)', cursor: 'pointer', fontWeight: 700 }}>All read</span>
          <span style={{ fontSize: 11, color: 'var(--t3)', cursor: 'pointer', marginLeft: 10 }}>Clear</span>
        </div>
      </div>
      {notifications.length === 0 ? (
        <div className="np-empty">🎉 All caught up!</div>
      ) : notifications.slice(0, 25).map((n: any) => (
        <div key={n.id} className={`np-item${n.isRead ? '' : ' unread'}`}>
          <div className="np-title">{n.title}<br />
            <span style={{ fontWeight: 400, color: 'var(--t2)', fontSize: '11.5px' }}>{n.message}</span>
          </div>
          <div className="np-time">{n.createdAt ? timeAgo(n.createdAt) : ''}</div>
        </div>
      ))}
    </div>
  )
}

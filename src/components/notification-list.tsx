'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useWorkflowStore } from '@/stores/workflow-store'
import {
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MessageSquare,
  ArrowRightLeft,
  Clock,
  Shield,
  UserCheck,
  Mail,
  Check,
} from 'lucide-react'
import { useState } from 'react'
import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek } from 'date-fns'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  readAt: string | null
  createdAt: string
  workflowId: string | null
  sender: { id: string; name: string; role: string; avatar: string | null } | null
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'APPROVAL_REQUIRED':
      return <Shield className="h-5 w-5 text-amber-500" />
    case 'APPROVED':
      return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
    case 'REJECTED':
      return <XCircle className="h-5 w-5 text-red-500" />
    case 'ESCALATION':
      return <AlertTriangle className="h-5 w-5 text-rose-500" />
    case 'REMINDER':
      return <Clock className="h-5 w-5 text-amber-500" />
    case 'STATUS_CHANGE':
      return <ArrowRightLeft className="h-5 w-5 text-cyan-500" />
    case 'COMMENT':
      return <MessageSquare className="h-5 w-5 text-purple-500" />
    case 'DELEGATION':
      return <UserCheck className="h-5 w-5 text-violet-500" />
    default:
      return <Bell className="h-5 w-5 text-gray-500" />
  }
}

function getNotificationBg(type: string) {
  switch (type) {
    case 'APPROVAL_REQUIRED':
      return 'bg-amber-50'
    case 'APPROVED':
      return 'bg-emerald-50'
    case 'REJECTED':
      return 'bg-red-50'
    case 'ESCALATION':
      return 'bg-rose-50'
    case 'REMINDER':
      return 'bg-amber-50'
    case 'STATUS_CHANGE':
      return 'bg-cyan-50'
    case 'COMMENT':
      return 'bg-purple-50'
    case 'DELEGATION':
      return 'bg-violet-50'
    default:
      return 'bg-gray-50'
  }
}

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  if (isThisWeek(date)) return format(date, 'EEEE')
  return format(date, 'MMMM d, yyyy')
}

export function NotificationList() {
  const { currentUserId, setSelectedWorkflowId, setActiveView } = useWorkflowStore()
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<{
    notifications: Notification[]
    unreadCount: number
  }>({
    queryKey: ['notifications', currentUserId, typeFilter],
    queryFn: () => {
      const params = new URLSearchParams({ userId: currentUserId })
      if (typeFilter !== 'all') params.set('unreadOnly', 'true')
      return fetch(`/api/notifications?${params}`).then((r) => r.json())
    },
  })

  const markReadMutation = useMutation({
    mutationFn: (notificationIds: string[]) =>
      fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', currentUserId] })
    },
  })

  const handleMarkAllRead = () => {
    const unreadIds = data?.notifications.filter((n) => !n.isRead).map((n) => n.id) || []
    if (unreadIds.length > 0) {
      markReadMutation.mutate(unreadIds)
    }
  }

  const handleClickNotification = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate([notification.id])
    }
    if (notification.workflowId) {
      setSelectedWorkflowId(notification.workflowId)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-16 bg-gray-100 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const notifications = data?.notifications || []

  // Group by date
  const grouped = notifications.reduce<Record<string, Notification[]>>((acc, notif) => {
    const group = getDateGroup(notif.createdAt)
    if (!acc[group]) acc[group] = []
    acc[group].push(notif)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Notifications</SelectItem>
              <SelectItem value="unread">Unread Only</SelectItem>
            </SelectContent>
          </Select>
          {data?.unreadCount && data.unreadCount > 0 && (
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
              {data.unreadCount} unread
            </Badge>
          )}
        </div>
        {data?.unreadCount && data.unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            className="w-full sm:w-auto"
          >
            <Check className="h-4 w-4 mr-1" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* Notification List */}
      {notifications.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No notifications</p>
            <p className="text-sm text-gray-400 mt-1">You&apos;re all caught up!</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([group, items]) => (
          <div key={group}>
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 px-1">
              {group}
            </h3>
            <div className="space-y-2">
              {items.map((notification) => (
                <Card
                  key={notification.id}
                  className={`cursor-pointer hover:shadow-sm transition-all ${
                    !notification.isRead ? 'border-l-4 border-l-emerald-400' : ''
                  }`}
                  onClick={() => handleClickNotification(notification)}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg shrink-0 ${getNotificationBg(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${!notification.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          {notification.sender && (
                            <span className="text-[10px] text-gray-400">
                              From: {notification.sender.name}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-300">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

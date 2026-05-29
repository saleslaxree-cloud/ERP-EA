'use client'

import { useWorkflowStore } from '@/stores/workflow-store'
import { useQuery } from '@tanstack/react-query'
import { Menu, Bell, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface User {
  id: string
  name: string
  email: string
  role: string
  department: string | null
}

export function AppHeader() {
  const { currentUserId, setCurrentUserId, toggleSidebar } = useWorkflowStore()

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then((r) => r.json()),
  })

  const { data: notifData } = useQuery({
    queryKey: ['notifications-count', currentUserId],
    queryFn: () => fetch(`/api/notifications?userId=${currentUserId}`).then((r) => r.json()),
    refetchInterval: 30000,
  })

  const currentUser = users.find((u) => u.id === currentUserId)
  const unreadCount = notifData?.unreadCount || 0

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-emerald-100 text-emerald-700'
      case 'DIRECTOR': return 'bg-amber-100 text-amber-700'
      case 'EA': return 'bg-purple-100 text-purple-700'
      case 'MANAGER': return 'bg-cyan-100 text-cyan-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold text-gray-900 hidden sm:block">Enterprise Workflow Management</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => useWorkflowStore.getState().setActiveView('notifications')}
        >
          <Bell className="h-5 w-5 text-gray-500" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>

        {/* User selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2 max-w-[260px]">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                  {currentUser ? getInitials(currentUser.name) : '??'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-sm font-medium truncate">
                {currentUser?.name || 'Select User'}
              </span>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 hidden md:inline-flex ${getRoleBadgeColor(currentUser?.role || '')}`}>
                {currentUser?.role || ''}
              </Badge>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
            {users.map((user) => (
              <DropdownMenuItem
                key={user.id}
                onClick={() => setCurrentUserId(user.id)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className={`text-xs ${user.id === currentUserId ? 'bg-emerald-200 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-gray-400 truncate">{user.role} · {user.department}</p>
                </div>
                {user.id === currentUserId && (
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

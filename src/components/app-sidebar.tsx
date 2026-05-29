'use client'

import { useWorkflowStore } from '@/stores/workflow-store'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  GitBranch,
  CheckSquare,
  Bell,
  ShieldCheck,
  X,
  Workflow,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

const navItems = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'workflows' as const, label: 'Workflows', icon: GitBranch },
  { id: 'approvals' as const, label: 'Approvals', icon: ShieldCheck },
  { id: 'tasks' as const, label: 'Tasks', icon: CheckSquare },
  { id: 'notifications' as const, label: 'Notifications', icon: Bell },
]

export function AppSidebar() {
  const { activeView, setActiveView, sidebarOpen, setSidebarOpen } = useWorkflowStore()

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full bg-white border-r border-gray-200 transition-all duration-300 flex flex-col',
          'lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:w-64 lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600">
              <Workflow className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">WorkflowPro</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeView === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id)
                    setSidebarOpen(false)
                  }}
                  className={cn(
                    'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon className={cn('h-5 w-5', isActive ? 'text-emerald-600' : 'text-gray-400')} />
                  {item.label}
                </button>
              )
            })}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">WorkflowPro v1.0</p>
        </div>
      </aside>
    </>
  )
}

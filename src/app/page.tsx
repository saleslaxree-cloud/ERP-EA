'use client'

import { useWorkflowStore } from '@/stores/workflow-store'
import { AppSidebar } from '@/components/app-sidebar'
import { AppHeader } from '@/components/app-header'
import { WorkflowDashboard } from '@/components/workflow-dashboard'
import { WorkflowList } from '@/components/workflow-list'
import { ApprovalList } from '@/components/approval-list'
import { TaskList } from '@/components/task-list'
import { NotificationList } from '@/components/notification-list'

function ActiveView() {
  const { activeView } = useWorkflowStore()

  switch (activeView) {
    case 'dashboard':
      return <WorkflowDashboard />
    case 'workflows':
      return <WorkflowList />
    case 'approvals':
      return <ApprovalList />
    case 'tasks':
      return <TaskList />
    case 'notifications':
      return <NotificationList />
    default:
      return <WorkflowDashboard />
  }
}

function ViewTitle({ view }: { view: string }) {
  const titles: Record<string, string> = {
    dashboard: 'Dashboard',
    workflows: 'Workflows',
    approvals: 'Approvals',
    tasks: 'Tasks',
    notifications: 'Notifications',
  }
  return <h2 className="text-xl font-bold text-gray-900">{titles[view] || 'Dashboard'}</h2>
}

export default function HomePage() {
  const { activeView } = useWorkflowStore()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            <div className="mb-6">
              <ViewTitle view={activeView} />
            </div>
            <ActiveView />
          </div>
        </main>
      </div>
    </div>
  )
}

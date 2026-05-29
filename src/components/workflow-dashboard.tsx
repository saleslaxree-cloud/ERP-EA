'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useWorkflowStore } from '@/stores/workflow-store'
import {
  GitBranch,
  ShieldCheck,
  CheckSquare,
  AlertTriangle,
  TrendingUp,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { StatusBadge } from '@/components/status-badge'
import { WorkflowStatus } from '@prisma/client'
import { formatDistanceToNow } from 'date-fns'

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  IN_REVIEW: '#0ea5e9',
  APPROVED: '#10b981',
  REJECTED: '#ef4444',
  IN_PROGRESS: '#06b6d4',
  ON_HOLD: '#a855f7',
  ESCALATED: '#f43f5e',
  COMPLETED: '#22c55e',
  CANCELLED: '#64748b',
  DRAFT: '#94a3b8',
  RE_OPENED: '#f97316',
  EXTERNAL_HOLD: '#8b5cf6',
}

interface DashboardData {
  statusCounts: Record<string, number>
  totalWorkflows: number
  pendingApprovals: number
  activeTasks: number
  overdueTasks: number
  escalationCount: number
  completionRate: number
  recentActivities: {
    id: string
    fromStatus: WorkflowStatus
    toStatus: WorkflowStatus
    changedBy: string | null
    reason: string | null
    createdAt: string
    workflow: { id: string; title: string }
  }[]
}

export function WorkflowDashboard() {
  const { currentUserId, setActiveView } = useWorkflowStore()

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard', currentUserId],
    queryFn: () => fetch(`/api/dashboard?userId=${currentUserId}`).then((r) => r.json()),
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-gray-100 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!data) return null

  const pieData = Object.entries(data.statusCounts)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value }))

  const stats = [
    {
      title: 'Total Workflows',
      value: data.totalWorkflows,
      icon: GitBranch,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      onClick: () => setActiveView('workflows'),
    },
    {
      title: 'Pending Approvals',
      value: data.pendingApprovals,
      icon: ShieldCheck,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      onClick: () => setActiveView('approvals'),
    },
    {
      title: 'Active Tasks',
      value: data.activeTasks,
      icon: CheckSquare,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      onClick: () => setActiveView('tasks'),
    },
    {
      title: 'Escalations',
      value: data.escalationCount,
      icon: AlertTriangle,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      onClick: () => setActiveView('workflows'),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card
              key={stat.title}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={stat.onClick}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-500">{stat.title}</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Workflow Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={STATUS_COLORS[entry.name] || '#94a3b8'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [value, name.replace('_', ' ')]}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                    <Legend
                      formatter={(value: string) => value.replace('_', ' ')}
                      wrapperStyle={{ fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-gray-400">
                No workflow data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2">
              {data.recentActivities.length > 0 ? (
                data.recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="mt-0.5">
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.workflow.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <StatusBadge status={activity.fromStatus} />
                        <span className="text-gray-400 text-xs">→</span>
                        <StatusBadge status={activity.toStatus} />
                      </div>
                      {activity.reason && (
                        <p className="text-xs text-gray-500 mt-1 truncate">{activity.reason}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  No recent activity
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue & Completion Rate */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className={data.overdueTasks > 0 ? 'border-red-200 bg-red-50/50' : ''}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-800">Overdue Tasks</p>
                <p className="text-2xl font-bold text-red-900">{data.overdueTasks}</p>
              </div>
            </div>
            {data.overdueTasks > 0 && (
              <p className="text-xs text-red-600 mt-2">
                You have overdue items that need attention
              </p>
            )}
            {data.overdueTasks === 0 && (
              <p className="text-xs text-emerald-600 mt-2">
                All tasks are on track!
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{data.completionRate}%</p>
              </div>
            </div>
            <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-emerald-500 rounded-full h-2 transition-all"
                style={{ width: `${data.completionRate}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

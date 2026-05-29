'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge, PriorityBadge } from '@/components/status-badge'
import { useWorkflowStore } from '@/stores/workflow-store'
import { Plus, Search, Eye } from 'lucide-react'
import { WorkflowStatus } from '@prisma/client'
import { useState } from 'react'
import { WorkflowDetail } from '@/components/workflow-detail'
import { CreateWorkflowDialog } from '@/components/create-workflow-dialog'
import { formatDistanceToNow, format } from 'date-fns'

interface Workflow {
  id: string
  title: string
  description: string | null
  status: WorkflowStatus
  priority: string
  currentStepOrder: number
  dueDate: string | null
  createdAt: string
  template: { id: string; name: string; category: string }
  creator: { id: string; name: string; email: string; role: string }
  steps: {
    id: string
    name: string
    order: number
    status: WorkflowStatus
    assignee: { id: string; name: string } | null
  }[]
  _count: { approvals: number; comments: number }
}

export function WorkflowList() {
  const { currentUserId, selectedWorkflowId, setSelectedWorkflowId } = useWorkflowStore()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const { data: workflows = [], isLoading } = useQuery<Workflow[]>({
    queryKey: ['workflows', statusFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      return fetch(`/api/workflows?${params}`).then((r) => r.json())
    },
  })

  const queryClient = useQueryClient()

  const filteredWorkflows = workflows.filter(
    (w) =>
      w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.creator.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getCurrentStep = (workflow: Workflow) => {
    const step = workflow.steps.find(
      (s) => s.order === workflow.currentStepOrder
    )
    return step?.name || '-'
  }

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-12 bg-gray-100 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="IN_REVIEW">In Review</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="ESCALATED">Escalated</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="ON_HOLD">On Hold</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Workflow
        </Button>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Current Step</TableHead>
                <TableHead>Creator</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkflows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                    No workflows found
                  </TableCell>
                </TableRow>
              ) : (
                filteredWorkflows.map((workflow) => (
                  <TableRow
                    key={workflow.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedWorkflowId(workflow.id)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{workflow.title}</p>
                        <p className="text-xs text-gray-400">{workflow.template.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={workflow.status} />
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={workflow.priority} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{getCurrentStep(workflow)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{workflow.creator.name}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(workflow.createdAt), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell>
                      {workflow.dueDate ? (
                        <span
                          className={`text-xs ${
                            isOverdue(workflow.dueDate) ? 'text-red-600 font-medium' : 'text-gray-500'
                          }`}
                        >
                          {format(new Date(workflow.dueDate), 'MMM d, yyyy')}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4 text-gray-400" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredWorkflows.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-400">
              No workflows found
            </CardContent>
          </Card>
        ) : (
          filteredWorkflows.map((workflow) => (
            <Card
              key={workflow.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedWorkflowId(workflow.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{workflow.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{workflow.template.name}</p>
                  </div>
                  <StatusBadge status={workflow.status} />
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <PriorityBadge priority={workflow.priority} />
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">{workflow.creator.name}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">
                    Step: {getCurrentStep(workflow)}
                  </span>
                  {workflow.dueDate && (
                    <span
                      className={`text-xs ${
                        isOverdue(workflow.dueDate) ? 'text-red-600 font-medium' : 'text-gray-400'
                      }`}
                    >
                      Due: {format(new Date(workflow.dueDate), 'MMM d')}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Workflow Detail Drawer */}
      {selectedWorkflowId && (
        <WorkflowDetail
          workflowId={selectedWorkflowId}
          onClose={() => setSelectedWorkflowId(null)}
        />
      )}

      {/* Create Workflow Dialog */}
      <CreateWorkflowDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={() => {
          setShowCreateDialog(false)
          queryClient.invalidateQueries({ queryKey: ['workflows'] })
        }}
      />
    </div>
  )
}

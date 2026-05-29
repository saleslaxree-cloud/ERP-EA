'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge, PriorityBadge } from '@/components/status-badge'
import { ApprovalActionDialog } from '@/components/approval-action-dialog'
import { useWorkflowStore } from '@/stores/workflow-store'
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
} from 'lucide-react'
import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { WorkflowStatus } from '@prisma/client'

interface StepInstance {
  id: string
  name: string
  stepType: string
  order: number
  status: WorkflowStatus
  slaDeadline: string | null
  isEscalated: boolean
  workflow: {
    id: string
    title: string
    description: string | null
    status: WorkflowStatus
    priority: string
    dueDate: string | null
    createdAt: string
    creator: { id: string; name: string; email: string; role: string }
  }
  assignee: { id: string; name: string; email: string; role: string } | null
  approvals: {
    id: string
    action: WorkflowStatus
    comments: string | null
    createdAt: string
    approver: { id: string; name: string; role: string }
  }[]
}

interface ApprovalHistory {
  id: string
  action: WorkflowStatus
  comments: string | null
  level: number
  isDelegated: boolean
  createdAt: string
  workflow: { id: string; title: string; status: WorkflowStatus; priority: string }
  stepInstance: { id: string; name: string; order: number }
}

export function ApprovalList() {
  const { currentUserId, setSelectedWorkflowId, setActiveView } = useWorkflowStore()
  const [actionDialog, setActionDialog] = useState<{
    stepInstanceId: string
    workflowId: string
    workflowTitle: string
    stepName: string
  } | null>(null)

  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<{
    pending: StepInstance[]
    history: ApprovalHistory[]
  }>({
    queryKey: ['approvals', currentUserId],
    queryFn: () => fetch(`/api/approvals?userId=${currentUserId}`).then((r) => r.json()),
  })

  const isOverdue = (date: string | null) => {
    if (!date) return false
    return new Date(date) < new Date()
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-24 bg-gray-100 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const pendingItems = data?.pending.filter(
    (s) => s.status === WorkflowStatus.PENDING || s.status === WorkflowStatus.IN_REVIEW
  ) || []
  const historyItems = data?.history || []

  return (
    <div className="space-y-4">
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="gap-1">
            <ShieldCheck className="h-4 w-4" />
            Pending
            {pendingItems.length > 0 && (
              <Badge className="ml-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">
                {pendingItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1">
            <CheckCircle2 className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">All caught up!</p>
                <p className="text-sm text-gray-400 mt-1">No pending approvals</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingItems.map((step) => (
                <Card key={step.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-gray-900 truncate">
                            {step.workflow.title}
                          </h3>
                          {step.isEscalated && (
                            <Badge className="bg-rose-100 text-rose-700 text-[10px]">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Escalated
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <StatusBadge status={step.workflow.status} />
                          <PriorityBadge priority={step.workflow.priority} />
                        </div>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Step:</span> {step.name}
                          </p>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Requested by {step.workflow.creator.name}
                          </p>
                          {step.slaDeadline && (
                            <p
                              className={`text-sm flex items-center gap-1 ${
                                isOverdue(step.slaDeadline) ? 'text-red-600 font-medium' : 'text-gray-500'
                              }`}
                            >
                              <Clock className="h-3 w-3" />
                              {isOverdue(step.slaDeadline) ? 'Overdue! ' : 'SLA: '}
                              {formatDistanceToNow(new Date(step.slaDeadline), {
                                addSuffix: !isOverdue(step.slaDeadline),
                              })}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex sm:flex-col gap-2 shrink-0">
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-initial"
                          onClick={() =>
                            setActionDialog({
                              stepInstanceId: step.id,
                              workflowId: step.workflow.id,
                              workflowTitle: step.workflow.title,
                              stepName: step.name,
                            })
                          }
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50 flex-1 sm:flex-initial"
                          onClick={() =>
                            setActionDialog({
                              stepInstanceId: step.id,
                              workflowId: step.workflow.id,
                              workflowTitle: step.workflow.title,
                              stepName: step.name,
                            })
                          }
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {historyItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-400">No approval history yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {historyItems.map((approval) => (
                <Card key={approval.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {approval.workflow.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          Step: {approval.stepInstance.name}
                        </p>
                        {approval.comments && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            &quot;{approval.comments}&quot;
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={approval.action} />
                        <span className="text-xs text-gray-300 whitespace-nowrap">
                          {formatDistanceToNow(new Date(approval.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Approval Action Dialog */}
      {actionDialog && (
        <ApprovalActionDialog
          stepInstanceId={actionDialog.stepInstanceId}
          workflowId={actionDialog.workflowId}
          workflowTitle={actionDialog.workflowTitle}
          stepName={actionDialog.stepName}
          onClose={() => setActionDialog(null)}
          onSuccess={() => {
            setActionDialog(null)
            queryClient.invalidateQueries({ queryKey: ['approvals', currentUserId] })
            queryClient.invalidateQueries({ queryKey: ['workflows'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard', currentUserId] })
          }}
        />
      )}
    </div>
  )
}

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge, PriorityBadge } from '@/components/status-badge'
import { useWorkflowStore } from '@/stores/workflow-store'
import {
  Plus,
  Clock,
  ChevronRight,
  ChevronDown,
  Link2,
  CheckCircle2,
  Play,
  AlertTriangle,
} from 'lucide-react'
import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { WorkflowStatus } from '@prisma/client'

interface TaskItem {
  id: string
  title: string
  description: string | null
  status: WorkflowStatus
  priority: string
  dueDate: string | null
  completedAt: string | null
  createdAt: string
  ownerId: string
  parentTaskId: string | null
  workflowId: string | null
  owner: { id: string; name: string; email: string; role: string; avatar: string | null }
  workflow: { id: string; title: string; status: WorkflowStatus } | null
  subTasks: {
    id: string
    title: string
    status: WorkflowStatus
    priority: string
    owner: { id: string; name: string }
  }[]
  dependencies: {
    id: string
    dependencyType: string
    dependsOnTask: { id: string; title: string; status: WorkflowStatus }
  }[]
  dependents: {
    id: string
    dependencyType: string
    task: { id: string; title: string; status: WorkflowStatus }
  }[]
}

export function TaskList() {
  const { currentUserId } = useWorkflowStore()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const queryClient = useQueryClient()

  const { data: tasks = [], isLoading } = useQuery<TaskItem[]>({
    queryKey: ['tasks', currentUserId, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ userId: currentUserId })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      return fetch(`/api/tasks?${params}`).then((r) => r.json())
    },
  })

  const taskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: WorkflowStatus }) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update task')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] })
    },
  })

  const toggleExpand = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  const isOverdue = (dueDate: string | null, status: WorkflowStatus) => {
    if (!dueDate || status === WorkflowStatus.COMPLETED) return false
    return new Date(dueDate) < new Date()
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-20 bg-gray-100 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="ON_HOLD">On Hold</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Task List */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No tasks found</p>
            <p className="text-sm text-gray-400 mt-1">Create a new task to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  {/* Expand button for subtasks */}
                  {task.subTasks.length > 0 ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 mt-0.5 shrink-0"
                      onClick={() => toggleExpand(task.id)}
                    >
                      {expandedTasks.has(task.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  ) : (
                    <div className="w-6 shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-gray-900">{task.title}</h3>
                      {task.workflow && (
                        <Badge variant="outline" className="text-[10px]">
                          {task.workflow.title}
                        </Badge>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-500 mt-0.5 truncate">{task.description}</p>
                    )}

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                      {task.dueDate && (
                        <span
                          className={`text-xs flex items-center gap-1 ${
                            isOverdue(task.dueDate, task.status)
                              ? 'text-red-600 font-medium'
                              : 'text-gray-400'
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          {isOverdue(task.dueDate, task.status) ? 'Overdue: ' : 'Due: '}
                          {format(new Date(task.dueDate), 'MMM d')}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {task.owner.name}
                      </span>
                    </div>

                    {/* Dependencies */}
                    {task.dependencies.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 flex-wrap">
                        <Link2 className="h-3 w-3 text-gray-400" />
                        <span className="text-[10px] text-gray-400">Depends on:</span>
                        {task.dependencies.map((dep) => (
                          <Badge
                            key={dep.id}
                            variant="outline"
                            className={`text-[10px] ${
                              dep.dependsOnTask.status === WorkflowStatus.COMPLETED
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                : 'bg-amber-50 text-amber-600 border-amber-200'
                            }`}
                          >
                            {dep.dependsOnTask.title}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-3">
                      {task.status === WorkflowStatus.PENDING && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-cyan-600 border-cyan-300 hover:bg-cyan-50 h-7 text-xs"
                          onClick={() =>
                            taskMutation.mutate({ taskId: task.id, status: WorkflowStatus.IN_PROGRESS })
                          }
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Start
                        </Button>
                      )}
                      {task.status === WorkflowStatus.IN_PROGRESS && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
                          onClick={() =>
                            taskMutation.mutate({ taskId: task.id, status: WorkflowStatus.COMPLETED })
                          }
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Complete
                        </Button>
                      )}
                    </div>

                    {/* Subtasks */}
                    {expandedTasks.has(task.id) && task.subTasks.length > 0 && (
                      <div className="mt-3 pl-4 border-l-2 border-gray-200 space-y-2">
                        {task.subTasks.map((sub) => (
                          <div key={sub.id} className="flex items-center gap-2">
                            <StatusBadge status={sub.status} />
                            <span className="text-sm text-gray-700">{sub.title}</span>
                            <span className="text-xs text-gray-400">{sub.owner.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error display for task mutations */}
      {taskMutation.isError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <p className="text-sm text-red-600">
            {taskMutation.error instanceof Error ? taskMutation.error.message : 'Failed to update task'}
          </p>
        </div>
      )}

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={() => {
          setShowCreateDialog(false)
          queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] })
        }}
      />
    </div>
  )
}

function CreateTaskDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const { currentUserId } = useWorkflowStore()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [dueDate, setDueDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then((r) => r.json()),
  })

  const [ownerId, setOwnerId] = useState(currentUserId)

  const handleSubmit = async () => {
    if (!title.trim()) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          priority,
          ownerId,
          dueDate: dueDate || null,
        }),
      })
      if (res.ok) {
        resetForm()
        onSuccess()
      }
    } catch (error) {
      console.error('Failed to create task:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setPriority('MEDIUM')
    setDueDate('')
    setOwnerId(currentUserId)
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="Enter task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Describe the task"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Assign To</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {users.map((user: { id: string; name: string; role: string }) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleSubmit}
            disabled={!title.trim() || isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Task'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

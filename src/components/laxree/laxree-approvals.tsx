'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWorkflowStore } from '@/stores/workflow-store'
import { useState } from 'react'

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft', PENDING: 'Pending', IN_REVIEW: 'In Review', APPROVED: 'Approved',
  REJECTED: 'Rejected', IN_PROGRESS: 'In Progress', ON_HOLD: 'On Hold',
  ESCALATED: 'Escalated', COMPLETED: 'Completed', CANCELLED: 'Cancelled', EXTERNAL_HOLD: 'External Hold',
}

const statusBadgeStyle: Record<string, { bg: string; color: string }> = {
  PENDING: { bg: 'var(--amber-l)', color: 'var(--amber)' },
  IN_REVIEW: { bg: 'var(--blue-l)', color: 'var(--blue)' },
  IN_PROGRESS: { bg: 'var(--amber-l)', color: 'var(--amber)' },
  ON_HOLD: { bg: 'var(--purple-l)', color: 'var(--purple)' },
  APPROVED: { bg: 'var(--green-l)', color: 'var(--green)' },
  COMPLETED: { bg: 'var(--green-l)', color: 'var(--green)' },
  ESCALATED: { bg: 'var(--red-l)', color: 'var(--red)' },
  REJECTED: { bg: 'var(--red-l)', color: 'var(--red)' },
  CANCELLED: { bg: 'var(--bg3)', color: 'var(--t3)' },
  EXTERNAL_HOLD: { bg: '#FFF7ED', color: '#C2410C' },
}

const avatarColors = ['#B45309','#6D28D9','#0F766E','#1D4ED8','#BE123C','#15803D','#C2410C','#7C3AED']
function avatarColor(name: string) { let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h); return avatarColors[Math.abs(h) % avatarColors.length] }
function getInitials(name: string) { return name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '?' }

export function LaxreeApprovals() {
  const { currentUser, addToast, currentUserId } = useWorkflowStore()
  const queryClient = useQueryClient()
  const [comment, setComment] = useState('')
  const [actionWorkflow, setActionWorkflow] = useState<string | null>(null)
  const [approvalTab, setApprovalTab] = useState('pending')

  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows-approvals'],
    queryFn: () => fetch('/api/workflows').then(r => r.json()),
  })

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-approvals'],
    queryFn: () => fetch('/api/tasks').then(r => r.json()),
  })

  const { data: approvals = [] } = useQuery({
    queryKey: ['approvals'],
    queryFn: () => fetch('/api/approvals?userId=user-admin').then(r => r.json()),
  })

  const approveMutation = useMutation({
    mutationFn: (data: any) => fetch('/api/approvals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
      queryClient.invalidateQueries({ queryKey: ['tasks-approvals'] })
      addToast('ok', 'Action completed')
      setComment('')
      setActionWorkflow(null)
    },
  })

  const taskStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      addToast('ok', 'Task status updated')
      setActionWorkflow(null)
    },
  })

  // Get tasks needing approval - PENDING and IN_PROGRESS tasks
  const pendingTasks = Array.isArray(tasks) ? tasks.filter((t: any) =>
    t.status === 'PENDING' || t.status === 'IN_PROGRESS'
  ) : []

  const awaitingDirector = Array.isArray(tasks) ? tasks.filter((t: any) =>
    t.status === 'ON_HOLD'
  ) : []

  const completedTasks = Array.isArray(tasks) ? tasks.filter((t: any) =>
    t.status === 'COMPLETED'
  ) : []

  const pendingEA = workflows.filter((w: any) => w.status === 'PENDING' || w.status === 'IN_REVIEW')
  const directorActions = workflows.filter((w: any) => w.status === 'ESCALATED' || w.status === 'ON_HOLD')

  const tabs = [
    { id: 'pending', label: 'Pending Review', count: pendingTasks.length + pendingEA.length },
    { id: 'director', label: 'Awaiting Director', count: awaitingDirector.length },
    { id: 'actions', label: 'Director Actions', count: directorActions.length },
    { id: 'completed', label: 'Completed', count: completedTasks.length },
  ]

  const handleApprove = (workflowId: string, action: string) => {
    approveMutation.mutate({
      workflowId,
      action: action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : 'ON_HOLD',
      comments: comment,
      approverId: currentUserId,
      stepInstanceId: workflowId,
    })
  }

  const handleTaskAction = (taskId: string, action: string) => {
    let newStatus = 'IN_PROGRESS'
    if (action === 'approve') newStatus = 'COMPLETED'
    else if (action === 'reject') newStatus = 'REJECTED'
    else if (action === 'return') newStatus = 'PENDING'
    else if (action === 'director') newStatus = 'ON_HOLD'
    else if (action === 'done') newStatus = 'COMPLETED'

    taskStatusMutation.mutate({ id: taskId, status: newStatus })
  }

  const renderTaskCard = (task: any) => {
    const sBadge = statusBadgeStyle[task.status] || statusBadgeStyle.PENDING
    const owner = task.owner
    const stepsTotal = task.taskSteps?.length || 0
    const stepsDone = task.taskSteps?.filter((s: any) => s.status === 'COMPLETED').length || 0

    return (
      <div key={task.id} style={{
        background: 'var(--card)', border: '1.5px solid var(--gbr)', borderRadius: 'var(--r)',
        padding: 16, marginBottom: 10, transition: 'all .15s',
        borderLeft: `3px solid ${sBadge.color}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div className="av" style={{ background: avatarColor(owner?.name || 'T'), width: 34, height: 34, fontSize: 12 }}>
            {getInitials(owner?.name || 'T')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{task.title}</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
              {owner?.name || 'Unassigned'} · {owner?.department || '—'} · {statusLabels[task.status] || task.status}
            </div>
          </div>
          <span className="badge" style={{ background: sBadge.bg, color: sBadge.color, fontWeight: 700, fontSize: 10 }}>
            {statusLabels[task.status] || task.status}
          </span>
        </div>

        {/* Task info */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {task.department && <span className="badge b-gray" style={{ fontSize: 9 }}>{task.department}</span>}
          {task.category && <span className="badge" style={{ fontSize: 9, background: 'var(--amber-l)', color: 'var(--amber)' }}>{task.category}</span>}
          {task.frequency && <span className="badge" style={{ fontSize: 9, background: 'var(--blue-l)', color: 'var(--blue)' }}>🔄 {task.frequency}</span>}
          <span className="badge" style={{ fontSize: 9, background: task.priority === 'HIGH' || task.priority === 'CRITICAL' ? 'var(--red-l)' : 'var(--bg2)', color: task.priority === 'HIGH' || task.priority === 'CRITICAL' ? 'var(--red)' : 'var(--t3)' }}>
            {task.priority}
          </span>
        </div>

        {/* Steps progress */}
        {stepsTotal > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 700, marginBottom: 4 }}>Steps: {stepsDone}/{stepsTotal}</div>
            <div className="prog-bg" style={{ height: 5 }}>
              <div style={{ width: `${(stepsDone / stepsTotal) * 100}%`, background: stepsDone === stepsTotal ? 'var(--green)' : 'var(--g2)', height: '100%', borderRadius: 3, transition: 'width .3s' }} />
            </div>
          </div>
        )}

        {/* Workflow flow */}
        <div className="wf-flow" style={{ marginBottom: 10, fontSize: 11 }}>
          <span className="wf-stage wf-stage-ea" style={{ padding: '3px 8px', fontSize: 9 }}>EA Review</span>
          <span className="wf-arrow">→</span>
          <span className="wf-stage wf-stage-dir" style={{ padding: '3px 8px', fontSize: 9 }}>Director</span>
          <span className="wf-arrow">→</span>
          <span className="wf-stage wf-stage-done" style={{ padding: '3px 8px', fontSize: 9 }}>Done</span>
        </div>

        {/* Action buttons */}
        {actionWorkflow === task.id ? (
          <div style={{ marginTop: 10 }}>
            <textarea className="fi" placeholder="Add comment (optional)..." value={comment}
              onChange={e => setComment(e.target.value)} style={{ minHeight: 60, marginBottom: 8, fontSize: 12 }} />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="btn btn-green btn-sm" onClick={() => handleTaskAction(task.id, 'approve')}>✓ Approve & Complete</button>
              <button className="btn btn-red btn-sm" onClick={() => handleTaskAction(task.id, 'reject')}>✕ Reject</button>
              <button className="btn btn-sm" style={{ background: 'var(--purple-l)', color: 'var(--purple)', border: '1px solid var(--purple)' }} onClick={() => handleTaskAction(task.id, 'director')}>📤 Send to Director</button>
              <button className="btn btn-sm" style={{ background: 'var(--amber-l)', color: 'var(--amber)', border: '1px solid var(--amber)' }} onClick={() => handleTaskAction(task.id, 'return')}>↩ Return</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setActionWorkflow(null); setComment('') }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              className="btn btn-sm"
              style={{ background: 'var(--green-l)', color: 'var(--green)', border: '1px solid var(--green)', fontWeight: 700 }}
              onClick={() => setActionWorkflow(task.id)}
            >
              ✓ Review & Act
            </button>
            {task.status === 'IN_PROGRESS' && (
              <button
                className="btn btn-sm"
                style={{ background: 'var(--green-l)', color: 'var(--green)', border: '1px solid rgba(21,128,61,.3)', fontWeight: 700 }}
                onClick={() => handleTaskAction(task.id, 'done')}
              >
                ✓ Mark Done
              </button>
            )}
            {task.status === 'PENDING' && (
              <button
                className="btn btn-sm"
                style={{ background: 'var(--purple-l)', color: 'var(--purple)', border: '1px solid rgba(109,40,217,.3)', fontWeight: 700 }}
                onClick={() => handleTaskAction(task.id, 'director')}
              >
                📤 Send to Director
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  const currentList = approvalTab === 'pending' ? pendingTasks
    : approvalTab === 'director' ? awaitingDirector
    : approvalTab === 'actions' ? directorActions
    : completedTasks

  return (
    <>
      <div className="ph">
        <div className="ph-left">
          <h2>Approval Center</h2>
          <p>Review and manage task approvals · EA → Director routing</p>
        </div>
      </div>

      <div className="page-accent" />

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 14 }}>
        {tabs.map(tab => (
          <div key={tab.id} className={`tab${approvalTab === tab.id ? ' active' : ''}`}
            onClick={() => setApprovalTab(tab.id)}>
            {tab.label}
            {tab.count > 0 && <span className="tab-cnt">{tab.count}</span>}
          </div>
        ))}
      </div>

      {/* Pending approval pulse */}
      {pendingTasks.length > 0 && approvalTab === 'pending' && (
        <div className="alert alert-gold" style={{ marginBottom: 14 }}>
          <div className="alert-icon">🔔</div>
          <div className="alert-body">
            <div className="alert-title" style={{ color: 'var(--g2)' }}>{pendingTasks.length} Item(s) Pending Review</div>
            <div className="alert-sub">Employee work submissions awaiting verification</div>
          </div>
          <span className="alert-cnt" style={{ background: 'var(--amber)', animation: 'ap-pulse 2s infinite' }}>{pendingTasks.length}</span>
        </div>
      )}

      {/* Task approval cards */}
      {currentList.length === 0 ? (
        <div className="empty">
          <h3>No items in this category</h3>
          <p>All caught up! No items pending review.</p>
        </div>
      ) : (
        currentList.map(renderTaskCard)
      )}

      {/* Completed history */}
      {approvalTab === 'completed' && (
        <div className="lcard" style={{ marginTop: 14 }}>
          <div className="ch"><div className="ct">📜 Completed Tasks</div></div>
          <div className="cb">
            {completedTasks.length === 0 ? (
              <div className="empty"><p>No completed tasks yet</p></div>
            ) : completedTasks.map((task: any) => (
              <div key={task.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--b1)', alignItems: 'center' }}>
                <div className="av" style={{ background: 'var(--green)' }}>✓</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{task.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>{task.owner?.name || 'Unassigned'} · {task.completedAt ? new Date(task.completedAt).toLocaleString() : ''}</div>
                </div>
                <span className="badge b-green" style={{ fontSize: 9 }}>Completed</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

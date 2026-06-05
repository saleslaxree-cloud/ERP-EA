'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWorkflowStore } from '@/stores/workflow-store'
import { useState } from 'react'

export function LaxreeApprovals() {
  const { currentUser, approvalTab, setApprovalTab } = useWorkflowStore()
  const queryClient = useQueryClient()
  const [comment, setComment] = useState('')
  const [actionWorkflow, setActionWorkflow] = useState<string | null>(null)

  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows-approvals'],
    queryFn: () => fetch('/api/workflows').then(r => r.json()),
  })

  const { data: approvals = [] } = useQuery({
    queryKey: ['approvals'],
    queryFn: () => fetch('/api/approvals?userId=user-admin').then(r => r.json()),
  })

  const approveMutation = useMutation({
    mutationFn: (data: any) => fetch('/api/approvals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['workflows-approvals'] }); queryClient.invalidateQueries({ queryKey: ['approvals'] }) },
  })

  const pendingEA = workflows.filter((w: any) => w.status === 'PENDING' || w.status === 'IN_REVIEW')
  const awaitingDirector = workflows.filter((w: any) => w.status === 'APPROVED' && w.currentStepOrder > 0)
  const directorActions = workflows.filter((w: any) => w.status === 'ESCALATED' || w.status === 'ON_HOLD')
  const history = approvals.pending?.concat(approvals.history || []) || []

  const tabs = [
    { id: 'pending', label: 'Pending EA Review', count: pendingEA.length },
    { id: 'director', label: 'Awaiting Director', count: awaitingDirector.length },
    { id: 'actions', label: 'Director Actions', count: directorActions.length },
    { id: 'history', label: 'History', count: 0 },
  ]

  const statusLabels: Record<string, string> = {
    DRAFT: 'Draft', PENDING: 'Pending', IN_REVIEW: 'In Review', APPROVED: 'Approved',
    REJECTED: 'Rejected', IN_PROGRESS: 'In Progress', ON_HOLD: 'On Hold',
    ESCALATED: 'Escalated', COMPLETED: 'Completed', CANCELLED: 'Cancelled', EXTERNAL_HOLD: 'External Hold',
  }

  const handleApprove = (workflowId: string, action: string) => {
    approveMutation.mutate({
      workflowId,
      action: action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : 'ON_HOLD',
      comments: comment,
      approverId: 'user-admin',
      stepInstanceId: workflowId,
    })
    setComment('')
    setActionWorkflow(null)
  }

  const renderWorkflowCard = (w: any) => (
    <div key={w.id} className="dd-card dd-approval-pending" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div className="av" style={{ background: 'var(--g2)' }}>{(w.title || 'W')[0]}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{w.title}</div>
          <div style={{ fontSize: 11, color: 'var(--t3)' }}>Step {w.currentStepOrder} · {statusLabels[w.status] || w.status}</div>
        </div>
        <span className={`badge s-${w.status?.toLowerCase()}`}>{statusLabels[w.status] || w.status}</span>
      </div>

      {/* Workflow flow indicator */}
      <div className="wf-flow">
        <span className="wf-stage wf-stage-ea">EA Review</span>
        <span className="wf-arrow">→</span>
        <span className="wf-stage wf-stage-dir">Director</span>
        <span className="wf-arrow">→</span>
        <span className="wf-stage wf-stage-done">Done</span>
      </div>

      {w.description && (
        <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 8 }}>{w.description}</div>
      )}

      {w.dueDate && (
        <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8 }}>
          Due: {new Date(w.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          {new Date(w.dueDate) < new Date() && <span style={{ color: 'var(--red)', fontWeight: 700, marginLeft: 6 }}>OVERDUE</span>}
        </div>
      )}

      {/* Action buttons */}
      {actionWorkflow === w.id ? (
        <div style={{ marginTop: 10 }}>
          <textarea className="fi" placeholder="Add comment (optional)..." value={comment}
            onChange={e => setComment(e.target.value)} style={{ minHeight: 60, marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="dd-btn-dir-approve" onClick={() => handleApprove(w.id, 'approve')}>✓ Approve</button>
            <button className="dd-btn-dir-reject" onClick={() => handleApprove(w.id, 'reject')}>✕ Reject</button>
            <button className="dd-btn-dir-hold" onClick={() => handleApprove(w.id, 'hold')}>⏸ Hold</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setActionWorkflow(null)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="dd-action-bar">
          <button className="dd-btn-verify" onClick={() => setActionWorkflow(w.id)}>✓ Verify & Approve</button>
          <button className="dd-btn-send-dir">📤 Send to Director</button>
          <button className="dd-btn-return-emp">↩ Return</button>
          <button className="dd-btn-notes">📝 Notes</button>
        </div>
      )}
    </div>
  )

  const currentList = approvalTab === 'pending' ? pendingEA
    : approvalTab === 'director' ? awaitingDirector
    : approvalTab === 'actions' ? directorActions
    : []

  return (
    <>
      <div className="ph">
        <div className="ph-left">
          <h2>Approval Center</h2>
          <p>Review and manage workflow approvals · EA → Director routing</p>
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
      {pendingEA.length > 0 && approvalTab === 'pending' && (
        <div className="alert alert-gold" style={{ marginBottom: 14 }}>
          <div className="alert-icon">🔔</div>
          <div className="alert-body">
            <div className="alert-title" style={{ color: 'var(--g2)' }}>{pendingEA.length} Approval(s) Pending EA Review</div>
            <div className="alert-sub">Employee work submissions awaiting verification</div>
          </div>
          <span className="alert-cnt ap-pending-ring">{pendingEA.length}</span>
        </div>
      )}

      {/* Workflow cards */}
      {currentList.length === 0 ? (
        <div className="empty">
          <h3>No items in this category</h3>
          <p>All caught up! No workflows pending review.</p>
        </div>
      ) : (
        currentList.map(renderWorkflowCard)
      )}

      {/* Approval History */}
      {approvalTab === 'history' && (
        <div className="card">
          <div className="ch"><div className="ct">📜 Approval History</div></div>
          <div className="cb">
            {history.length === 0 ? (
              <div className="empty"><p>No approval history yet</p></div>
            ) : history.map((a: any) => (
              <div key={a.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--b1)' }}>
                <div className="av" style={{ background: a.action === 'APPROVED' ? 'var(--green)' : 'var(--red)' }}>
                  {a.action === 'APPROVED' ? '✓' : '✕'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{a.action}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>{a.comments || 'No comment'} · {a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

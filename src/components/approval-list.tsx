'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useWorkflowStore } from '@/stores/workflow-store'

interface Approval {
  id: string
  action: string
  comments: string | null
  level: number
  isDelegated: boolean
  createdAt: string
  stepInstance: {
    id: string
    name: string
    stepType: string
    status: string
    workflow: { id: string; title: string }
  }
  approver: { name: string; role: string; department: string | null }
}

export function ApprovalList() {
  const { currentUserId } = useWorkflowStore()
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending')
  const [actionDialog, setActionDialog] = useState<{ approval: Approval; action: 'APPROVED' | 'REJECTED' } | null>(null)
  const [comment, setComment] = useState('')
  const queryClient = useQueryClient()

  const { data: approvals = [], isLoading } = useQuery<Approval[]>({
    queryKey: ['approvals', currentUserId],
    queryFn: () => fetch(`/api/approvals?userId=${currentUserId}`).then(r => r.json()),
  })

  const actionMutation = useMutation({
    mutationFn: (data: { approvalId: string; action: string; comments: string }) =>
      fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setActionDialog(null)
      setComment('')
    },
  })

  const pendingApprovals = approvals.filter(a => a.action === 'PENDING' || a.stepInstance?.status === 'PENDING')
  const historyApprovals = approvals.filter(a => a.action !== 'PENDING' && a.stepInstance?.status !== 'PENDING')

  const displayList = activeTab === 'pending' ? pendingApprovals : historyApprovals

  const getBadgeClass = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 's-pending', IN_PROGRESS: 's-inprog', COMPLETED: 's-done',
      APPROVED: 'b-green', REJECTED: 'b-red', ON_HOLD: 's-waiting',
    }
    return map[status] || 'b-gray'
  }

  if (isLoading) {
    return (
      <div>
        <div className="ph"><div className="ph-left"><h2>Approvals</h2></div></div>
        <div className="lcard"><div className="cb" style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>Loading approvals…</div></div>
      </div>
    )
  }

  return (
    <div>
      {/* Page Header */}
      <div className="ph">
        <div className="ph-left">
          <h2>Approval Center</h2>
          <p>Department-wise task completion reviews — intelligent workflow engine</p>
        </div>
        <div className="ph-right">
          <span className="badge b-gold" style={{ fontSize: 12, padding: '5px 14px' }}>
            {pendingApprovals.length} Pending
          </span>
        </div>
      </div>
      <div className="page-accent" />

      {/* Workflow Flow Diagram */}
      <div className="lcard" style={{ padding: '14px 18px', marginBottom: 14, background: 'linear-gradient(135deg,var(--g5),var(--card))' }}>
        <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--g2)', marginBottom: 10 }}>Workflow Engine</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
          <div style={{ background: 'var(--blue-l)', color: 'var(--blue)', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800 }}>👤 Employee</div>
          <span style={{ color: 'var(--g3)', fontSize: 14, fontWeight: 900 }}>→</span>
          <div style={{ background: 'var(--amber-l)', color: 'var(--amber)', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800 }}>📋 EA Review</div>
          <span style={{ color: 'var(--g3)', fontSize: 14, fontWeight: 900 }}>→</span>
          <div style={{ background: 'var(--purple-l)', color: 'var(--purple)', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800 }}>👔 Director</div>
          <span style={{ color: 'var(--g3)', fontSize: 14, fontWeight: 900 }}>→</span>
          <div style={{ background: 'var(--green-l)', color: 'var(--green)', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800 }}>✅ Complete</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 14 }}>
        <div className={`tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
          Pending <span className="tab-cnt">{pendingApprovals.length}</span>
        </div>
        <div className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          History <span className="tab-cnt">{historyApprovals.length}</span>
        </div>
      </div>

      {/* Approval Cards */}
      {displayList.length > 0 ? displayList.map(a => (
        <div key={a.id} className="appr-card">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div className="ua" style={{ width: 32, height: 32, fontSize: 11 }}>
              {a.approver?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
            </div>
            <div className="appr-info">
              <div className="appr-title">{a.stepInstance?.workflow?.title || 'Workflow'}</div>
              <div className="appr-meta" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
                <span className={`badge ${getBadgeClass(a.stepInstance?.status || 'PENDING')}`}>
                  {(a.stepInstance?.status || 'PENDING').replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: 10, color: 'var(--t4)' }}>
                  Step: {a.stepInstance?.name || '—'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--t4)' }}>
                  Approver: {a.approver?.name || '—'}
                </span>
              </div>
              {a.comments && (
                <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 4, fontStyle: 'italic' }}>
                  &ldquo;{a.comments}&rdquo;
                </div>
              )}
              <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4 }}>
                {new Date(a.createdAt).toLocaleString()}
              </div>
            </div>
          </div>

          {activeTab === 'pending' && (
            <div className="appr-actions">
              <button
                className="btn btn-green btn-sm"
                onClick={() => setActionDialog({ approval: a, action: 'APPROVED' })}
              >
                ✓ Approve
              </button>
              <button
                className="btn btn-red btn-sm"
                onClick={() => setActionDialog({ approval: a, action: 'REJECTED' })}
              >
                ✕ Reject
              </button>
            </div>
          )}
        </div>
      )) : (
        <div className="lcard">
          <div className="cb empty">
            <h3>{activeTab === 'pending' ? 'No pending approvals' : 'No approval history'}</h3>
            <p>{activeTab === 'pending' ? 'All caught up! No approvals pending.' : 'Approval actions will appear here once processed.'}</p>
          </div>
        </div>
      )}

      {/* Action Dialog */}
      {actionDialog && (
        <div className="overlay show" onClick={e => { if (e.target === e.currentTarget) setActionDialog(null) }}>
          <div className="modal modal-sm">
            <button className="mx" onClick={() => setActionDialog(null)}>✕</button>
            <div className="mt">
              {actionDialog.action === 'APPROVED' ? '✓ Approve' : '✕ Reject'} Step
            </div>
            <div className="ms">
              {actionDialog.approval.stepInstance?.workflow?.title} — {actionDialog.approval.stepInstance?.name}
            </div>

            <div className="fg">
              <label>Comment</label>
              <textarea
                className="fi"
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder={actionDialog.action === 'APPROVED' ? 'Optional approval comments…' : 'Reason for rejection…'}
                rows={3}
              />
            </div>

            <div className="form-actions">
              <button className="btn btn-out" onClick={() => setActionDialog(null)}>Cancel</button>
              <button
                className={`btn ${actionDialog.action === 'APPROVED' ? 'btn-green' : 'btn-red'}`}
                onClick={() => actionMutation.mutate({
                  approvalId: actionDialog.approval.id,
                  action: actionDialog.action,
                  comments: comment,
                })}
              >
                {actionMutation.isPending ? 'Processing…' : actionDialog.action === 'APPROVED' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

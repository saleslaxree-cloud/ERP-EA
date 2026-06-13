'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWorkflowStore } from '@/stores/workflow-store'
import { useState } from 'react'

export function LaxreeLeaveManagement() {
  const { currentUserId, addToast } = useWorkflowStore()
  const queryClient = useQueryClient()
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [eaRemarkMap, setEaRemarkMap] = useState<Record<string, string>>({})

  // Fetch all leaves
  const { data: leavesData = { leaves: [] } } = useQuery({
    queryKey: ['all-leaves', filterStatus],
    queryFn: () => {
      const url = filterStatus === 'ALL' ? '/api/leaves' : `/api/leaves?status=${filterStatus}`
      return fetch(url).then(r => r.json())
    },
  })

  const leaves = leavesData.leaves || []

  // Approve/reject mutation
  const actionMutation = useMutation({
    mutationFn: ({ leaveId, action, eaRemark }: { leaveId: string; action: string; eaRemark?: string }) =>
      fetch(`/api/leaves/${leaveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, approvedById: currentUserId, eaRemark: eaRemark || null }),
      }).then(r => r.json()),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['all-leaves'] })
      addToast('ok', `Leave ${variables.action === 'approve' ? 'approved' : 'rejected'}`)
    },
    onError: () => addToast('err', 'Failed to update leave'),
  })

  // Stats
  const pendingCount = leaves.filter((l: any) => l.status === 'PENDING').length
  const approvedCount = leaves.filter((l: any) => l.status === 'APPROVED').length
  const rejectedCount = leaves.filter((l: any) => l.status === 'REJECTED').length
  const lateCount = leaves.filter((l: any) => l.applicationTag === 'LA').length

  const leaveStatusStyle: Record<string, { bg: string; color: string; label: string }> = {
    PENDING: { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
    APPROVED: { bg: '#DCFCE7', color: '#15803D', label: 'Approved' },
    REJECTED: { bg: '#FEE2E2', color: '#DC2626', label: 'Rejected' },
    CANCELLED: { bg: '#F3F4F6', color: '#6B7280', label: 'Cancelled' },
  }

  const tabs = [
    { id: 'ALL', label: 'All', count: leaves.length },
    { id: 'PENDING', label: 'Pending', count: pendingCount },
    { id: 'APPROVED', label: 'Approved', count: approvedCount },
    { id: 'REJECTED', label: 'Rejected', count: rejectedCount },
  ]

  return (
    <>
      <div className="ph">
        <div className="ph-left">
          <h2>Leave Management</h2>
          <p>Review and manage employee leave applications</p>
        </div>
        <div className="ph-right">
          <span className="badge" style={{ background: '#FEE2E2', color: 'var(--red)', fontWeight: 800, padding: '4px 12px', fontSize: 11 }}>
            ⚠ LA (Late): {lateCount}
          </span>
          <span className="badge" style={{ background: 'var(--green-l)', color: 'var(--green)', fontWeight: 800, padding: '4px 12px', fontSize: 11 }}>
            ✓ AL (On Time): {leaves.filter((l: any) => l.applicationTag === 'AL').length}
          </span>
        </div>
      </div>
      <div className="page-accent" />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        <div className="lcard" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)', marginBottom: 4 }}>Pending</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--amber)' }}>{pendingCount}</div>
        </div>
        <div className="lcard" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)', marginBottom: 4 }}>Approved</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--green)' }}>{approvedCount}</div>
        </div>
        <div className="lcard" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)', marginBottom: 4 }}>Rejected</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--red)' }}>{rejectedCount}</div>
        </div>
        <div className="lcard" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)', marginBottom: 4 }}>Late Apps (LA)</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#DC2626' }}>{lateCount}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="tabs" style={{ marginBottom: 14 }}>
        {tabs.map(tab => (
          <div key={tab.id} className={`tab${filterStatus === tab.id ? ' active' : ''}`}
            onClick={() => setFilterStatus(tab.id)}>
            {tab.label}
            {tab.count > 0 && <span className="tab-cnt">{tab.count}</span>}
          </div>
        ))}
      </div>

      {/* Leave Applications */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {leaves.length === 0 ? (
          <div className="lcard">
            <div className="cb" style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🏖️</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>No leave applications found</div>
            </div>
          </div>
        ) : leaves.map((leave: any) => {
          const lsStyle = leaveStatusStyle[leave.status] || leaveStatusStyle.PENDING
          const isPending = leave.status === 'PENDING'
          const isLate = leave.applicationTag === 'LA'
          const userName = leave.user?.name || 'Unknown'
          const userDept = leave.user?.department || ''

          return (
            <div key={leave.id} className="lcard" style={{
              borderLeft: `4px solid ${isLate ? '#DC2626' : isPending ? 'var(--amber)' : 'var(--green)'}`,
            }}>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Avatar */}
                  <div className="av" style={{
                    width: 40, height: 40, fontSize: 13,
                    background: isLate ? '#DC2626' : 'var(--g2)', flexShrink: 0,
                  }}>
                    {userName.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase()}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--t1)' }}>{userName}</span>
                      {userDept && <span className="badge b-gray" style={{ fontSize: 9, padding: '1px 6px' }}>{userDept}</span>}
                      <span className="badge" style={{
                        fontSize: 10, padding: '2px 8px', fontWeight: 900, letterSpacing: 0.5,
                        background: isLate ? '#FEE2E2' : 'var(--green-l)',
                        color: isLate ? '#DC2626' : 'var(--green)',
                      }}>
                        {isLate ? '⚠ LA' : '✓ AL'}
                      </span>
                      <span className="badge" style={{ fontSize: 9, padding: '2px 8px', background: lsStyle.bg, color: lsStyle.color, fontWeight: 700 }}>
                        {lsStyle.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--t3)', flexWrap: 'wrap' }}>
                      <span><b>{leave.leaveType}</b> Leave</span>
                      <span>{new Date(leave.fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} → {new Date(leave.toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                      <span style={{ fontWeight: 700 }}>{leave.totalDays} day{leave.totalDays > 1 ? 's' : ''}</span>
                    </div>

                    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--t2)', lineHeight: 1.5 }}>
                      <b>Reason:</b> {leave.reason}
                    </div>

                    {leave.eaRemark && (
                      <div style={{ marginTop: 4, fontSize: 11, color: 'var(--t3)', fontStyle: 'italic' }}>
                        EA Remark: {leave.eaRemark}
                      </div>
                    )}

                    {leave.approvedBy && (
                      <div style={{ marginTop: 2, fontSize: 10, color: 'var(--t4)' }}>
                        {leave.status === 'APPROVED' ? 'Approved' : 'Rejected'} by {leave.approvedBy.name}
                        {leave.approvedAt && ` on ${new Date(leave.approvedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {isPending && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, minWidth: 160 }}>
                      <input
                        className="fi"
                        type="text"
                        placeholder="EA Remark (optional)"
                        value={eaRemarkMap[leave.id] || ''}
                        onChange={e => setEaRemarkMap(prev => ({ ...prev, [leave.id]: e.target.value }))}
                        style={{ fontSize: 11, padding: '6px 8px' }}
                      />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-xs"
                          style={{ background: 'var(--green-l)', color: 'var(--green)', border: '1.5px solid var(--green)', fontWeight: 800, flex: 1 }}
                          onClick={() => actionMutation.mutate({
                            leaveId: leave.id, action: 'approve', eaRemark: eaRemarkMap[leave.id],
                          })}
                        >
                          ✓ Approve
                        </button>
                        <button
                          className="btn btn-xs"
                          style={{ background: '#FEE2E2', color: '#DC2626', border: '1.5px solid #DC2626', fontWeight: 700, flex: 1 }}
                          onClick={() => actionMutation.mutate({
                            leaveId: leave.id, action: 'reject', eaRemark: eaRemarkMap[leave.id],
                          })}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

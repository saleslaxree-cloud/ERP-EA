'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWorkflowStore } from '@/stores/workflow-store'
import { useState } from 'react'

export function LaxreeEmployeeDashboard() {
  const { currentUserId, currentUserName, currentRole, addToast } = useWorkflowStore()
  const queryClient = useQueryClient()

  // Leave apply form
  const [leaveType, setLeaveType] = useState('CASUAL')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [leaveReason, setLeaveReason] = useState('')
  const [showLeaveForm, setShowLeaveForm] = useState(false)

  // Fetch employee's tasks (read-only) — ONLY tasks assigned to this employee
  const { data: tasksData = [] } = useQuery({
    queryKey: ['emp-tasks', currentUserId],
    queryFn: () => fetch(`/api/tasks?userId=${currentUserId}`).then(r => r.json()),
    enabled: !!currentUserId,
  })

  // Fetch employee's leaves
  const { data: leavesData = { leaves: [] } } = useQuery({
    queryKey: ['emp-leaves', currentUserId],
    queryFn: () => fetch(`/api/leaves?userId=${currentUserId}`).then(r => r.json()),
    enabled: !!currentUserId,
  })

  const tasks = Array.isArray(tasksData) ? tasksData : []
  const leaves = Array.isArray(leavesData) ? leavesData : (leavesData.leaves || [])

  // Apply leave mutation
  const applyLeaveMutation = useMutation({
    mutationFn: (data: any) => fetch('/api/leaves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json()),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['emp-leaves', currentUserId] })
      const tag = data.leave?.applicationTag || 'AL'
      addToast('ok', `Leave applied! Tag: ${tag === 'AL' ? 'AL (On Time)' : 'LA (Late)'}`)
      setFromDate(''); setToDate(''); setLeaveReason(''); setShowLeaveForm(false)
    },
    onError: () => addToast('err', 'Failed to apply leave'),
  })

  // Stats
  const activeTasks = tasks.filter((t: any) => t.status === 'IN_PROGRESS' || t.status === 'PENDING' || t.status === 'ON_HOLD')
  const completedTasks = tasks.filter((t: any) => t.status === 'COMPLETED')
  const pendingLeaves = leaves.filter((l: any) => l.status === 'PENDING')
  const approvedLeaves = leaves.filter((l: any) => l.status === 'APPROVED')

  const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
    PENDING: { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
    IN_PROGRESS: { bg: '#DBEAFE', color: '#1D4ED8', label: 'In Progress' },
    COMPLETED: { bg: '#DCFCE7', color: '#15803D', label: 'Done' },
    CANCELLED: { bg: '#F3F4F6', color: '#6B7280', label: 'Cancelled' },
    ON_HOLD: { bg: '#EDE9FE', color: '#6D28D9', label: 'On Hold' },
  }

  const leaveStatusStyle: Record<string, { bg: string; color: string; label: string }> = {
    PENDING: { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
    APPROVED: { bg: '#DCFCE7', color: '#15803D', label: 'Approved' },
    REJECTED: { bg: '#FEE2E2', color: '#DC2626', label: 'Rejected' },
    CANCELLED: { bg: '#F3F4F6', color: '#6B7280', label: 'Cancelled' },
  }

  return (
    <>
      <div className="ph">
        <div className="ph-left">
          <h2>My Dashboard</h2>
          <p>Welcome, {currentUserName || 'Employee'}</p>
        </div>
        <div className="ph-right">
          <button className="btn btn-gold" onClick={() => setShowLeaveForm(!showLeaveForm)}>
            {showLeaveForm ? '✕ Cancel' : '+ Apply Leave'}
          </button>
        </div>
      </div>
      <div className="page-accent" />

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        <div className="lcard" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)', marginBottom: 4 }}>Active Tasks</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--blue)' }}>{activeTasks.length}</div>
        </div>
        <div className="lcard" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)', marginBottom: 4 }}>Completed</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--green)' }}>{completedTasks.length}</div>
        </div>
        <div className="lcard" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)', marginBottom: 4 }}>Pending Leaves</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--amber)' }}>{pendingLeaves.length}</div>
        </div>
        <div className="lcard" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)', marginBottom: 4 }}>Approved Leaves</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--green)' }}>{approvedLeaves.length}</div>
        </div>
      </div>

      {/* Leave Application Form */}
      {showLeaveForm && (
        <div className="lcard" style={{ marginBottom: 16, borderLeft: '4px solid var(--g2)' }}>
          <div className="ch"><div className="ct">📝 Apply for Leave</div></div>
          <div className="cb">
            <div className="form-row fr-3">
              <div className="fg">
                <label>Leave Type</label>
                <select className="sel" value={leaveType} onChange={e => setLeaveType(e.target.value)}>
                  <option value="CASUAL">Casual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="EARNED">Earned Leave</option>
                  <option value="HALF_DAY">Half Day</option>
                </select>
              </div>
              <div className="fg">
                <label>From Date</label>
                <input className="fi" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="fg">
                <label>To Date</label>
                <input className="fi" type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                  min={fromDate || new Date().toISOString().split('T')[0]} />
              </div>
            </div>
            <div className="fg" style={{ marginTop: 10 }}>
              <label>Reason</label>
              <textarea className="fi" rows={3} placeholder="Enter reason for leave..." value={leaveReason}
                onChange={e => setLeaveReason(e.target.value)} style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
              <button className="btn" style={{ background: 'var(--bg2)', color: 'var(--t2)' }}
                onClick={() => setShowLeaveForm(false)}>Cancel</button>
              <button className="btn btn-gold" disabled={!fromDate || !toDate || !leaveReason.trim()}
                onClick={() => applyLeaveMutation.mutate({
                  userId: currentUserId,
                  leaveType,
                  fromDate,
                  toDate,
                  reason: leaveReason.trim(),
                })}>
                {applyLeaveMutation.isPending ? 'Applying...' : 'Submit Leave'}
              </button>
            </div>
            <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 8, padding: '6px 10px', background: 'var(--bg2)', borderRadius: 6 }}>
              <b>AL</b> = Applied on time (1 day before) · <span style={{ color: 'var(--red)', fontWeight: 700 }}>LA</span> = Late Application (same day/less than 1 day before)
            </div>
          </div>
        </div>
      )}

      {/* My Tasks — Read Only */}
      <div className="lcard" style={{ marginBottom: 16 }}>
        <div className="ch">
          <div className="ct">📋 My Assigned Tasks</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--t4)', background: 'var(--bg2)', padding: '2px 8px', borderRadius: 4 }}>
              🔒 Read Only
            </span>
            <span className="badge b-blue" style={{ fontSize: 10 }}>{tasks.length}</span>
          </div>
        </div>
        <div className="cb" style={{ padding: 0 }}>
          {tasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--t3)' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📋</div>
              <div style={{ fontWeight: 700 }}>No tasks assigned to you</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Tasks will appear here when assigned by Arti Sharma</div>
            </div>
          ) : (
            <div className="tw">
              <table className="ltable">
                <thead>
                  <tr><th>Task</th><th>Priority</th><th>Status</th><th>Due</th><th>Steps</th></tr>
                </thead>
                <tbody>
                  {tasks.map((task: any) => {
                    const sStyle = statusStyle[task.status] || statusStyle.PENDING
                    const stepsTotal = task.taskSteps?.length || 0
                    const stepsDone = task.taskSteps?.filter((s: any) => s.status === 'COMPLETED').length || 0
                    return (
                      <tr key={task.id}>
                        <td style={{ fontWeight: 600 }}>{task.title}</td>
                        <td>
                          <span className="badge" style={{
                            fontSize: 9, padding: '2px 8px',
                            background: task.priority === 'HIGH' || task.priority === 'CRITICAL' ? '#FEF2F2' : task.priority === 'MEDIUM' ? '#FFFBEB' : '#EFF6FF',
                            color: task.priority === 'HIGH' || task.priority === 'CRITICAL' ? '#DC2626' : task.priority === 'MEDIUM' ? '#D97706' : '#2563EB',
                            fontWeight: 700,
                          }}>
                            {task.priority || 'MEDIUM'}
                          </span>
                        </td>
                        <td><span className="badge" style={{ fontSize: 9, padding: '2px 8px', background: sStyle.bg, color: sStyle.color, fontWeight: 700 }}>{sStyle.label}</span></td>
                        <td style={{ fontSize: 11, color: 'var(--t3)' }}>
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                        </td>
                        <td style={{ fontSize: 11 }}>
                          {stepsTotal > 0 ? (
                            <span style={{ fontWeight: 700, color: stepsDone === stepsTotal ? 'var(--green)' : 'var(--blue)' }}>
                              {stepsDone}/{stepsTotal}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {/* Read-only notice */}
          <div style={{ padding: '8px 16px', background: 'var(--bg2)', borderTop: '1px solid var(--b1)', fontSize: 10, color: 'var(--t4)', fontWeight: 600 }}>
            🔒 Only Arti Sharma can mark tasks as Done or Revise. You can view your assigned tasks here.
          </div>
        </div>
      </div>

      {/* My Leaves */}
      <div className="lcard">
        <div className="ch">
          <div className="ct">🏖️ My Leaves</div>
          <span className="badge b-gold" style={{ fontSize: 10 }}>{leaves.length}</span>
        </div>
        <div className="cb" style={{ padding: 0 }}>
          {leaves.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--t3)' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>🏖️</div>
              <div style={{ fontWeight: 700 }}>No leaves applied</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Click "Apply Leave" to request time off</div>
            </div>
          ) : (
            <div className="tw">
              <table className="ltable">
                <thead>
                  <tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Tag</th><th>Status</th><th>EA Remark</th></tr>
                </thead>
                <tbody>
                  {leaves.map((leave: any) => {
                    const lsStyle = leaveStatusStyle[leave.status] || leaveStatusStyle.PENDING
                    return (
                      <tr key={leave.id}>
                        <td style={{ fontWeight: 600, fontSize: 11 }}>{leave.leaveType}</td>
                        <td style={{ fontSize: 11 }}>{new Date(leave.fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                        <td style={{ fontSize: 11 }}>{new Date(leave.toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                        <td style={{ fontSize: 11, fontWeight: 700 }}>{leave.totalDays}</td>
                        <td style={{ fontSize: 11, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{leave.reason}</td>
                        <td>
                          <span className="badge" style={{
                            fontSize: 10, padding: '2px 8px', fontWeight: 900, letterSpacing: 0.5,
                            background: leave.applicationTag === 'AL' ? 'var(--green-l)' : '#FEE2E2',
                            color: leave.applicationTag === 'AL' ? 'var(--green)' : 'var(--red)',
                          }}>
                            {leave.applicationTag === 'AL' ? '✓ AL' : '⚠ LA'}
                          </span>
                        </td>
                        <td><span className="badge" style={{ fontSize: 9, padding: '2px 8px', background: lsStyle.bg, color: lsStyle.color, fontWeight: 700 }}>{lsStyle.label}</span></td>
                        <td style={{ fontSize: 10, color: 'var(--t3)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{leave.eaRemark || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

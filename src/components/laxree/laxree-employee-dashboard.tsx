'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useWorkflowStore } from '@/stores/workflow-store'
import { useState } from 'react'

export function LaxreeEmployeeDashboard() {
  const { currentUserId, currentUserName, currentRole, addToast, setActivePage } = useWorkflowStore()
  const queryClient = useQueryClient()

  // Tab navigation for employee dashboard
  const [empTab, setEmpTab] = useState<'overview' | 'tasks' | 'scorecard'>('overview')

  // Fetch employee's tasks (read-only) — ONLY tasks assigned to this employee
  const { data: tasksData = [] } = useQuery({
    queryKey: ['emp-tasks', currentUserId],
    queryFn: () => fetch(`/api/tasks?ownerId=${currentUserId}`).then(r => r.json()),
    enabled: !!currentUserId,
  })

  // Fetch employee's leaves
  const { data: leavesData = { leaves: [] } } = useQuery({
    queryKey: ['emp-leaves', currentUserId],
    queryFn: async () => {
      const res = await fetch(`/api/leaves?userId=${currentUserId}`)
      if (!res.ok) throw new Error('Failed to fetch leaves')
      return res.json()
    },
    enabled: !!currentUserId,
    refetchOnMount: 'always',
    staleTime: 0,
  })

  // Fetch employee's weekly score
  const getWeekInfo = () => {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(now.setDate(diff))
    const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000)
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    return { monday, sunday, weekNum, year: now.getFullYear() }
  }

  const weekInfo = getWeekInfo()

  const { data: scoreData } = useQuery({
    queryKey: ['emp-score', currentUserId],
    queryFn: () => fetch(
      `/api/weekly-score?userId=${currentUserId}&weekStart=${weekInfo.monday.toISOString()}&weekEnd=${weekInfo.sunday.toISOString()}`
    ).then(r => r.json()),
    enabled: !!currentUserId,
  })

  const tasks = Array.isArray(tasksData) ? tasksData : []
  const leaves = Array.isArray(leavesData) ? leavesData : (leavesData.leaves || [])
  const score = scoreData as any

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
    ESCALATED: { bg: '#FEE2E2', color: '#DC2626', label: 'Escalated' },
    EXTERNAL_HOLD: { bg: '#EDE9FE', color: '#6D28D9', label: 'Ext Hold' },
  }

  const leaveStatusStyle: Record<string, { bg: string; color: string; label: string }> = {
    PENDING: { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
    APPROVED: { bg: '#DCFCE7', color: '#15803D', label: 'Approved' },
    REJECTED: { bg: '#FEE2E2', color: '#DC2626', label: 'Rejected' },
    CANCELLED: { bg: '#F3F4F6', color: '#6B7280', label: 'Cancelled' },
  }

  const tabItems = [
    { id: 'overview' as const, label: 'Overview', icon: '📊' },
    { id: 'tasks' as const, label: 'My Tasks', icon: '📋' },
    { id: 'scorecard' as const, label: 'My Scorecard', icon: '📈' },
  ]

  return (
    <>
      <div className="ph">
        <div className="ph-left">
          <h2>My Dashboard</h2>
          <p>Welcome, {currentUserName || 'Employee'}</p>
        </div>
        <div className="ph-right">
          <button className="btn" style={{ fontSize: 11, padding: '6px 14px', background: 'rgba(109,40,217,.1)', color: '#6D28D9', fontWeight: 800, border: '1px solid rgba(109,40,217,.3)' }}
            onClick={() => setActivePage('ai-assistant')}>
            🤖 AI Assistant
          </button>
          <button className="btn btn-gold" onClick={() => setActivePage('emp-leaves')}>
            🏖️ Leave Management
          </button>
        </div>
      </div>
      <div className="page-accent" />

      {/* Tab Navigation */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {tabItems.map(tab => (
          <div key={tab.id} className={`tab${empTab === tab.id ? ' active' : ''}`}
            onClick={() => setEmpTab(tab.id)}>
            <span style={{ marginRight: 4 }}>{tab.icon}</span> {tab.label}
            {tab.id === 'tasks' && activeTasks.length > 0 && <span className="tab-cnt">{activeTasks.length}</span>}
          </div>
        ))}
      </div>

      {/* ===================== OVERVIEW TAB ===================== */}
      {empTab === 'overview' && (
        <>
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
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)', marginBottom: 4 }}>PR Score</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: score?.prScore >= 70 ? 'var(--green)' : score?.prScore >= 40 ? 'var(--amber)' : 'var(--red)' }}>{score?.prScore || 0}</div>
            </div>
          </div>

          {/* Quick Overview: Recent Tasks */}
          <div className="lcard" style={{ marginBottom: 16 }}>
            <div className="ch">
              <div className="ct">📋 Recent Assigned Tasks</div>
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
                      {tasks.slice(0, 5).map((task: any) => {
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

          {/* Quick Leave Overview */}
          <div className="lcard" style={{ marginBottom: 16 }}>
            <div className="ch">
              <div className="ct">🏖️ My Recent Leaves</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button className="btn" style={{ fontSize: 10, padding: '3px 10px', background: 'var(--gb)', color: 'var(--g2)', fontWeight: 700 }}
                  onClick={() => setActivePage('emp-leaves')}>
                  View All & Apply
                </button>
                <span className="badge b-gold" style={{ fontSize: 10 }}>{leaves.length}</span>
              </div>
            </div>
            <div className="cb" style={{ padding: 0 }}>
              {leaves.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--t3)' }}>
                  <div style={{ fontWeight: 700 }}>No leaves applied</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>
                    <button className="btn" style={{ fontSize: 11, padding: '4px 12px', background: 'var(--gb)', color: 'var(--g2)', fontWeight: 700 }}
                      onClick={() => setActivePage('emp-leaves')}>
                      Go to Leave Management →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="tw">
                  <table className="ltable">
                    <thead>
                      <tr><th>Type</th><th>From</th><th>To</th><th>Tag</th><th>Status</th><th>EA Remark</th></tr>
                    </thead>
                    <tbody>
                      {leaves.slice(0, 5).map((leave: any) => {
                        const lsStyle = leaveStatusStyle[leave.status] || leaveStatusStyle.PENDING
                        return (
                          <tr key={leave.id}>
                            <td style={{ fontWeight: 600, fontSize: 11 }}>{leave.leaveType}</td>
                            <td style={{ fontSize: 11 }}>{new Date(leave.fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                            <td style={{ fontSize: 11 }}>{new Date(leave.toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
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
                            <td style={{ fontSize: 10, color: 'var(--t3)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{leave.eaRemark || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Quick Score Overview */}
          <div className="lcard">
            <div className="ch">
              <div className="ct">📈 My Weekly Score</div>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--t4)', background: 'var(--bg2)', padding: '2px 8px', borderRadius: 4 }}>
                Week {weekInfo.weekNum}
              </span>
            </div>
            <div className="cb">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
                <div style={{ textAlign: 'center', padding: '12px 8px', borderRadius: 8, background: '#FEF2F2' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: '#DC2626', marginBottom: 2 }}>Red</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#DC2626' }}>{score?.redScore || 0}%</div>
                </div>
                <div style={{ textAlign: 'center', padding: '12px 8px', borderRadius: 8, background: '#FFFBEB' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: '#D97706', marginBottom: 2 }}>Yellow</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#D97706' }}>{score?.yellowScore || 0}%</div>
                </div>
                <div style={{ textAlign: 'center', padding: '12px 8px', borderRadius: 8, background: '#DCFCE7' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: '#15803D', marginBottom: 2 }}>Green</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#15803D' }}>{score?.greenScore || 0}%</div>
                </div>
              </div>
              <div style={{ padding: '8px 12px', borderRadius: 8, background: score?.prScore >= 70 ? 'var(--green-l)' : score?.prScore >= 40 ? 'var(--amber-l)' : 'var(--red-l)', textAlign: 'center' }}>
                <div style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', color: 'var(--t3)' }}>PR Score</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: score?.prScore >= 70 ? 'var(--green)' : score?.prScore >= 40 ? 'var(--amber)' : 'var(--red)' }}>{score?.prScore || 0}</div>
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: 'var(--t3)' }}>
                <span style={{ color: '#22C55E' }}>✓ On time: {score?.completedOnTime || 0}</span> ·{' '}
                <span style={{ color: '#F59E0B' }}>◐ In progress/Late: {(score?.inProgressOnTrack || 0) + (score?.completedLate || 0)}</span> ·{' '}
                <span style={{ color: '#EF4444' }}>✕ Overdue: {score?.overdue || 0}</span> ·{' '}
                <span style={{ fontWeight: 700 }}>Total: {score?.totalTasks || 0}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===================== MY TASKS TAB (READ ONLY) ===================== */}
      {empTab === 'tasks' && (
        <div className="lcard">
          <div className="ch">
            <div className="ct">📋 My Assigned Tasks</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--t4)', background: 'var(--bg2)', padding: '2px 8px', borderRadius: 4 }}>
                🔒 Read Only — Cannot Edit or Mark Done
              </span>
              <span className="badge b-blue" style={{ fontSize: 10 }}>{tasks.length}</span>
            </div>
          </div>
          <div className="cb" style={{ padding: 0 }}>
            {tasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>No tasks assigned to you</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Tasks will appear here when assigned by Arti Sharma (EA)</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {tasks.map((task: any) => {
                  const sStyle = statusStyle[task.status] || statusStyle.PENDING
                  const stepsTotal = task.taskSteps?.length || 0
                  const stepsDone = task.taskSteps?.filter((s: any) => s.status === 'COMPLETED').length || 0
                  const stepsAllDone = stepsTotal > 0 && stepsDone === stepsTotal
                  const isCompleted = task.status === 'COMPLETED'
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted

                  return (
                    <div key={task.id} style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--b1)',
                      background: isCompleted ? 'rgba(22,163,74,.03)' : isOverdue ? 'rgba(220,38,38,.03)' : undefined,
                    }}>
                      {/* Task header row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        {/* Status dot */}
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                          background: isCompleted ? 'var(--green)' : isOverdue ? 'var(--red)' : task.status === 'IN_PROGRESS' ? 'var(--blue)' : 'var(--amber)',
                        }} />

                        {/* Title */}
                        <div style={{ flex: 1, fontWeight: 700, fontSize: 13, color: 'var(--t1)' }}>
                          {isCompleted && '✅ '}{task.title}
                        </div>

                        {/* Priority badge */}
                        <span className="badge" style={{
                          fontSize: 9, padding: '2px 8px',
                          background: task.priority === 'HIGH' || task.priority === 'CRITICAL' ? '#FEF2F2' : task.priority === 'MEDIUM' ? '#FFFBEB' : '#EFF6FF',
                          color: task.priority === 'HIGH' || task.priority === 'CRITICAL' ? '#DC2626' : task.priority === 'MEDIUM' ? '#D97706' : '#2563EB',
                          fontWeight: 700,
                        }}>
                          {task.priority || 'MEDIUM'}
                        </span>

                        {/* Status badge */}
                        <span className="badge" style={{ fontSize: 9, padding: '2px 8px', background: sStyle.bg, color: sStyle.color, fontWeight: 700 }}>
                          {sStyle.label}
                        </span>
                      </div>

                      {/* Task meta */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--t3)', marginLeft: 18, flexWrap: 'wrap' }}>
                        {task.department && (
                          <span><span className="badge b-gray" style={{ fontSize: 9, padding: '1px 6px' }}>{task.department}</span></span>
                        )}
                        {task.dueDate && (
                          <span style={isOverdue ? { color: 'var(--red)', fontWeight: 700 } : {}}>
                            Due: {new Date(task.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            {isOverdue && ' (Overdue)'}
                          </span>
                        )}
                        {task.category && <span>Category: {task.category}</span>}
                      </div>

                      {/* Steps progress */}
                      {stepsTotal > 0 && (
                        <div style={{ marginTop: 8, marginLeft: 18 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)' }}>
                              Steps: {stepsDone}/{stepsTotal}
                            </span>
                            <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--bg2)' }}>
                              <div style={{
                                height: '100%', borderRadius: 2,
                                width: `${stepsTotal > 0 ? (stepsDone / stepsTotal) * 100 : 0}%`,
                                background: stepsAllDone ? 'var(--green)' : 'var(--blue)',
                                transition: 'width 0.3s ease',
                              }} />
                            </div>
                          </div>
                          {/* Step items */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {task.taskSteps?.map((step: any) => (
                              <div key={step.id} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                fontSize: 10, color: step.status === 'COMPLETED' ? 'var(--green)' : 'var(--t3)',
                              }}>
                                <span style={{ fontWeight: 700 }}>{step.status === 'COMPLETED' ? '✓' : '○'}</span>
                                <span style={step.status === 'COMPLETED' ? { textDecoration: 'line-through' } : {}}>{step.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* No edit notice per task */}
                      {isCompleted && (
                        <div style={{ marginTop: 6, marginLeft: 18, fontSize: 10, color: 'var(--green)', fontWeight: 600 }}>
                          ✅ Completed task
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Footer notice */}
            <div style={{ padding: '10px 16px', background: 'var(--bg2)', borderTop: '1px solid var(--b1)', fontSize: 10, color: 'var(--t4)', fontWeight: 600 }}>
              🔒 You cannot edit, mark Done, or change any task. Only Arti Sharma (EA) can mark tasks as Done or Revise them.
            </div>
          </div>
        </div>
      )}

      {/* ===================== MY SCORECARD TAB ===================== */}
      {empTab === 'scorecard' && (
        <>
          <div className="lcard" style={{ marginBottom: 16 }}>
            <div className="ch">
              <div className="ct">📈 My Performance Scorecard</div>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--t4)', background: 'var(--bg2)', padding: '2px 8px', borderRadius: 4 }}>
                Week {weekInfo.weekNum} · {weekInfo.year}
              </span>
            </div>
            <div className="cb">
              {/* Big Score Display */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {/* PR Score */}
                <div style={{
                  padding: '20px 16px', borderRadius: 12,
                  background: score?.prScore >= 70 ? 'linear-gradient(135deg, #DCFCE7, #BBF7D0)' : score?.prScore >= 40 ? 'linear-gradient(135deg, #FEF3C7, #FDE68A)' : 'linear-gradient(135deg, #FEE2E2, #FECACA)',
                  textAlign: 'center', position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)', marginBottom: 4 }}>PR Score</div>
                  <div style={{ fontSize: 42, fontWeight: 900, color: score?.prScore >= 70 ? 'var(--green)' : score?.prScore >= 40 ? 'var(--amber)' : 'var(--red)' }}>
                    {score?.prScore || 0}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', marginTop: 2 }}>
                    {score?.prScore >= 70 ? 'Excellent' : score?.prScore >= 40 ? 'Needs Improvement' : 'Critical'}
                  </div>
                </div>

                {/* Total Tasks */}
                <div style={{
                  padding: '20px 16px', borderRadius: 12,
                  background: 'linear-gradient(135deg, var(--bg), var(--bg2))',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)', marginBottom: 4 }}>Total Tasks</div>
                  <div style={{ fontSize: 42, fontWeight: 900, color: 'var(--t1)' }}>
                    {score?.totalTasks || 0}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', marginTop: 2 }}>
                    this week
                  </div>
                </div>
              </div>

              {/* R/Y/G Scores */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                <div style={{ textAlign: 'center', padding: '16px 8px', borderRadius: 10, background: '#FEF2F2', border: '1px solid rgba(220,38,38,.15)' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: '#DC2626', marginBottom: 2 }}>Red Score</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#DC2626' }}>{score?.redScore || 0}%</div>
                  <div style={{ fontSize: 9, color: '#DC2626', fontWeight: 600, marginTop: 2 }}>Overdue/Rejected: {((score?.overdue || 0) + (score?.rejected || 0))}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px 8px', borderRadius: 10, background: '#FFFBEB', border: '1px solid rgba(217,119,6,.15)' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: '#D97706', marginBottom: 2 }}>Yellow Score</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#D97706' }}>{score?.yellowScore || 0}%</div>
                  <div style={{ fontSize: 9, color: '#D97706', fontWeight: 600, marginTop: 2 }}>In Progress/Late: {(score?.inProgressOnTrack || 0) + (score?.completedLate || 0)}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px 8px', borderRadius: 10, background: '#DCFCE7', border: '1px solid rgba(21,128,61,.15)' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: '#15803D', marginBottom: 2 }}>Green Score</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#15803D' }}>{score?.greenScore || 0}%</div>
                  <div style={{ fontSize: 9, color: '#15803D', fontWeight: 600, marginTop: 2 }}>On Time: {score?.completedOnTime || 0}</div>
                </div>
              </div>

              {/* Breakdown */}
              <div style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--bg2)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, color: 'var(--t2)' }}>Task Breakdown</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: '#22C55E' }}>✓ Completed on time</span>
                    <span style={{ fontWeight: 800 }}>{score?.completedOnTime || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: '#F59E0B' }}>◐ In progress / On track</span>
                    <span style={{ fontWeight: 800 }}>{score?.inProgressOnTrack || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: '#F59E0B' }}>◐ Completed late</span>
                    <span style={{ fontWeight: 800 }}>{score?.completedLate || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: '#EF4444' }}>✕ Overdue</span>
                    <span style={{ fontWeight: 800 }}>{score?.overdue || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: '#EF4444' }}>✕ Rejected</span>
                    <span style={{ fontWeight: 800 }}>{score?.rejected || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, borderTop: '1px solid var(--b1)', paddingTop: 6, marginTop: 2 }}>
                    <span style={{ fontWeight: 800 }}>Total</span>
                    <span style={{ fontWeight: 900, color: 'var(--g2)' }}>{score?.totalTasks || 0}</span>
                  </div>
                </div>
              </div>

              {/* Read only notice */}
              <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 6, background: 'var(--bg2)', fontSize: 10, color: 'var(--t4)', fontWeight: 600, textAlign: 'center' }}>
                📊 This scorecard is auto-calculated from your task performance. Only Arti Sharma can update Monday Meeting scores.
              </div>
            </div>
          </div>
        </>
      )}

    </>
  )
}

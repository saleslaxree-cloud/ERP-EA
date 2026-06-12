'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWorkflowStore } from '@/stores/workflow-store'
import { useState, useRef, useEffect } from 'react'

interface LaxreeTasksProps {
  showCancelled?: boolean
  showExtHold?: boolean
  showEscalations?: boolean
}

export function LaxreeTasks({ showCancelled, showExtHold, showEscalations }: LaxreeTasksProps) {
  const { currentUser, taskTab, setTaskTab, setSelectedTaskId, selectedTaskId, addToast, setCreateTaskOpen, currentRole } = useWorkflowStore()
  const queryClient = useQueryClient()
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [editTask, setEditTask] = useState<any>(null)
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  // Revise modal state
  const [reviseTask, setReviseTask] = useState<any>(null)
  const [reviseReason, setReviseReason] = useState('')
  const [reviseNextDate, setReviseNextDate] = useState('')

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-list'],
    queryFn: () => fetch('/api/tasks').then(r => r.json()),
  })

  const { data: users = [] } = useQuery({
    queryKey: ['users-tasks'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
  })

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/tasks/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      addToast('ok', 'Task deleted')
      setConfirmAction(null)
      setMenuOpenId(null)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      addToast('ok', 'Task cancelled')
      setConfirmAction(null)
      setMenuOpenId(null)
    },
  })

  const startMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      addToast('ok', 'Task started')
      setMenuOpenId(null)
    },
  })

  const completeMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      addToast('ok', 'Task completed! ✓')
      setMenuOpenId(null)
      setSelectedTaskId(null)
    },
  })

  // Revise mutation - reopens a completed task back to IN_PROGRESS with reason + next date
  const reviseMutation = useMutation({
    mutationFn: ({ id, reason, nextDate }: { id: string; reason: string; nextDate: string }) =>
      fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'IN_PROGRESS',
          reviseReason: reason || null,
          reviseNextDate: nextDate || null,
        }),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      addToast('ok', 'Task reopened for revision')
      setReviseTask(null)
      setReviseReason('')
      setReviseNextDate('')
      setMenuOpenId(null)
    },
  })

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      addToast('ok', 'Task updated')
      setEditTask(null)
    },
  })

  // Step completion mutation - simplified, no director approval routing
  const stepDoneMutation = useMutation({
    mutationFn: ({ taskId, stepId }: { taskId: string; stepId: string }) =>
      fetch(`/api/tasks/${taskId}/steps`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId, action: 'complete' }),
      }).then(r => r.json()),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      if (data.allDone) {
        addToast('ok', 'All steps done! Task completed ✓')
      } else {
        addToast('ok', 'Step completed! ✓')
      }
    },
  })

  // Filtering
  let filtered = Array.isArray(tasks) ? [...tasks] : []

  // Search filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    filtered = filtered.filter((t: any) =>
      t.title?.toLowerCase().includes(q) ||
      t.department?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q) ||
      t.owner?.name?.toLowerCase().includes(q)
    )
  }

  if (showCancelled) filtered = filtered.filter((t: any) => t.status === 'CANCELLED')
  if (showExtHold) filtered = filtered.filter((t: any) => t.status === 'EXTERNAL_HOLD')
  if (showEscalations) filtered = filtered.filter((t: any) =>
    t.status === 'ESCALATED' || (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED' && t.status !== 'CANCELLED')
  )

  if (!showCancelled && !showExtHold && !showEscalations) {
    if (taskTab === 'inprogress') filtered = filtered.filter((t: any) => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW' || t.status === 'ON_HOLD')
    else if (taskTab === 'pending') filtered = filtered.filter((t: any) => t.status === 'PENDING' || t.status === 'DRAFT')
    else if (taskTab === 'completed') filtered = filtered.filter((t: any) => t.status === 'COMPLETED')
    else if (taskTab === 'overdue') filtered = filtered.filter((t: any) =>
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
    )
  }

  const tabs = [
    { id: 'all', label: 'All', count: Array.isArray(tasks) ? tasks.length : 0 },
    { id: 'inprogress', label: 'Active', count: (Array.isArray(tasks) ? tasks : []).filter((t: any) => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW' || t.status === 'ON_HOLD').length },
    { id: 'pending', label: 'Pending', count: (Array.isArray(tasks) ? tasks : []).filter((t: any) => t.status === 'PENDING' || t.status === 'DRAFT').length },
    { id: 'completed', label: 'Completed', count: (Array.isArray(tasks) ? tasks : []).filter((t: any) => t.status === 'COMPLETED').length },
    { id: 'overdue', label: 'Overdue', count: (Array.isArray(tasks) ? tasks : []).filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length },
  ]

  const getInitials = (name: string) => name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '?'

  const priorityBadge: Record<string, { bg: string; color: string }> = {
    CRITICAL: { bg: '#FFF1F2', color: '#E11D48' },
    HIGH: { bg: '#FEF2F2', color: '#DC2626' },
    MEDIUM: { bg: '#FFFBEB', color: '#D97706' },
    LOW: { bg: '#EFF6FF', color: '#2563EB' },
  }

  const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
    PENDING: { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
    IN_PROGRESS: { bg: '#DBEAFE', color: '#1D4ED8', label: 'In Progress' },
    COMPLETED: { bg: '#DCFCE7', color: '#15803D', label: 'Done' },
    CANCELLED: { bg: '#F3F4F6', color: '#6B7280', label: 'Cancelled' },
    ON_HOLD: { bg: '#EDE9FE', color: '#6D28D9', label: 'On Hold' },
    ESCALATED: { bg: '#FEE2E2', color: '#DC2626', label: 'Escalated' },
    EXTERNAL_HOLD: { bg: '#FFF7ED', color: '#C2410C', label: 'Ext Hold' },
    DRAFT: { bg: '#F3F4F6', color: '#6B7280', label: 'Draft' },
    IN_REVIEW: { bg: '#FEF3C7', color: '#92400E', label: 'In Review' },
    APPROVED: { bg: '#DCFCE7', color: '#15803D', label: 'Approved' },
    REJECTED: { bg: '#FEE2E2', color: '#DC2626', label: 'Rejected' },
    RE_OPENED: { bg: '#FEF3C7', color: '#92400E', label: 'Re-Opened' },
  }

  const getSlaStatus = (task: any) => {
    if (task.status === 'COMPLETED' || task.status === 'CANCELLED') return null
    if (!task.dueDate) return { label: 'On Track', bg: '#ECFDF5', color: '#059669' }
    const now = new Date()
    const due = new Date(task.dueDate)
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return { label: 'Overdue', bg: '#FEF2F2', color: '#DC2626' }
    if (diffDays <= 2) return { label: 'Due Soon', bg: '#FFFBEB', color: '#D97706' }
    return { label: 'On Track', bg: '#ECFDF5', color: '#059669' }
  }

  // Determine the next actionable step for a task
  const getNextActionableStep = (task: any) => {
    if (!task.taskSteps || task.taskSteps.length === 0) return null
    if (task.status === 'IN_PROGRESS' || task.status === 'REJECTED' || task.status === 'RE_OPENED') {
      const nextStep = task.taskSteps.find((s: any) => s.status !== 'COMPLETED')
      return nextStep || null
    }
    return null
  }

  const pageTitle = showCancelled ? 'Cancelled Tasks' : showExtHold ? 'External Hold' : showEscalations ? 'Escalations' : 'All Tasks'
  const pageDesc = showCancelled ? 'Cancelled workflow items' : showExtHold ? 'Tasks waiting on external action' : showEscalations ? 'Overdue and escalated items' : 'Manage and track all tasks'

  return (
    <>
      <div className="ph">
        <div className="ph-left">
          <h2>{pageTitle}</h2>
          <p>{pageDesc}</p>
        </div>
        <div className="ph-right">
          {!showCancelled && !showExtHold && !showEscalations && (
            <button className="btn btn-gold" onClick={() => setCreateTaskOpen(true)}>+ Create Task</button>
          )}
        </div>
      </div>

      <div className="page-accent" />

      {/* Search Bar */}
      {!showCancelled && !showExtHold && !showEscalations && (
        <div style={{ marginBottom: 14 }}>
          <div className="search" style={{ maxWidth: 400 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--t4)', flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search tasks by name, department, person..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontFamily: "'DM Sans', sans-serif", fontSize: 12.5, color: 'var(--t1)', width: '100%' }}
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      {!showCancelled && !showExtHold && !showEscalations && (
        <div className="tabs" style={{ marginBottom: 14 }}>
          {tabs.map(tab => (
            <div key={tab.id} className={`tab${taskTab === tab.id ? ' active' : ''}`}
              onClick={() => setTaskTab(tab.id)}>
              {tab.label}
              {tab.count > 0 && <span className="tab-cnt">{tab.count}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Task Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 ? (
          <div className="lcard">
            <div className="cb" style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>No tasks found</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Create a new task or adjust your filters</div>
            </div>
          </div>
        ) : filtered.map((task: any) => {
          const sla = getSlaStatus(task)
          const pBadge = priorityBadge[task.priority] || priorityBadge.MEDIUM
          const sStyle = statusStyle[task.status] || statusStyle.PENDING
          const stepsTotal = task.taskSteps?.length || 0
          const stepsDone = task.taskSteps?.filter((s: any) => s.status === 'COMPLETED').length || 0
          const owner = task.owner
          const nextStep = getNextActionableStep(task)

          return (
            <div key={task.id} className="lcard" style={{ cursor: 'pointer', transition: 'all .15s' }}
              onClick={() => setSelectedTaskId(task.id)}>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Avatar */}
                  <div className="av" style={{ width: 38, height: 38, fontSize: 13, background: sStyle.color, flexShrink: 0 }}>
                    {getInitials(owner?.name || 'T')}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--t1)' }}>{task.title}</span>
                      <span className="badge" style={{ fontSize: 9, padding: '2px 8px', background: pBadge.bg, color: pBadge.color, fontWeight: 700 }}>
                        {task.priority || 'MEDIUM'}
                      </span>
                      <span className="badge" style={{ fontSize: 9, padding: '2px 8px', background: sStyle.bg, color: sStyle.color, fontWeight: 700 }}>
                        {sStyle.label}
                      </span>
                      {sla && (
                        <span className="badge" style={{ fontSize: 9, padding: '2px 8px', background: sla.bg, color: sla.color, fontWeight: 700 }}>
                          {sla.label}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--t3)', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600 }}>{owner?.name || 'Unassigned'}</span>
                      {task.department && <span className="badge b-gray" style={{ fontSize: 9, padding: '1px 6px' }}>{task.department}</span>}
                      {task.category && <span className="badge" style={{ fontSize: 9, padding: '1px 6px', background: 'var(--amber-l)', color: 'var(--amber)' }}>{task.category}</span>}
                      {task.dueDate && <span>Due: {new Date(task.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>}
                    </div>

                    {/* Step Progress */}
                    {stepsTotal > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        <div className="prog" style={{ flex: 1, minWidth: 60 }}>
                          <div className="prog-bg" style={{ height: 6 }}>
                            <div className="prog-fill" style={{
                              width: `${stepsTotal > 0 ? (stepsDone / stepsTotal * 100) : 0}%`,
                              background: stepsDone === stepsTotal ? 'var(--green)' : 'var(--g2)',
                              height: '100%',
                            }} />
                          </div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: stepsDone === stepsTotal ? 'var(--green)' : 'var(--t2)' }}>
                          {stepsDone}/{stepsTotal} steps
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ═══ SIMPLIFIED ACTION BUTTONS ═══ */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    {/* PENDING → Start Button */}
                    {task.status === 'PENDING' && (
                      <button
                        className="btn btn-xs"
                        style={{ background: 'var(--blue-l)', color: 'var(--blue)', border: '1px solid var(--blue)', fontWeight: 700 }}
                        onClick={() => startMutation.mutate({ id: task.id })}
                        disabled={startMutation.isPending}
                        title="Start Task"
                      >
                        ▶ Start
                      </button>
                    )}

                    {/* IN_PROGRESS → Done + Revise Buttons */}
                    {task.status === 'IN_PROGRESS' && (
                      <>
                        <button
                          className="btn btn-xs"
                          style={{ background: 'var(--green-l)', color: 'var(--green)', border: '1.5px solid var(--green)', fontWeight: 800, padding: '4px 12px' }}
                          onClick={() => completeMutation.mutate({ id: task.id })}
                          disabled={completeMutation.isPending}
                          title="Mark as Done"
                        >
                          ✓ Done
                        </button>
                        <button
                          className="btn btn-xs"
                          style={{ background: 'var(--amber-l)', color: 'var(--amber)', border: '1px solid var(--amber)', fontWeight: 700 }}
                          onClick={() => setEditTask(task)}
                          title="Revise / Edit Task"
                        >
                          ✏ Revise
                        </button>
                      </>
                    )}

                    {/* COMPLETED → Show "Completed task ✅" with score */}
                    {task.status === 'COMPLETED' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 800, color: 'var(--green)',
                          background: 'var(--green-l)', padding: '3px 10px',
                          borderRadius: 6, border: '1px solid var(--green)',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          Completed ✅
                          {task.score != null && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: task.score >= 70 ? 'var(--green)' : task.score >= 40 ? 'var(--amber)' : 'var(--red)' }}>
                              · {task.score}
                            </span>
                          )}
                        </span>
                        <button
                          className="btn btn-xs"
                          style={{ background: 'var(--amber-l)', color: 'var(--amber)', border: '1px solid var(--amber)', fontWeight: 700 }}
                          onClick={() => { setReviseTask(task); setReviseReason(''); setReviseNextDate('') }}
                          disabled={reviseMutation.isPending}
                          title="Reopen task for revision"
                        >
                          ↩ Revise
                        </button>
                      </div>
                    )}

                    {/* Other statuses (IN_REVIEW, ON_HOLD etc from old workflow) → show Done + Revise */}
                    {(task.status === 'IN_REVIEW' || task.status === 'ON_HOLD' || task.status === 'ESCALATED') && (
                      <>
                        <button
                          className="btn btn-xs"
                          style={{ background: 'var(--green-l)', color: 'var(--green)', border: '1.5px solid var(--green)', fontWeight: 800, padding: '4px 12px' }}
                          onClick={() => completeMutation.mutate({ id: task.id })}
                          disabled={completeMutation.isPending}
                          title="Mark as Done"
                        >
                          ✓ Done
                        </button>
                        <button
                          className="btn btn-xs"
                          style={{ background: 'var(--amber-l)', color: 'var(--amber)', border: '1px solid var(--amber)', fontWeight: 700 }}
                          onClick={() => { setReviseTask(task); setReviseReason(''); setReviseNextDate('') }}
                          title="Revise / Reopen Task"
                        >
                          ↩ Revise
                        </button>
                      </>
                    )}

                    {/* 3-dot menu */}
                    <div style={{ position: 'relative' }} ref={menuOpenId === task.id ? menuRef : null}>
                      <button
                        className="btn btn-xs"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', fontSize: 16, color: 'var(--t3)' }}
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === task.id ? null : task.id) }}
                      >
                        ⋮
                      </button>
                      {menuOpenId === task.id && (
                        <div style={{
                          position: 'absolute', right: 0, top: '100%', zIndex: 500,
                          background: 'var(--card)', border: '1px solid var(--b2)',
                          borderRadius: 8, boxShadow: 'var(--s3)', minWidth: 150, overflow: 'hidden',
                        }}>
                          <div
                            style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600, borderBottom: '1px solid var(--b1)' }}
                            onClick={() => { setSelectedTaskId(task.id); setMenuOpenId(null) }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            👁 View Details
                          </div>
                          <div
                            style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600, borderBottom: '1px solid var(--b1)' }}
                            onClick={() => { setEditTask(task); setMenuOpenId(null) }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            ✏️ Edit
                          </div>
                          <div
                            style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600, color: 'var(--red)', borderBottom: '1px solid var(--b1)' }}
                            onClick={() => { setConfirmAction({ id: task.id, action: 'delete' }); setMenuOpenId(null) }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            🗑 Delete
                          </div>
                          {task.status !== 'CANCELLED' && task.status !== 'COMPLETED' && (
                            <div
                              style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600, color: 'var(--amber)' }}
                              onClick={() => { setConfirmAction({ id: task.id, action: 'cancel' }); setMenuOpenId(null) }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              🚫 Cancel Task
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Task Detail Modal */}
      {selectedTaskId && (() => {
        const task = tasks.find((t: any) => t.id === selectedTaskId)
        if (!task) return null
        const owner = task.owner
        const stepsTotal = task.taskSteps?.length || 0
        const stepsDone = task.taskSteps?.filter((s: any) => s.status === 'COMPLETED').length || 0
        const sla = getSlaStatus(task)
        const pBadge = priorityBadge[task.priority] || priorityBadge.MEDIUM
        const sStyle = statusStyle[task.status] || statusStyle.PENDING

        return (
          <div className="overlay show" onClick={e => { if (e.target === e.currentTarget) setSelectedTaskId(null) }}>
            <div className="modal modal-lg" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
              <button className="mx" onClick={() => setSelectedTaskId(null)}>✕</button>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                <div className="av" style={{ width: 44, height: 44, fontSize: 15, background: sStyle.color }}>
                  {getInitials(owner?.name || 'T')}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="mt" style={{ marginBottom: 4 }}>{task.title}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="badge" style={{ background: sStyle.bg, color: sStyle.color, fontWeight: 700 }}>{sStyle.label}</span>
                    <span className="badge" style={{ background: pBadge.bg, color: pBadge.color, fontWeight: 700 }}>{task.priority}</span>
                    {task.department && <span className="badge b-gray">{task.department}</span>}
                    {task.category && <span className="badge" style={{ background: 'var(--amber-l)', color: 'var(--amber)' }}>{task.category}</span>}
                    {sla && <span className="badge" style={{ background: sla.bg, color: sla.color }}>{sla.label}</span>}
                  </div>
                </div>
              </div>

              {/* Description */}
              {task.description && (
                <div style={{ marginBottom: 14, padding: 12, background: 'var(--bg)', borderRadius: 8, fontSize: 13, color: 'var(--t2)', lineHeight: 1.6 }}>
                  {task.description}
                </div>
              )}

              {/* Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14, fontSize: 12 }}>
                <div style={{ padding: '8px 12px', background: 'var(--bg2)', borderRadius: 6 }}>
                  <span style={{ color: 'var(--t3)', fontWeight: 700 }}>Assignee:</span> {owner?.name || 'Unassigned'}
                </div>
                <div style={{ padding: '8px 12px', background: 'var(--bg2)', borderRadius: 6 }}>
                  <span style={{ color: 'var(--t3)', fontWeight: 700 }}>Due:</span> {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No due date'}
                </div>
                {task.createdAt && (
                  <div style={{ padding: '8px 12px', background: 'var(--bg2)', borderRadius: 6 }}>
                    <span style={{ color: 'var(--t3)', fontWeight: 700 }}>Created:</span> {new Date(task.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </div>
                )}
                {task.completedAt && (
                  <div style={{ padding: '8px 12px', background: 'var(--green-l)', borderRadius: 6, color: 'var(--green)', fontWeight: 600 }}>
                    ✓ Completed: {new Date(task.completedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </div>
                )}
                {task.reviseReason && (
                  <div style={{ padding: '8px 12px', background: 'var(--amber-l)', borderRadius: 6, color: 'var(--amber)', fontWeight: 600, gridColumn: '1 / -1' }}>
                    ↩ Revised: {task.reviseReason}
                    {task.reviseNextDate && <span style={{ marginLeft: 8 }}>· Next date: {new Date(task.reviseNextDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>}
                  </div>
                )}
              </div>

              <div className="gold-divider" />

              {/* Step Progress - simplified, no director approval */}
              {stepsTotal > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)', marginBottom: 8 }}>
                    Task Steps ({stepsDone}/{stepsTotal})
                  </div>
                  {task.taskSteps.map((step: any, i: number) => {
                    const isCompleted = step.status === 'COMPLETED'
                    const isCurrentStep = !isCompleted && (i === 0 || task.taskSteps[i - 1]?.status === 'COMPLETED')

                    return (
                      <div key={step.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                        background: isCompleted ? 'var(--green-l)' : isCurrentStep ? 'var(--blue-l)' : 'var(--bg2)',
                        borderRadius: 8, marginBottom: 6,
                        borderLeft: `3px solid ${isCompleted ? 'var(--green)' : isCurrentStep ? 'var(--blue)' : 'var(--b2)'}`,
                        opacity: !isCompleted && !isCurrentStep ? 0.5 : 1,
                      }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%', fontSize: 10, fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          background: isCompleted ? 'var(--green)' : isCurrentStep ? 'var(--blue)' : 'var(--g2)',
                          color: '#fff',
                        }}>
                          {isCompleted ? '✓' : i + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 12.5, fontWeight: isCompleted ? 600 : 700, color: isCompleted ? 'var(--green)' : 'var(--t1)' }}>
                            {step.title}
                          </span>
                        </div>
                        {/* Step action button */}
                        {!isCompleted && isCurrentStep && task.status === 'IN_PROGRESS' && (
                          <button
                            className="btn btn-xs"
                            style={{
                              background: 'var(--green-l)',
                              color: 'var(--green)',
                              border: '1px solid var(--green)',
                              fontWeight: 700, whiteSpace: 'nowrap',
                            }}
                            onClick={() => stepDoneMutation.mutate({ taskId: task.id, stepId: step.id })}
                            disabled={stepDoneMutation.isPending}
                          >
                            ✓ Complete
                          </button>
                        )}
                        <span className="badge" style={{ fontSize: 9, padding: '1px 6px', background: isCompleted ? 'var(--green-l)' : 'var(--amber-l)', color: isCompleted ? 'var(--green)' : 'var(--amber)' }}>
                          {isCompleted ? 'Done' : 'Pending'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ACTION BUTTONS - Simplified */}
              <div className="gold-divider" />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {task.status === 'PENDING' && (
                  <button className="btn" style={{ background: 'var(--blue-l)', color: 'var(--blue)', border: '1.5px solid var(--blue)' }}
                    onClick={async () => {
                      await fetch(`/api/tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'IN_PROGRESS' }) })
                      queryClient.invalidateQueries({ queryKey: ['tasks-list'] })
                      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
                      addToast('ok', 'Task started')
                    }}>
                    ▶ Start Task
                  </button>
                )}
                {(task.status === 'IN_PROGRESS' || task.status === 'IN_REVIEW' || task.status === 'ON_HOLD') && (
                  <button className="btn btn-green" onClick={async () => {
                    await fetch(`/api/tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'COMPLETED' }) })
                    queryClient.invalidateQueries({ queryKey: ['tasks-list'] })
                    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
                    addToast('ok', 'Task completed! ✓')
                    setSelectedTaskId(null)
                  }}>
                    ✓ Done
                  </button>
                )}
                {task.status === 'COMPLETED' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <div style={{
                      padding: '8px 16px',
                      background: 'var(--green-l)',
                      borderRadius: 8,
                      border: '1.5px solid var(--green)',
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: 14, fontWeight: 800, color: 'var(--green)',
                    }}>
                      Completed ✅
                      {task.score != null && (
                        <span style={{
                          fontSize: 13, fontWeight: 800,
                          color: task.score >= 70 ? 'var(--green)' : task.score >= 40 ? 'var(--amber)' : 'var(--red)',
                          background: task.score >= 70 ? 'var(--green-l)' : task.score >= 40 ? 'var(--amber-l)' : 'var(--red-l)',
                          padding: '2px 8px', borderRadius: 4,
                        }}>
                          Score: {task.score}
                        </span>
                      )}
                    </div>
                    <button className="btn" style={{ background: 'var(--amber-l)', color: 'var(--amber)', border: '1.5px solid var(--amber)' }}
                      onClick={() => { setReviseTask(task); setReviseReason(''); setReviseNextDate('') }}>
                      ↩ Revise
                    </button>
                  </div>
                )}
                {task.status !== 'CANCELLED' && task.status !== 'COMPLETED' && (
                  <button className="btn btn-red btn-sm" onClick={async () => {
                    await fetch(`/api/tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'CANCELLED' }) })
                    queryClient.invalidateQueries({ queryKey: ['tasks-list'] })
                    addToast('ok', 'Task cancelled')
                    setSelectedTaskId(null)
                  }} style={{ marginLeft: 'auto' }}>
                    🚫 Cancel Task
                  </button>
                )}
              </div>

              {/* Audit Trail */}
              <div style={{ marginTop: 14, padding: 12, background: 'var(--bg2)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--t3)', marginBottom: 6 }}>Audit Trail</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--g2)' }} />
                  <span style={{ fontSize: 12, color: 'var(--t2)' }}>Created — {task.createdAt ? new Date(task.createdAt).toLocaleString() : 'N/A'}</span>
                </div>
                {task.updatedAt && task.updatedAt !== task.createdAt && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)' }} />
                    <span style={{ fontSize: 12, color: 'var(--t2)' }}>Last updated — {new Date(task.updatedAt).toLocaleString()}</span>
                  </div>
                )}
                {task.completedAt && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
                    <span style={{ fontSize: 12, color: 'var(--t2)' }}>Completed — {new Date(task.completedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Edit Task Modal */}
      {editTask && (
        <div className="overlay show" onClick={e => { if (e.target === e.currentTarget) setEditTask(null) }}>
          <div className="modal modal-lg" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="mx" onClick={() => setEditTask(null)}>✕</button>
            <div className="mt">Edit Task</div>
            <div className="ms">{editTask.title}</div>
            <div className="gold-divider" />

            <div className="form-row fr-1">
              <div className="fg">
                <label>Title</label>
                <input className="fi" value={editTask.title} onChange={e => setEditTask({ ...editTask, title: e.target.value })} />
              </div>
            </div>
            <div className="form-row fr-1">
              <div className="fg">
                <label>Description</label>
                <textarea className="fi" value={editTask.description || ''} onChange={e => setEditTask({ ...editTask, description: e.target.value })} rows={3} />
              </div>
            </div>
            <div className="form-row fr-3">
              <div className="fg">
                <label>Priority</label>
                <select className="fi" value={editTask.priority || 'MEDIUM'} onChange={e => setEditTask({ ...editTask, priority: e.target.value })}>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
              <div className="fg">
                <label>Department</label>
                <select className="fi" value={editTask.department || ''} onChange={e => setEditTask({ ...editTask, department: e.target.value })}>
                  <option value="">Select</option>
                  {['Sales', 'Account', 'HR', 'Coordinator', 'Admin', 'Back Office'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="fg">
                <label>Category</label>
                <select className="fi" value={editTask.category || ''} onChange={e => setEditTask({ ...editTask, category: e.target.value })}>
                  {['Routine Work', 'Reconciliation', 'One Time Work', 'Compliance', 'Operations', 'Procurement'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row fr-1">
              <div className="fg">
                <label>Due Date</label>
                <input className="fi" type="date" value={editTask.dueDate ? new Date(editTask.dueDate).toISOString().split('T')[0] : ''} onChange={e => setEditTask({ ...editTask, dueDate: e.target.value || null })} />
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setEditTask(null)}>Cancel</button>
              <button type="button" className="btn btn-gold" onClick={() => editMutation.mutate({ id: editTask.id, data: { title: editTask.title, description: editTask.description, priority: editTask.priority, department: editTask.department, category: editTask.category, dueDate: editTask.dueDate || null } })} disabled={editMutation.isPending}>
                {editMutation.isPending ? 'Saving...' : '✓ Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete/Cancel Dialog */}
      {confirmAction && (
        <div className="overlay show" onClick={e => { if (e.target === e.currentTarget) setConfirmAction(null) }}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <button className="mx" onClick={() => setConfirmAction(null)}>✕</button>
            <div className="mt">Confirm {confirmAction.action === 'delete' ? 'Delete' : 'Cancel'}</div>
            <div className="ms">Are you sure you want to {confirmAction.action === 'delete' ? 'delete' : 'cancel'} this task? This action cannot be undone.</div>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmAction(null)}>No, Keep It</button>
              <button className={confirmAction.action === 'delete' ? 'btn btn-red' : 'btn btn-gold'} onClick={() => {
                if (confirmAction.action === 'delete') deleteMutation.mutate(confirmAction.id)
                else cancelMutation.mutate({ id: confirmAction.id })
              }}>
                Yes, {confirmAction.action === 'delete' ? 'Delete' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revise Task Modal — Ask reason + next date */}
      {reviseTask && (
        <div className="overlay show" onClick={e => { if (e.target === e.currentTarget) { setReviseTask(null); setReviseReason(''); setReviseNextDate('') } }}>
          <div className="modal modal-md" onClick={e => e.stopPropagation()}>
            <button className="mx" onClick={() => { setReviseTask(null); setReviseReason(''); setReviseNextDate('') }}>✕</button>
            <div className="mt">Revise Task</div>
            <div className="ms">{reviseTask.title}</div>
            <div className="gold-divider" />

            <div style={{ padding: '8px 12px', background: 'var(--amber-l)', borderRadius: 8, marginBottom: 14, fontSize: 12, color: 'var(--amber)', fontWeight: 600 }}>
              This task will be reopened and set back to In Progress. Please provide a reason and a new target date.
            </div>

            <div className="form-row fr-1">
              <div className="fg">
                <label>Reason for Revision <span style={{ color: 'var(--red)' }}>*</span></label>
                <textarea
                  className="fi"
                  placeholder="e.g. Incomplete work, quality issues, needs correction..."
                  value={reviseReason}
                  onChange={e => setReviseReason(e.target.value)}
                  rows={3}
                  style={{ minHeight: 80 }}
                />
              </div>
            </div>
            <div className="form-row fr-1">
              <div className="fg">
                <label>Next Target Date</label>
                <input
                  className="fi"
                  type="date"
                  value={reviseNextDate}
                  onChange={e => setReviseNextDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => { setReviseTask(null); setReviseReason(''); setReviseNextDate('') }}>Cancel</button>
              <button
                className="btn btn-gold"
                onClick={() => reviseMutation.mutate({ id: reviseTask.id, reason: reviseReason, nextDate: reviseNextDate })}
                disabled={reviseMutation.isPending || !reviseReason.trim()}
              >
                {reviseMutation.isPending ? 'Reopening...' : '↩ Revise Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

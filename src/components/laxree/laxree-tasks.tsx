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
  const menuRef = useRef<HTMLDivElement>(null)

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-list'],
    queryFn: () => fetch('/api/tasks').then(r => r.json()),
  })

  const { data: users = [] } = useQuery({
    queryKey: ['users-tasks'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
  })

  // Close menu on outside click
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
      addToast('ok', 'Task started')
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

  // Filtering
  let filtered = Array.isArray(tasks) ? [...tasks] : []

  if (showCancelled) filtered = filtered.filter((t: any) => t.status === 'CANCELLED')
  if (showExtHold) filtered = filtered.filter((t: any) => t.status === 'EXTERNAL_HOLD')
  if (showEscalations) filtered = filtered.filter((t: any) =>
    t.status === 'ESCALATED' || (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED' && t.status !== 'CANCELLED')
  )

  // Tab filtering
  if (!showCancelled && !showExtHold && !showEscalations) {
    if (taskTab === 'inprogress') filtered = filtered.filter((t: any) => t.status === 'IN_PROGRESS')
    else if (taskTab === 'pending') filtered = filtered.filter((t: any) => t.status === 'PENDING' || t.status === 'DRAFT')
    else if (taskTab === 'completed') filtered = filtered.filter((t: any) => t.status === 'COMPLETED')
    else if (taskTab === 'overdue') filtered = filtered.filter((t: any) =>
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
    )
  }

  const tabs = [
    { id: 'all', label: 'All', count: Array.isArray(tasks) ? tasks.length : 0 },
    { id: 'inprogress', label: 'In Progress', count: (Array.isArray(tasks) ? tasks : []).filter((t: any) => t.status === 'IN_PROGRESS').length },
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

  const generateTaskId = (task: any, index: number) => {
    return `TSK${String(index + 1).padStart(3, '0')}`
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
          {(currentUser?.role === 'admin' || currentUser?.role === 'ea') && !showCancelled && !showExtHold && !showEscalations && (
            <button className="btn btn-gold" onClick={() => setCreateTaskOpen(true)}>+ Create Task</button>
          )}
        </div>
      </div>

      <div className="page-accent" />

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

      {/* Tasks Table */}
      <div className="lcard">
        <div className="ch">
          <div className="ct">📋 {filtered.length} Task(s)</div>
          <span className="badge b-gold" style={{ fontSize: 10 }}>Live</span>
        </div>
        <div className="tw" style={{ overflowX: 'auto' }}>
          <table className="ltable">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th style={{ width: 80 }}>TASK ID</th>
                <th>TITLE</th>
                <th style={{ width: 90 }}>PRIORITY</th>
                <th style={{ width: 90 }}>DUE DATE</th>
                <th style={{ width: 80 }}>SLA</th>
                <th style={{ width: 140 }}>ASSIGNED TO</th>
                <th style={{ width: 90 }}>DEPT</th>
                <th style={{ width: 100 }}>CATEGORY</th>
                <th style={{ width: 70 }}>STEPS</th>
                <th style={{ width: 120 }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: 30, color: 'var(--t3)' }}>No tasks found</td></tr>
              ) : filtered.map((task: any, index: number) => {
                const sla = getSlaStatus(task)
                const pBadge = priorityBadge[task.priority] || priorityBadge.MEDIUM
                const stepsTotal = task.taskSteps?.length || 0
                const stepsDone = task.taskSteps?.filter((s: any) => s.status === 'COMPLETED').length || 0
                const owner = task.owner

                return (
                  <tr key={task.id} style={{ position: 'relative' }}>
                    <td style={{ color: 'var(--t3)', fontSize: 11 }}>{index + 1}</td>
                    <td style={{ fontSize: 11, fontWeight: 700, color: 'var(--g2)' }}>{generateTaskId(task, index)}</td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 12.5 }}>{task.title}</div>
                      <span className="badge" style={{ fontSize: 9, padding: '1px 6px', background: 'var(--blue-l)', color: 'var(--blue)', marginTop: 2, display: 'inline-block' }}>
                        Assigned
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ fontSize: 10, padding: '2px 8px', background: pBadge.bg, color: pBadge.color, fontWeight: 700 }}>
                        {task.priority || 'MEDIUM'}
                      </span>
                    </td>
                    <td style={{ fontSize: 11.5 }}>
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                    </td>
                    <td>
                      {sla ? (
                        <span className="badge" style={{ fontSize: 9, padding: '2px 6px', background: sla.bg, color: sla.color, fontWeight: 700 }}>
                          {sla.label}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--t3)', fontSize: 10 }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="av" style={{ width: 24, height: 24, fontSize: 9, background: 'var(--g2)', flexShrink: 0 }}>
                          {getInitials(owner?.name || 'U')}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {owner?.name || 'Unassigned'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="badge b-gray" style={{ fontSize: 9, padding: '1px 6px' }}>
                        {task.department || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ fontSize: 9, padding: '1px 6px', background: 'var(--amber-l)', color: 'var(--amber)' }}>
                        {task.category || '—'}
                      </span>
                    </td>
                    <td>
                      {stepsTotal > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div className="prog" style={{ flex: 1, minWidth: 40 }}>
                            <div className="prog-bg" style={{ height: 6 }}>
                              <div className="prog-fill" style={{
                                width: `${stepsTotal > 0 ? (stepsDone / stepsTotal * 100) : 0}%`,
                                background: stepsDone === stepsTotal ? 'var(--green)' : 'var(--g2)',
                                height: '100%',
                              }} />
                            </div>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t2)' }}>{stepsDone}/{stepsTotal}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 10, color: 'var(--t3)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button
                          className="btn btn-xs"
                          style={{ background: 'var(--bg2)', border: '1px solid var(--b1)', padding: '2px 6px', fontSize: 10 }}
                          onClick={() => setSelectedTaskId(task.id)}
                          title="View"
                        >
                          👁
                        </button>
                        {task.status === 'PENDING' && (
                          <button
                            className="btn btn-xs"
                            style={{ background: 'var(--blue-l)', color: 'var(--blue)', border: '1px solid var(--blue)', padding: '2px 6px', fontSize: 10 }}
                            onClick={() => startMutation.mutate({ id: task.id })}
                            disabled={startMutation.isPending}
                            title="Start"
                          >
                            ▶ Start
                          </button>
                        )}
                        {/* 3-dot menu */}
                        <div style={{ position: 'relative' }} ref={menuOpenId === task.id ? menuRef : null}>
                          <button
                            className="btn btn-xs"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: 14, color: 'var(--t3)' }}
                            onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === task.id ? null : task.id) }}
                          >
                            ⋮
                          </button>
                          {menuOpenId === task.id && (
                            <div style={{
                              position: 'absolute', right: 0, top: '100%', zIndex: 500,
                              background: 'var(--card)', border: '1px solid var(--b2)',
                              borderRadius: 8, boxShadow: 'var(--s3)', minWidth: 140, overflow: 'hidden',
                            }}>
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
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
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

        return (
          <div className="overlay show" onClick={e => { if (e.target === e.currentTarget) setSelectedTaskId(null) }}>
            <div className="modal modal-lg" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
              <button className="mx" onClick={() => setSelectedTaskId(null)}>✕</button>
              <div className="mt">{task.title}</div>
              <div className="ms">{task.description || 'No description'}</div>
              <div className="gold-divider" />

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                <span className="badge" style={{ background: pBadge.bg, color: pBadge.color }}>
                  {task.priority || 'MEDIUM'}
                </span>
                {task.department && <span className="badge b-gray">{task.department}</span>}
                {task.category && <span className="badge" style={{ background: 'var(--amber-l)', color: 'var(--amber)' }}>{task.category}</span>}
                {sla && <span className="badge" style={{ background: sla.bg, color: sla.color }}>{sla.label}</span>}
                {task.dueDate && (
                  <span className="badge b-gray">
                    Due: {new Date(task.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>

              {/* Assigned to */}
              {owner && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '10px 12px', background: 'var(--bg2)', borderRadius: 8 }}>
                  <div className="av" style={{ width: 32, height: 32, fontSize: 12, background: 'var(--g2)' }}>
                    {getInitials(owner.name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{owner.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--t3)' }}>{owner.role} · {owner.department || '—'}</div>
                  </div>
                </div>
              )}

              {/* Step Progress */}
              {stepsTotal > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)', marginBottom: 8 }}>
                    Step Progress ({stepsDone}/{stepsTotal})
                  </div>
                  {task.taskSteps.map((step: any, i: number) => (
                    <div key={step.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                      background: step.status === 'COMPLETED' ? 'var(--green-l)' : 'var(--bg2)',
                      borderRadius: 6, marginBottom: 4, borderLeft: `3px solid ${step.status === 'COMPLETED' ? 'var(--green)' : 'var(--b2)'}`,
                    }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', fontSize: 10, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        background: step.status === 'COMPLETED' ? 'var(--green)' : 'var(--g2)',
                        color: '#fff',
                      }}>
                        {step.status === 'COMPLETED' ? '✓' : i + 1}
                      </div>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: step.status === 'COMPLETED' ? 600 : 700, color: step.status === 'COMPLETED' ? 'var(--green)' : 'var(--t1)' }}>
                        {step.title}
                      </span>
                      <span className="badge" style={{ fontSize: 9, padding: '1px 6px', background: step.status === 'COMPLETED' ? 'var(--green-l)' : 'var(--amber-l)', color: step.status === 'COMPLETED' ? 'var(--green)' : 'var(--amber)' }}>
                        {step.status === 'COMPLETED' ? 'Done' : step.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Workflow Flow */}
              {task.workflow && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)', marginBottom: 8 }}>Workflow</div>
                  <div className="wf-flow">
                    <span className="wf-stage wf-stage-ea">EA Review</span>
                    <span className="wf-arrow">→</span>
                    <span className="wf-stage wf-stage-dir">Director</span>
                    <span className="wf-arrow">→</span>
                    <span className="wf-stage wf-stage-done">Done</span>
                  </div>
                </div>
              )}

              {/* Audit Trail */}
              <div className="audit-trail">
                <div className="audit-trail-title">Audit Trail</div>
                <div className="audit-entry">
                  <div className="audit-dot" style={{ background: 'var(--g2)' }} />
                  <div className="audit-text">Created — {task.createdAt ? new Date(task.createdAt).toLocaleString() : 'N/A'}</div>
                </div>
                {task.updatedAt && task.updatedAt !== task.createdAt && (
                  <div className="audit-entry">
                    <div className="audit-dot" style={{ background: 'var(--amber)' }} />
                    <div className="audit-text">Last updated — {new Date(task.updatedAt).toLocaleString()}</div>
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
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div className="fg">
                <label>Department</label>
                <select className="fi" value={editTask.department || ''} onChange={e => setEditTask({ ...editTask, department: e.target.value })}>
                  <option value="">None</option>
                  {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="fg">
                <label>Due Date</label>
                <input className="fi" type="date" value={editTask.dueDate ? new Date(editTask.dueDate).toISOString().split('T')[0] : ''} onChange={e => setEditTask({ ...editTask, dueDate: e.target.value })} />
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setEditTask(null)}>Cancel</button>
              <button className="btn btn-gold" onClick={() => editMutation.mutate({
                id: editTask.id,
                data: {
                  title: editTask.title,
                  description: editTask.description,
                  priority: editTask.priority,
                  department: editTask.department,
                  category: editTask.category,
                  dueDate: editTask.dueDate || null,
                }
              })} disabled={editMutation.isPending}>
                {editMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Action Modal */}
      {confirmAction && (
        <div className="overlay show" onClick={e => { if (e.target === e.currentTarget) setConfirmAction(null) }}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <button className="mx" onClick={() => setConfirmAction(null)}>✕</button>
            <div className="mt" style={{ fontSize: 16 }}>
              {confirmAction.action === 'delete' ? 'Delete Task?' : 'Cancel Task?'}
            </div>
            <div className="ms">
              {confirmAction.action === 'delete'
                ? 'This action cannot be undone. The task will be permanently deleted.'
                : 'This will mark the task as CANCELLED. This action can be reversed by an admin.'}
            </div>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmAction(null)}>No, Keep It</button>
              <button
                className={confirmAction.action === 'delete' ? 'btn btn-red' : 'btn btn-gold'}
                onClick={() => {
                  if (confirmAction.action === 'delete') {
                    deleteMutation.mutate(confirmAction.id)
                  } else {
                    cancelMutation.mutate({ id: confirmAction.id })
                  }
                }}
                disabled={deleteMutation.isPending || cancelMutation.isPending}
              >
                {confirmAction.action === 'delete' ? 'Yes, Delete' : 'Yes, Cancel Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const DEPTS = ['Sales', 'Back Office', 'Accounts', 'HR', 'Coordinator', 'Admin']

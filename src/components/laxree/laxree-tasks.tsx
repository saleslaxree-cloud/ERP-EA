'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWorkflowStore } from '@/stores/workflow-store'
import { useState } from 'react'

interface LaxreeTasksProps {
  showCancelled?: boolean
  showExtHold?: boolean
  showEscalations?: boolean
}

export function LaxreeTasks({ showCancelled, showExtHold, showEscalations }: LaxreeTasksProps) {
  const { currentUser, taskTab, setTaskTab, setSelectedTaskId, selectedTaskId } = useWorkflowStore()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'MEDIUM', dueDate: '' })

  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows-tasks'],
    queryFn: () => fetch('/api/workflows').then(r => r.json()),
  })

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-list'],
    queryFn: () => fetch('/api/tasks').then(r => r.json()),
  })

  const { data: users = [] } = useQuery({
    queryKey: ['users-tasks'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => fetch('/api/workflows', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['workflows-tasks'] }); setShowCreate(false); setNewTask({ title: '', description: '', priority: 'MEDIUM', dueDate: '' }) },
  })

  const statusLabels: Record<string, string> = {
    DRAFT: 'Draft', PENDING: 'Pending', IN_REVIEW: 'In Review', APPROVED: 'Approved',
    REJECTED: 'Rejected', IN_PROGRESS: 'In Progress', ON_HOLD: 'On Hold',
    ESCALATED: 'Escalated', COMPLETED: 'Completed', CANCELLED: 'Cancelled', EXTERNAL_HOLD: 'External Hold',
    RE_OPENED: 'Re-Opened',
  }

  const statusBadgeClass: Record<string, string> = {
    COMPLETED: 's-done', IN_PROGRESS: 's-inprog', PENDING: 's-pending',
    CANCELLED: 's-cancelled', ON_HOLD: 's-waiting', ESCALATED: 's-overdue',
    EXTERNAL_HOLD: 's-exthold', APPROVED: 's-done', REJECTED: 's-returned',
    IN_REVIEW: 's-approval', DRAFT: 's-pending', RE_OPENED: 's-approval',
  }

  const priorityClass: Record<string, string> = {
    CRITICAL: 'p-critical', HIGH: 'p-high', MEDIUM: 'p-med', LOW: 'p-low',
  }

  const priorityLabels: Record<string, string> = {
    CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low',
  }

  // Combine workflows and tasks
  let allItems = [...workflows.map((w: any) => ({ ...w, type: 'workflow' })), ...tasks.map((t: any) => ({ ...t, type: 'task' }))]

  // Filter based on props
  if (showCancelled) allItems = allItems.filter((i: any) => i.status === 'CANCELLED')
  if (showExtHold) allItems = allItems.filter((i: any) => i.status === 'EXTERNAL_HOLD')
  if (showEscalations) allItems = allItems.filter((i: any) => i.status === 'ESCALATED' || (i.dueDate && new Date(i.dueDate) < new Date() && i.status !== 'COMPLETED' && i.status !== 'CANCELLED'))

  // Tab filtering
  const filtered = taskTab === 'all' ? allItems
    : taskTab === 'inprogress' ? allItems.filter((i: any) => i.status === 'IN_PROGRESS')
    : taskTab === 'pending' ? allItems.filter((i: any) => i.status === 'PENDING' || i.status === 'DRAFT')
    : taskTab === 'completed' ? allItems.filter((i: any) => i.status === 'COMPLETED')
    : taskTab === 'overdue' ? allItems.filter((i: any) => i.dueDate && new Date(i.dueDate) < new Date() && i.status !== 'COMPLETED' && i.status !== 'CANCELLED')
    : allItems

  const tabs = [
    { id: 'all', label: 'All', count: allItems.length },
    { id: 'inprogress', label: 'In Progress', count: allItems.filter((i: any) => i.status === 'IN_PROGRESS').length },
    { id: 'pending', label: 'Pending', count: allItems.filter((i: any) => i.status === 'PENDING' || i.status === 'DRAFT').length },
    { id: 'completed', label: 'Completed', count: allItems.filter((i: any) => i.status === 'COMPLETED').length },
    { id: 'overdue', label: 'Overdue', count: allItems.filter((i: any) => i.dueDate && new Date(i.dueDate) < new Date() && i.status !== 'COMPLETED' && i.status !== 'CANCELLED').length },
  ]

  const getInitials = (name: string) => name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '?'

  const pageTitle = showCancelled ? 'Cancelled Tasks' : showExtHold ? 'External Hold' : showEscalations ? 'Escalations' : 'All Tasks'
  const pageDesc = showCancelled ? 'Cancelled workflow items' : showExtHold ? 'Tasks waiting on external action' : showEscalations ? 'Overdue and escalated items' : 'Manage and track all tasks'

  const handleCreate = () => {
    if (!newTask.title.trim()) return
    createMutation.mutate({
      templateId: 'template-1',
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority,
      dueDate: newTask.dueDate || undefined,
      creatorId: currentUser?.username === 'admin' ? 'user-admin' : 'user-ea',
    })
  }

  return (
    <>
      <div className="ph">
        <div className="ph-left">
          <h2>{pageTitle}</h2>
          <p>{pageDesc}</p>
        </div>
        <div className="ph-right">
          {(currentUser?.role === 'admin' || currentUser?.role === 'ea') && !showCancelled && !showExtHold && !showEscalations && (
            <button className="btn btn-gold" onClick={() => setShowCreate(true)}>+ Create Task</button>
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

      {/* Task List */}
      <div className="card">
        <div className="ch">
          <div className="ct">📋 {filtered.length} Item(s)</div>
          <span className="badge b-gold" style={{ fontSize: 10 }}>Live</span>
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr><th>Title</th><th>Status</th><th>Priority</th><th>Due Date</th><th>Created</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="tac" style={{ padding: 30, color: 'var(--t3)' }}>No items found</td></tr>
              ) : filtered.map((item: any) => (
                <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedTaskId(item.id)}>
                  <td>
                    <div className="flex">
                      <div className="av" style={{
                        background: item.status === 'COMPLETED' ? 'var(--green)' :
                          item.status === 'ESCALATED' ? 'var(--red)' :
                          item.status === 'EXTERNAL_HOLD' ? '#C2410C' : 'var(--g2)',
                      }}>{getInitials(item.title)}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 12.5 }}>{item.title}</div>
                        <div style={{ fontSize: 10, color: 'var(--t3)' }}>{item.type === 'workflow' ? 'Workflow' : 'Task'}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={`badge ${statusBadgeClass[item.status] || 's-pending'}`} style={{ fontSize: 10 }}>
                    {statusLabels[item.status] || item.status}
                  </span></td>
                  <td><span className={`badge ${priorityClass[item.priority] || 'p-med'}`} style={{ fontSize: 10 }}>
                    {priorityLabels[item.priority] || item.priority || 'Medium'}
                  </span></td>
                  <td style={{ fontSize: 11.5 }}>
                    {item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                    {item.dueDate && new Date(item.dueDate) < new Date() && item.status !== 'COMPLETED' && (
                      <span style={{ color: 'var(--red)', fontWeight: 700, marginLeft: 4 }}>OVERDUE</span>
                    )}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--t3)' }}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreate && (
        <div className="overlay show" onClick={e => { if (e.target === e.currentTarget) setShowCreate(false) }}>
          <div className="modal modal-lg">
            <button className="mx" onClick={() => setShowCreate(false)}>✕</button>
            <div className="mt">Create New Task</div>
            <div className="ms">Add a new workflow task to the system</div>
            <div className="gold-divider" />
            <div className="form-row fr-1">
              <div className="fg">
                <label>Task Title <span style={{ color: 'var(--red)' }}>*</span></label>
                <input className="fi" placeholder="Enter task title..." value={newTask.title}
                  onChange={e => setNewTask({ ...newTask, title: e.target.value })} />
              </div>
            </div>
            <div className="form-row fr-1">
              <div className="fg">
                <label>Description</label>
                <textarea className="fi" placeholder="Describe the task..." value={newTask.description}
                  onChange={e => setNewTask({ ...newTask, description: e.target.value })} />
              </div>
            </div>
            <div className="form-row fr-2">
              <div className="fg">
                <label>Priority</label>
                <select className="sel" value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div className="fg">
                <label>Due Date</label>
                <input className="fi" type="date" value={newTask.dueDate}
                  onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })} />
              </div>
            </div>

            {/* Dependency Section */}
            <div className="dep-section">
              <div className="dep-section-title">🔗 Dependency Type</div>
              <div className="dep-type-btns">
                <div className="dep-type-btn active">None</div>
                <div className="dep-type-btn">Internal</div>
                <div className="dep-type-btn">External Hold</div>
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-gold" onClick={handleCreate}
                disabled={!newTask.title.trim() || createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : '+ Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTaskId && (
        <div className="overlay show" onClick={e => { if (e.target === e.currentTarget) setSelectedTaskId(null) }}>
          <div className="modal modal-lg">
            <button className="mx" onClick={() => setSelectedTaskId(null)}>✕</button>
            {(() => {
              const item = [...workflows, ...tasks].find((i: any) => i.id === selectedTaskId)
              if (!item) return <div className="empty"><p>Item not found</p></div>
              return (
                <>
                  <div className="mt">{item.title}</div>
                  <div className="ms">{item.description || 'No description'}</div>
                  <div className="gold-divider" />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                    <span className={`badge ${statusBadgeClass[item.status] || 's-pending'}`}>
                      {statusLabels[item.status] || item.status}
                    </span>
                    <span className={`badge ${priorityClass[item.priority] || 'p-med'}`}>
                      {priorityLabels[item.priority] || item.priority || 'Medium'}
                    </span>
                    {item.dueDate && (
                      <span className="badge b-gray">
                        Due: {new Date(item.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>

                  {/* Workflow Flow */}
                  <div className="wf-flow" style={{ marginBottom: 14 }}>
                    <span className="wf-stage wf-stage-ea">EA Review</span>
                    <span className="wf-arrow">→</span>
                    <span className="wf-stage wf-stage-dir">Director</span>
                    <span className="wf-arrow">→</span>
                    <span className="wf-stage wf-stage-done">Done</span>
                  </div>

                  {/* Step Progress */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)', marginBottom: 8 }}>Step Progress</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {Array.from({ length: Math.max(item.currentStepOrder || 1, 3) }, (_, i) => (
                        <div key={i} style={{
                          flex: 1, height: 6, borderRadius: 3,
                          background: i < (item.currentStepOrder || 0) ? 'var(--green)' : 'var(--b1)',
                        }} />
                      ))}
                    </div>
                  </div>

                  {/* Audit Trail */}
                  <div className="audit-trail">
                    <div className="audit-trail-title">Audit Trail</div>
                    <div className="audit-entry">
                      <div className="audit-dot" style={{ background: 'var(--g2)' }} />
                      <div className="audit-text">Created — {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A'}</div>
                    </div>
                    {item.status !== 'DRAFT' && (
                      <div className="audit-entry">
                        <div className="audit-dot" style={{ background: 'var(--amber)' }} />
                        <div className="audit-text">Status: {statusLabels[item.status] || item.status}</div>
                      </div>
                    )}
                  </div>

                  {/* Action buttons based on role */}
                  {(currentUser?.role === 'admin' || currentUser?.role === 'ea') && item.status !== 'COMPLETED' && item.status !== 'CANCELLED' && (
                    <div className="dd-action-bar" style={{ marginTop: 14 }}>
                      <button className="dd-btn-verify">✓ Verify & Approve</button>
                      <button className="dd-btn-send-dir">📤 Send to Director</button>
                      <button className="dd-btn-return-emp">↩ Return to Employee</button>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      )}
    </>
  )
}

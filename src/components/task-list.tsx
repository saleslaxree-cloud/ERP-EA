'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useWorkflowStore } from '@/stores/workflow-store'

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: string | null
  completedAt: string | null
  createdAt: string
  owner: { id: string; name: string; department: string | null }
  workflow: { id: string; title: string } | null
}

interface User {
  id: string
  name: string
  role: string
  department: string | null
}

export function TaskList() {
  const { activeView } = useWorkflowStore()
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState('MEDIUM')
  const [newOwnerId, setNewOwnerId] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const queryClient = useQueryClient()

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: () => fetch('/api/tasks').then(r => r.json()),
  })

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users-list'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
  })

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description: string; priority: string; ownerId: string; dueDate: string }) =>
      fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setShowCreate(false)
      setNewTitle('')
      setNewDesc('')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const getBadgeClass = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 's-pending', IN_PROGRESS: 's-inprog', COMPLETED: 's-done',
      CANCELLED: 's-cancelled', ESCALATED: 'b-red', ON_HOLD: 's-waiting',
      DRAFT: 's-pending', IN_REVIEW: 'b-blue', EXTERNAL_HOLD: 's-exthold',
      RE_OPENED: 'b-amber', APPROVED: 'b-green', REJECTED: 'b-red',
    }
    return map[status] || 'b-gray'
  }

  const getPriorityBadge = (p: string) => {
    const map: Record<string, string> = { CRITICAL: 'p-critical', HIGH: 'p-high', MEDIUM: 'p-med', LOW: 'p-low' }
    return map[p] || 'p-med'
  }

  const isCancelledView = activeView === 'cancelled'

  const filtered = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchesSearch) return false

    if (isCancelledView) return t.status === 'CANCELLED'

    switch (activeTab) {
      case 'all': return true
      case 'in_progress': return t.status === 'IN_PROGRESS'
      case 'pending': return t.status === 'PENDING'
      case 'completed': return t.status === 'COMPLETED'
      case 'overdue': return t.dueDate ? new Date(t.dueDate) < new Date() && !['COMPLETED', 'CANCELLED'].includes(t.status) : false
      default: return true
    }
  })

  const counts: Record<string, number> = {
    all: tasks.length,
    in_progress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    pending: tasks.filter(t => t.status === 'PENDING').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
    overdue: tasks.filter(t => t.dueDate ? new Date(t.dueDate) < new Date() && !['COMPLETED', 'CANCELLED'].includes(t.status) : false).length,
  }

  const tabs = isCancelledView ? [] : [
    { id: 'all', label: 'All' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'pending', label: 'Pending' },
    { id: 'completed', label: 'Completed' },
    { id: 'overdue', label: 'Overdue' },
  ]

  if (isLoading) {
    return (
      <div>
        <div className="ph"><div className="ph-left"><h2>Tasks</h2></div></div>
        <div className="lcard"><div className="cb" style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>Loading tasks…</div></div>
      </div>
    )
  }

  return (
    <div>
      {/* Page Header */}
      <div className="ph">
        <div className="ph-left">
          <h2>{isCancelledView ? 'Cancelled Tasks' : 'Task Management'}</h2>
          <p>{isCancelledView ? 'Archived and cancelled task registry' : 'Complete operational task registry with SLA tracking'}</p>
        </div>
        {!isCancelledView && (
          <div className="ph-right">
            <button className="btn btn-gold" onClick={() => setShowCreate(true)}>+ Create Task</button>
          </div>
        )}
      </div>
      <div className="page-accent" />

      {/* Filters */}
      {!isCancelledView && (
        <div className="lcard" style={{ padding: '12px 14px', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search" style={{ flex: 1, minWidth: 200, maxWidth: 300 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input type="text" placeholder="Search tasks…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>
          {tabs.length > 0 && (
            <div className="tabs mt0" style={{ marginTop: 10, marginBottom: 0 }}>
              {tabs.map(tab => (
                <div
                  key={tab.id}
                  className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                  <span className="tab-cnt" style={tab.id === 'overdue' ? { background: 'var(--red-l)', color: 'var(--red)' } : undefined}>
                    {counts[tab.id] || 0}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Task Table */}
      <div className="lcard">
        <div className="ch">
          <div className="ct">{isCancelledView ? 'Cancelled Tasks' : 'All Tasks'}</div>
          <span style={{ fontSize: 11, color: 'var(--t3)' }}>{filtered.length} entries</span>
        </div>
        <div className="tw">
          <table className="ltable">
            <thead>
              <tr>
                <th>#</th><th>Title</th><th>Priority</th><th>Status</th>
                <th>Due Date</th><th>Assigned To</th><th>Dept</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map((t, i) => (
                <tr key={t.id}>
                  <td style={{ color: 'var(--t3)', fontSize: 11 }}>{i + 1}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.title}</div>
                    {t.description && <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 1 }}>{t.description.slice(0, 60)}{t.description.length > 60 ? '…' : ''}</div>}
                  </td>
                  <td><span className={`badge ${getPriorityBadge(t.priority)}`}>{t.priority}</span></td>
                  <td><span className={`badge ${getBadgeClass(t.status)}`}>{t.status.replace(/_/g, ' ')}</span></td>
                  <td style={{ fontSize: 11 }}>
                    {t.dueDate ? (
                      <span style={{
                        color: new Date(t.dueDate) < new Date() && !['COMPLETED', 'CANCELLED'].includes(t.status) ? 'var(--red)' : 'var(--t2)',
                        fontWeight: new Date(t.dueDate) < new Date() && !['COMPLETED', 'CANCELLED'].includes(t.status) ? 700 : 400,
                      }}>
                        {new Date(t.dueDate).toLocaleDateString()}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="ua" style={{ width: 22, height: 22, fontSize: 8 }}>
                        {t.owner?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
                      </div>
                      {t.owner?.name || '—'}
                    </div>
                  </td>
                  <td style={{ fontSize: 11 }}>{t.owner?.department || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {t.status === 'PENDING' && (
                        <button className="btn btn-green btn-xs" onClick={() => updateMutation.mutate({ id: t.id, status: 'IN_PROGRESS' })}>
                          Start
                        </button>
                      )}
                      {t.status === 'IN_PROGRESS' && (
                        <button className="btn btn-green btn-xs" onClick={() => updateMutation.mutate({ id: t.id, status: 'COMPLETED' })}>
                          Done
                        </button>
                      )}
                      {!['COMPLETED', 'CANCELLED'].includes(t.status) && (
                        <button className="btn btn-red btn-xs" onClick={() => updateMutation.mutate({ id: t.id, status: 'CANCELLED' })}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--t3)' }}>
                    No tasks found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreate && (
        <div className="overlay show" onClick={e => { if (e.target === e.currentTarget) setShowCreate(false) }}>
          <div className="modal modal-md">
            <button className="mx" onClick={() => setShowCreate(false)}>✕</button>
            <div className="mt">Create New Task</div>
            <div className="ms">Add a new task to the system</div>

            <div className="fg">
              <label>Title <span>*</span></label>
              <input className="fi" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Enter task title" />
            </div>

            <div className="fg">
              <label>Description</label>
              <textarea className="fi" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Optional description" rows={3} />
            </div>

            <div className="form-row fr-3">
              <div className="fg">
                <label>Priority</label>
                <select className="sel" value={newPriority} onChange={e => setNewPriority(e.target.value)}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div className="fg">
                <label>Assign To</label>
                <select className="sel" value={newOwnerId} onChange={e => setNewOwnerId(e.target.value)}>
                  <option value="">Select user…</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="fg">
                <label>Due Date</label>
                <input className="fi" type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} />
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-out" onClick={() => setShowCreate(false)}>Cancel</button>
              <button
                className="btn btn-gold"
                disabled={!newTitle || !newOwnerId}
                onClick={() => createMutation.mutate({
                  title: newTitle,
                  description: newDesc,
                  priority: newPriority,
                  ownerId: newOwnerId,
                  dueDate: newDueDate,
                })}
              >
                {createMutation.isPending ? 'Creating…' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

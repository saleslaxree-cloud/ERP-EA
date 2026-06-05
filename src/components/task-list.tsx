'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { useWorkflowStore } from '@/stores/workflow-store'

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  department: string | null
  category: string | null
  dueDate: string | null
  completedAt: string | null
  createdAt: string
  ownerId: string
  owner: { id: string; name: string; email: string; role: string; department: string | null; avatar: string | null }
  workflow: { id: string; title: string; status: string } | null
  dependencies?: { id: string; dependsOnTaskId: string; dependencyType: string; dependsOnTask: { id: string; title: string; status: string } }[]
  subTasks: { id: string; title: string; status: string; ownerId: string; owner: { id: string; name: string } }[]
  taskSteps?: { id: string; title: string; status: string; order: number }[]
  stepsCount?: number
  stepsDone?: number
}

interface User {
  id: string
  name: string
  role: string
  department: string | null
}

interface WorkflowTemplate {
  id: string
  name: string
  description: string | null
  category: string | null
}

const DEPT_DEPS = ['Sales', 'Accounts', 'HR', 'Coordinator', 'Admin', 'Back Office', 'Management']
const DIRECTOR_DEPS = ['Ashish Sir', 'Samarth Sir']

export function TaskList() {
  const { activeView, currentUserId } = useWorkflowStore()
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState('MEDIUM')
  const [newOwnerId, setNewOwnerId] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newDepartment, setNewDepartment] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newDeptDeps, setNewDeptDeps] = useState<string[]>([])
  const [newDirectorDeps, setNewDirectorDeps] = useState<string[]>([])
  const [newWorkflowId, setNewWorkflowId] = useState('')
  const queryClient = useQueryClient()

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: () => fetch('/api/tasks').then(r => r.json()),
  })

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users-list'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
  })

  const { data: workflowTemplates = [] } = useQuery<WorkflowTemplate[]>({
    queryKey: ['workflow-templates'],
    queryFn: () => fetch('/api/workflow-templates').then(r => r.json()),
  })

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      setShowCreate(false)
      setNewTitle('')
      setNewDesc('')
      setNewPriority('MEDIUM')
      setNewOwnerId('')
      setNewDueDate('')
      setNewDepartment('')
      setNewCategory('')
      setNewDeptDeps([])
      setNewDirectorDeps([])
      setNewWorkflowId('')
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
      PENDING: 's-pending', ASSIGNED: 's-assigned', IN_PROGRESS: 's-inprog',
      COMPLETED: 's-done', CANCELLED: 's-cancelled', ESCALATED: 'b-red',
      ON_HOLD: 's-waiting', DRAFT: 's-pending', IN_REVIEW: 's-appr',
      EXTERNAL_HOLD: 's-exthold', RE_OPENED: 'b-amber',
      APPROVED: 'b-green', REJECTED: 'b-red', AWAITING_APPROVAL: 's-appr',
    }
    return map[status] || 'b-gray'
  }

  const getPriorityBadge = (p: string) => {
    const map: Record<string, string> = { CRITICAL: 'p-critical', HIGH: 'p-high', MEDIUM: 'p-med', LOW: 'p-low' }
    return map[p] || 'p-med'
  }

  const isCancelledView = activeView === 'cancelled'

  const categories = useMemo(() => {
    const set = new Set<string>()
    tasks.forEach(t => { if (t.category) set.add(t.category) })
    return Array.from(set).sort()
  }, [tasks])

  const departments = useMemo(() => {
    const set = new Set<string>()
    tasks.forEach(t => { if (t.department) set.add(t.department); else if (t.owner?.department) set.add(t.owner.department) })
    return Array.from(set).sort()
  }, [tasks])

  const getSLAStatus = (dueDate: string | null, status: string) => {
    if (!dueDate || ['COMPLETED', 'CANCELLED'].includes(status)) return null
    const now = new Date()
    const due = new Date(dueDate)
    const hoursLeft = (due.getTime() - now.getTime()) / (1000 * 60 * 60)
    if (hoursLeft < 0) return { label: 'BREACHED', color: 'var(--red)', bg: 'var(--red-l)' }
    if (hoursLeft < 4) return { label: 'CRITICAL', color: '#C2410C', bg: '#FFF7ED' }
    if (hoursLeft < 24) return { label: 'AT RISK', color: 'var(--amber)', bg: 'var(--amber-l)' }
    return { label: 'ON TRACK', color: 'var(--green)', bg: 'var(--green-l)' }
  }

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      if (!matchesSearch) return false
      if (priorityFilter && t.priority !== priorityFilter) return false
      if (employeeFilter && t.ownerId !== employeeFilter) return false
      if (categoryFilter && t.category !== categoryFilter) return false
      if (deptFilter) {
        const taskDept = t.department || t.owner?.department || ''
        if (taskDept !== deptFilter) return false
      }

      if (isCancelledView) return t.status === 'CANCELLED'

      switch (activeTab) {
        case 'all': return true
        case 'assigned': return t.status === 'PENDING' || t.status === 'ASSIGNED'
        case 'pending': return t.status === 'PENDING'
        case 'in_progress': return t.status === 'IN_PROGRESS'
        case 'awaiting_approval': return t.status === 'IN_REVIEW' || t.status === 'AWAITING_APPROVAL'
        case 'completed': return t.status === 'COMPLETED'
        case 'overdue': return t.dueDate ? new Date(t.dueDate) < new Date() && !['COMPLETED', 'CANCELLED'].includes(t.status) : false
        default: return true
      }
    })
  }, [tasks, searchQuery, priorityFilter, employeeFilter, categoryFilter, deptFilter, activeTab, isCancelledView])

  const counts = useMemo(() => ({
    all: tasks.length,
    assigned: tasks.filter(t => t.status === 'PENDING' || t.status === 'ASSIGNED').length,
    pending: tasks.filter(t => t.status === 'PENDING').length,
    in_progress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    awaiting_approval: tasks.filter(t => t.status === 'IN_REVIEW' || t.status === 'AWAITING_APPROVAL').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
    overdue: tasks.filter(t => t.dueDate ? new Date(t.dueDate) < new Date() && !['COMPLETED', 'CANCELLED'].includes(t.status) : false).length,
  }), [tasks])

  const tabs = isCancelledView ? [] : [
    { id: 'all', label: 'All' },
    { id: 'assigned', label: 'Assigned' },
    { id: 'pending', label: 'Pending' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'awaiting_approval', label: 'Awaiting Approval' },
    { id: 'completed', label: 'Completed' },
    { id: 'overdue', label: 'Overdue' },
  ]

  const clearFilters = () => {
    setSearchQuery('')
    setPriorityFilter('')
    setEmployeeFilter('')
    setCategoryFilter('')
    setDeptFilter('')
  }

  const hasFilters = searchQuery || priorityFilter || employeeFilter || categoryFilter || deptFilter

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const getShortId = (id: string) => id.slice(-6).toUpperCase()

  const toggleDeptDep = (dept: string) => {
    setNewDeptDeps(prev => prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept])
  }

  const toggleDirectorDep = (dir: string) => {
    setNewDirectorDeps(prev => prev.includes(dir) ? prev.filter(d => d !== dir) : [...prev, dir])
  }

  const hasDeps = newDeptDeps.length > 0 || newDirectorDeps.length > 0

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

      {/* Filters Bar */}
      {!isCancelledView && (
        <div className="lcard" style={{ padding: '12px 14px', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search" style={{ flex: 1, minWidth: 180, maxWidth: 260 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input type="text" placeholder="Search tasks…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>

            <select className="sel" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={{ minWidth: 110 }}>
              <option value="">Priority</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select className="sel" value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)} style={{ minWidth: 130 }}>
              <option value="">Employee</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>

            <select className="sel" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ minWidth: 120 }}>
              <option value="">Category</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select className="sel" value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ minWidth: 120 }}>
              <option value="">Department</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            {hasFilters && (
              <button className="btn btn-ghost btn-xs" onClick={clearFilters}>✕ Clear</button>
            )}
          </div>

          {/* Tab Bar */}
          {tabs.length > 0 && (
            <div className="tabs" style={{ marginTop: 10, marginBottom: 0 }}>
              {tabs.map(tab => (
                <div
                  key={tab.id}
                  className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                  <span className="tab-cnt" style={
                    tab.id === 'overdue' && counts[tab.id as keyof typeof counts] > 0
                      ? { background: 'var(--red-l)', color: 'var(--red)' }
                      : undefined
                  }>
                    {counts[tab.id as keyof typeof counts] || 0}
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
                <th>#</th>
                <th>Task ID</th>
                <th>Title</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>SLA</th>
                <th>Assigned To</th>
                <th>Dept</th>
                <th>Category</th>
                <th>Workflow</th>
                <th>Steps</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map((t, i) => {
                const sla = getSLAStatus(t.dueDate, t.status)
                const stepsDone = t.taskSteps ? t.taskSteps.filter(s => s.status === 'COMPLETED').length : (t.stepsDone || 0)
                const stepsTotal = t.taskSteps ? t.taskSteps.length : (t.stepsCount || 0)
                const hasDeps = t.dependencies && t.dependencies.length > 0

                return (
                  <tr key={t.id}>
                    <td style={{ color: 'var(--t3)', fontSize: 11 }}>{i + 1}</td>
                    <td><span className="td-code">{getShortId(t.id)}</span></td>
                    <td>
                      <div style={{ fontWeight: 600, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                      {t.description && <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 1, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description.slice(0, 50)}{t.description.length > 50 ? '…' : ''}</div>}
                      {hasDeps && <div style={{ fontSize: 9, color: 'var(--purple)', marginTop: 2, fontWeight: 700 }}>🔗 Dependency</div>}
                    </td>
                    <td><span className={`badge ${getPriorityBadge(t.priority)}`}>{t.priority}</span></td>
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
                      {sla ? (
                        <span className="badge" style={{ background: sla.bg, color: sla.color, fontSize: 9 }}>
                          {sla.label}
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, color: 'var(--t4)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="av" style={{ width: 22, height: 22, fontSize: 8, background: 'linear-gradient(135deg,var(--g1),var(--g3))' }}>
                          {t.owner?.name ? getInitials(t.owner.name) : '??'}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600 }}>{t.owner?.name || '—'}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 11 }}>{t.department || t.owner?.department || '—'}</td>
                    <td style={{ fontSize: 11 }}>{t.category || '—'}</td>
                    <td>
                      {t.workflow ? (
                        <span className="badge" style={{ background: 'var(--purple-l)', color: 'var(--purple)', fontSize: 9 }}>{t.workflow.status}</span>
                      ) : (
                        <span style={{ fontSize: 10, color: 'var(--t4)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div className="prog-bg" style={{ width: 40, height: 4 }}>
                          <div className="prog-fill" style={{
                            width: `${stepsTotal > 0 ? (stepsDone / stepsTotal) * 100 : 0}%`,
                            background: stepsDone === stepsTotal && stepsTotal > 0 ? 'var(--green)' : 'var(--g2)',
                          }} />
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 700 }}>{stepsDone}/{stepsTotal}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {t.status === 'PENDING' && (
                          <button className="btn btn-green btn-xs" onClick={() => updateMutation.mutate({ id: t.id, status: 'IN_PROGRESS' })}>
                            Start
                          </button>
                        )}
                        {t.status === 'IN_PROGRESS' && !t.workflowId && (
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
                )
              }) : (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: 30, color: 'var(--t3)' }}>
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
          <div className="modal" style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="mx" onClick={() => setShowCreate(false)}>✕</button>
            <div className="mt">Create New Task</div>
            <div className="ms">Add a new task with optional department/director dependencies and workflow</div>

            {/* Approval Flow Preview */}
            {hasDeps && (
              <div style={{ background: 'linear-gradient(135deg,rgba(109,40,217,.06),var(--card))', border: '1px solid rgba(109,40,217,.15)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--purple)', marginBottom: 8 }}>Approval Flow Preview</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  <div style={{ background: 'var(--blue-l)', color: 'var(--blue)', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800 }}>Employee</div>
                  <span style={{ color: 'var(--purple)', fontSize: 12, fontWeight: 900 }}>→</span>
                  <div style={{ background: 'var(--amber-l)', color: 'var(--amber)', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800 }}>EA Review</div>
                  <span style={{ color: 'var(--purple)', fontSize: 12, fontWeight: 900 }}>→</span>
                  <div style={{ background: 'var(--purple-l)', color: 'var(--purple)', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, border: '1.5px solid var(--purple)' }}>Director Approval</div>
                  <span style={{ color: 'var(--purple)', fontSize: 12, fontWeight: 900 }}>→</span>
                  <div style={{ background: 'var(--amber-l)', color: 'var(--amber)', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800 }}>EA Final Review</div>
                  <span style={{ color: 'var(--purple)', fontSize: 12, fontWeight: 900 }}>→</span>
                  <div style={{ background: 'var(--green-l)', color: 'var(--green)', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800 }}>Complete</div>
                </div>
              </div>
            )}

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
                <label>Assign To <span>*</span></label>
                <select className="sel" value={newOwnerId} onChange={e => setNewOwnerId(e.target.value)}>
                  <option value="">Select user…</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
              </div>
              <div className="fg">
                <label>Due Date</label>
                <input className="fi" type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} />
              </div>
            </div>

            <div className="form-row fr-2">
              <div className="fg">
                <label>Department</label>
                <select className="sel" value={newDepartment} onChange={e => setNewDepartment(e.target.value)}>
                  <option value="">Select department…</option>
                  {DEPT_DEPS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="fg">
                <label>Category</label>
                <input className="fi" value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="e.g. Operations, Finance, HR" />
              </div>
            </div>

            {/* Department Dependencies */}
            <div style={{ marginTop: 12, marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t1)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--blue)' }}>🏢</span> Department Dependencies
                <span style={{ fontSize: 9, color: 'var(--t3)', fontWeight: 400 }}>(triggers EA → Director approval flow)</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {DEPT_DEPS.map(dept => (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => toggleDeptDep(dept)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      border: newDeptDeps.includes(dept) ? '1.5px solid var(--blue)' : '1.5px solid var(--b2)',
                      background: newDeptDeps.includes(dept) ? 'var(--blue-l)' : 'var(--card)',
                      color: newDeptDeps.includes(dept) ? 'var(--blue)' : 'var(--t2)',
                      cursor: 'pointer',
                      transition: 'all .15s',
                    }}
                  >
                    {newDeptDeps.includes(dept) ? '✓ ' : ''}{dept}
                  </button>
                ))}
              </div>
            </div>

            {/* Director Dependencies */}
            <div style={{ marginTop: 12, marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t1)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--purple)' }}>👔</span> Director Dependencies
                <span style={{ fontSize: 9, color: 'var(--t3)', fontWeight: 400 }}>(requires director approval before completion)</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {DIRECTOR_DEPS.map(dir => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => toggleDirectorDep(dir)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      border: newDirectorDeps.includes(dir) ? '1.5px solid var(--purple)' : '1.5px solid var(--b2)',
                      background: newDirectorDeps.includes(dir) ? 'var(--purple-l)' : 'var(--card)',
                      color: newDirectorDeps.includes(dir) ? 'var(--purple)' : 'var(--t2)',
                      cursor: 'pointer',
                      transition: 'all .15s',
                    }}
                  >
                    {newDirectorDeps.includes(dir) ? '✓ ' : ''}{dir}
                  </button>
                ))}
              </div>
            </div>

            {/* Workflow Selection (Optional) */}
            <div style={{ marginTop: 12, marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t1)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--amber)' }}>📋</span> Workflow Template
                <span style={{ fontSize: 9, color: 'var(--t3)', fontWeight: 400 }}>(optional - auto-created if dependencies selected)</span>
              </div>
              <select className="sel" value={newWorkflowId} onChange={e => setNewWorkflowId(e.target.value)} style={{ width: '100%' }}>
                <option value="">No workflow (standalone task)</option>
                {workflowTemplates.map(wt => (
                  <option key={wt.id} value={wt.id}>{wt.name} {wt.category ? `(${wt.category})` : ''}</option>
                ))}
              </select>
            </div>

            <div className="form-actions" style={{ marginTop: 16 }}>
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
                  department: newDepartment,
                  category: newCategory,
                  departmentDependencies: newDeptDeps,
                  directorDependencies: newDirectorDeps,
                  workflowTemplateId: newWorkflowId || undefined,
                })}
              >
                {createMutation.isPending ? 'Creating…' : `Create Task${hasDeps ? ' with Approval Flow' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

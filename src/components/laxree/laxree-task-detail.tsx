'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useWorkflowStore } from '@/stores/workflow-store'

interface TaskData {
  id: string; title: string; description?: string; status: string; priority: string; ownerId: string;
  owner: { id: string; name: string; role: string }
  dueDate: string | null; createdAt: string
  subTasks: TaskData[]
  workflow?: { id: string; title: string; status: string } | null
}

function getInitials(name: string) { return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) }
function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    PENDING: 'badge s-pending', IN_PROGRESS: 'badge s-inprog', COMPLETED: 'badge s-done',
    CANCELLED: 'badge s-cancelled', ON_HOLD: 'badge s-waiting', EXTERNAL_HOLD: 'badge s-exthold',
    APPROVED: 'badge b-green', REJECTED: 'badge b-red', ESCALATED: 'badge b-rose',
    IN_REVIEW: 'badge b-blue', DRAFT: 'badge s-pending',
  }
  return map[status] || 'badge b-gray'
}
function priorityBadgeClass(priority: string) {
  const map: Record<string, string> = { CRITICAL: 'badge p-critical', HIGH: 'badge p-high', MEDIUM: 'badge p-med', LOW: 'badge p-low' }
  return map[priority] || 'badge b-gray'
}

const AVATAR_COLORS = ['#B45309','#6D28D9','#0F766E','#1D4ED8','#BE123C','#15803D','#C2410C','#7C3AED','#0D9488','#B8860B','#D97706','#4F46E5','#059669','#DC2626','#B8860B','#B8860B']
function avatarColor(name: string) { let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h); return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length] }

export function LaxreeTaskDetail() {
  const { selectedTaskId, setSelectedTaskId, currentUser, addToast } = useWorkflowStore()
  const qc = useQueryClient()

  const { data: tasks = [] } = useQuery<TaskData[]>({
    queryKey: ['task-detail-tasks'],
    queryFn: () => fetch('/api/tasks').then(r => r.json()),
    enabled: !!selectedTaskId,
  })

  const task = tasks.find(t => t.id === selectedTaskId)
  if (!selectedTaskId || !task) return null

  const isEA = currentUser?.role === 'ea' || currentUser?.role === 'admin'
  const isDirector = currentUser?.role === 'director'
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED' && task.status !== 'CANCELLED'

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        addToast('ok', `Status updated to ${newStatus.replace(/_/g, ' ')}`)
        qc.invalidateQueries({ queryKey: ['task-detail-tasks'] })
        qc.invalidateQueries({ queryKey: ['tasks'] })
      } else {
        addToast('err', 'Failed to update status')
      }
    } catch {
      addToast('err', 'Failed to update status')
    }
  }

  return (
    <div className="overlay show" onClick={() => setSelectedTaskId(null)}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <button className="mx" onClick={() => setSelectedTaskId(null)}>✕</button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div className="av" style={{ background: avatarColor(task.owner?.name || 'X'), width: 42, height: 42, fontSize: 14, flexShrink: 0 }}>{getInitials(task.owner?.name || '?')}</div>
          <div style={{ flex: 1 }}>
            <div className="mt" style={{ marginBottom: 4 }}>{task.title}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className={statusBadgeClass(task.status)}>{task.status.replace(/_/g, ' ')}</span>
              <span className={priorityBadgeClass(task.priority)}>{task.priority}</span>
              {isOverdue && <span className="badge b-red">⚠ OVERDUE</span>}
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="cb" style={{ padding: '10px 14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
              <div><span style={{ color: 'var(--t3)', fontWeight: 700 }}>Assignee:</span> {task.owner?.name}</div>
              <div><span style={{ color: 'var(--t3)', fontWeight: 700 }}>Priority:</span> {task.priority}</div>
              <div><span style={{ color: 'var(--t3)', fontWeight: 700 }}>Due:</span> {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No due date'}</div>
              <div><span style={{ color: 'var(--t3)', fontWeight: 700 }}>Created:</span> {new Date(task.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</div>
              {task.workflow && <div><span style={{ color: 'var(--t3)', fontWeight: 700 }}>Workflow:</span> {task.workflow.title}</div>}
            </div>
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--t3)', marginBottom: 6 }}>Description</div>
            <div style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.6, background: 'var(--bg)', padding: 12, borderRadius: 'var(--r-sm)' }}>{task.description}</div>
          </div>
        )}

        {/* Approval Routing */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--t3)', marginBottom: 6 }}>Approval Routing</div>
          <div className="wf-flow" style={{ fontSize: 13 }}>
            <span className={`wf-stage wf-stage-ea ${task.status === 'IN_REVIEW' || task.status === 'ON_HOLD' || task.status === 'COMPLETED' || (task.workflow && task.workflow.status === 'APPROVED') ? 'wf-stage-done' : ''}`}>EA Review</span>
            <span className="wf-arrow">→</span>
            <span className={`wf-stage ${task.status === 'ON_HOLD' ? 'wf-stage-dir' : task.status === 'COMPLETED' ? 'wf-stage-done' : ''}`}>Director</span>
            <span className="wf-arrow">→</span>
            <span className={`wf-stage ${task.status === 'IN_REVIEW' && task.workflow?.status !== 'PENDING' ? 'wf-stage-done' : ''}`}>EA Final</span>
            <span className="wf-arrow">→</span>
            <span className={`wf-stage ${task.workflow?.status === 'APPROVED' ? 'wf-stage-dir' : task.status === 'COMPLETED' ? 'wf-stage-done' : ''}`}>Employee Submit</span>
            <span className="wf-arrow">→</span>
            <span className={`wf-stage ${task.status === 'COMPLETED' ? 'wf-stage-done' : ''}`}>Done</span>
          </div>
        </div>

        {/* Sub Tasks */}
        {task.subTasks && task.subTasks.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--t3)', marginBottom: 6 }}>Sub Tasks</div>
            {task.subTasks.map(st => (
              <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--b1)' }}>
                <span className={statusBadgeClass(st.status)}>{st.status.replace(/_/g, ' ')}</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{st.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="gold-divider" />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {task.status === 'PENDING' && (
            <>
              <button className="btn btn-green" onClick={() => handleStatusChange('IN_PROGRESS')}>▶ Start Task</button>
              {isEA && <button className="dd-btn-send-dir" onClick={() => handleStatusChange('ON_HOLD')}>↗ Send to Director</button>}
            </>
          )}
          {task.status === 'IN_PROGRESS' && task.workflow && task.workflow.status === 'APPROVED' && (
            <button className="btn btn-green" onClick={() => handleStatusChange('COMPLETED')}>✓ Final Submit</button>
          )}
          {task.status === 'IN_PROGRESS' && (!task.workflow || task.workflow.status !== 'APPROVED') && (
            <button className="btn btn-green" onClick={() => handleStatusChange('COMPLETED')}>✓ Submit for Review</button>
          )}
          {task.status === 'ON_HOLD' && isDirector && (
            <>
              <button className="dd-btn-dir-approve" onClick={() => handleStatusChange('IN_REVIEW')}>✓ Approve & Send to EA</button>
              <button className="dd-btn-dir-reject" onClick={() => handleStatusChange('PENDING')}>✗ Reject & Return to Employee</button>
              <button className="dd-btn-send-ea" onClick={() => handleStatusChange('IN_REVIEW')}>↩ Send to EA</button>
            </>
          )}
          {task.status === 'ESCALATED' && isDirector && (
            <>
              <button className="dd-btn-dir-approve" onClick={() => handleStatusChange('IN_REVIEW')}>✓ Approve & Send to EA</button>
              <button className="dd-btn-dir-reject" onClick={() => handleStatusChange('PENDING')}>✗ Reject & Return to Employee</button>
            </>
          )}
          <button className="btn btn-red btn-sm" onClick={() => handleStatusChange('CANCELLED')} style={{ marginLeft: 'auto' }}>Cancel Task</button>
        </div>

        {/* Audit Trail */}
        <div className="audit-trail" style={{ marginTop: 14 }}>
          <div className="audit-trail-title">Audit Trail</div>
          <div className="audit-entry">
            <div className="audit-dot" style={{ background: 'var(--green)' }} />
            <span className="audit-text">Task created by {task.owner?.name}</span>
            <span className="audit-time">{new Date(task.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="audit-entry">
            <div className="audit-dot" style={{ background: 'var(--amber)' }} />
            <span className="audit-text">Current status: {task.status.replace(/_/g, ' ')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

// Build: 2026-06-19-v13 — Global Task Detail Modal
//
// This is a SINGLE source of truth for the task detail modal. It is rendered
// globally in HomePage so that ANY page (Admin All Tasks, EA My Tasks,
// Employee My Tasks, Employee Dashboard) can open it by calling
// `setSelectedTaskId(task.id)` in the workflow store.
//
// Why this exists:
//   Previously the detail modal was inline inside `laxree-tasks.tsx`, so it
//   only worked on the Admin/EA "All Tasks" page. When employees clicked
//   "View Details" on their My Tasks page, `selectedTaskId` was set but NO
//   modal rendered — the click did nothing visible. This global component
//   fixes that bug.
//
// It includes:
//   - Task header (avatar, title, status, priority, department, category, SLA)
//   - Description block
//   - Details grid (assignee, due date, created, completed, revise info)
//   - Task steps with role-based "Complete" button (ADMIN/EA only)
//   - Role-based action buttons (Done / Revise / Cancel — ADMIN/EA only;
//     read-only notice for employees)
//   - Completion badge + score
//   - Audit trail

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useWorkflowStore } from '@/stores/workflow-store'

const AVATAR_COLORS = ['#B45309', '#6D28D9', '#0F766E', '#1D4ED8', '#BE123C', '#15803D', '#C2410C', '#7C3AED']
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
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

const priorityBadge: Record<string, { bg: string; color: string }> = {
  CRITICAL: { bg: '#FFF1F2', color: '#E11D48' },
  HIGH: { bg: '#FEF2F2', color: '#DC2626' },
  MEDIUM: { bg: '#FFFBEB', color: '#D97706' },
  LOW: { bg: '#EFF6FF', color: '#2563EB' },
}

function getSlaStatus(task: any) {
  if (task.status === 'COMPLETED' || task.status === 'CANCELLED') return null
  if (!task.dueDate) return { label: 'On Track', bg: '#ECFDF5', color: '#059669' }
  const now = new Date()
  const due = new Date(task.dueDate)
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return { label: 'Overdue', bg: '#FEF2F2', color: '#DC2626' }
  if (diffDays <= 2) return { label: 'Due Soon', bg: '#FFFBEB', color: '#D97706' }
  return { label: 'On Track', bg: '#ECFDF5', color: '#059669' }
}

export function LaxreeTaskDetail() {
  const { selectedTaskId, setSelectedTaskId, currentRole, currentUserId, addToast } = useWorkflowStore()
  const qc = useQueryClient()

  // Fetch all tasks (cached). Query is only enabled when a task is selected.
  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ['task-detail-tasks', currentUserId],
    queryFn: () => fetch('/api/tasks').then(r => {
      if (!r.ok) throw new Error('Failed to fetch tasks')
      return r.json()
    }),
    enabled: !!selectedTaskId,
    staleTime: 0,
  })

  if (!selectedTaskId) return null
  const task = (Array.isArray(tasks) ? tasks : []).find(t => t.id === selectedTaskId)
  if (!task) return null

  const owner = task.owner
  const stepsTotal = task.taskSteps?.length || 0
  const stepsDone = task.taskSteps?.filter((s: any) => s.status === 'COMPLETED').length || 0
  const sla = getSlaStatus(task)
  const pBadge = priorityBadge[task.priority] || priorityBadge.MEDIUM
  const sStyle = statusStyle[task.status] || statusStyle.PENDING

  // ADMIN and EA can modify tasks (Done/Revise/Cancel/Complete steps)
  const canModifyTask = currentRole === 'ADMIN' || currentRole === 'EA'

  // Step completion handler — ADMIN/EA only
  const completeStep = async (stepId: string) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}/steps`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId, action: 'complete' }),
      })
      const data = await res.json()
      if (data.allDone) {
        addToast('ok', 'All steps done! Task completed ✓')
      } else {
        addToast('ok', 'Step completed! ✓')
      }
      qc.invalidateQueries({ queryKey: ['task-detail-tasks'] })
      qc.invalidateQueries({ queryKey: ['tasks-list'] })
      qc.invalidateQueries({ queryKey: ['emp-my-tasks'] })
      qc.invalidateQueries({ queryKey: ['emp-tasks'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    } catch {
      addToast('err', 'Failed to complete step')
    }
  }

  // Task-level status change handler
  const handleStatusChange = async (newStatus: string, successMsg: string) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        addToast('ok', successMsg)
        qc.invalidateQueries({ queryKey: ['task-detail-tasks'] })
        qc.invalidateQueries({ queryKey: ['tasks-list'] })
        qc.invalidateQueries({ queryKey: ['emp-my-tasks'] })
        qc.invalidateQueries({ queryKey: ['emp-tasks'] })
        qc.invalidateQueries({ queryKey: ['dashboard'] })
        if (newStatus === 'COMPLETED' || newStatus === 'CANCELLED') {
          setSelectedTaskId(null)
        }
      } else {
        addToast('err', 'Failed to update task')
      }
    } catch {
      addToast('err', 'Failed to update task')
    }
  }

  return (
    <div className="overlay show" onClick={e => { if (e.target === e.currentTarget) setSelectedTaskId(null) }}>
      <div className="modal modal-lg" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <button className="mx" onClick={() => setSelectedTaskId(null)}>✕</button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div className="av" style={{ width: 44, height: 44, fontSize: 15, background: sStyle.color, flexShrink: 0 }}>
            {getInitials(owner?.name || 'T')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mt" style={{ marginBottom: 4, wordBreak: 'break-word' }}>{task.title}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="badge" style={{ background: sStyle.bg, color: sStyle.color, fontWeight: 700 }}>{sStyle.label}</span>
              <span className="badge" style={{ background: pBadge.bg, color: pBadge.color, fontWeight: 700 }}>{task.priority || 'MEDIUM'}</span>
              {task.department && <span className="badge b-gray">{task.department}</span>}
              {task.category && <span className="badge" style={{ background: 'var(--amber-l)', color: 'var(--amber)' }}>{task.category}</span>}
              {sla && <span className="badge" style={{ background: sla.bg, color: sla.color }}>{sla.label}</span>}
            </div>
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <div style={{ marginBottom: 14, padding: 12, background: 'var(--bg)', borderRadius: 8, fontSize: 13, color: 'var(--t2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
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
              ↩ Revised{task.reviseCount > 0 ? ` ×${task.reviseCount}` : ''}: {task.reviseReason}
              {task.reviseNextDate && <span style={{ marginLeft: 8 }}>· Next date: {new Date(task.reviseNextDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>}
            </div>
          )}
          {!task.reviseReason && task.reviseCount > 0 && (
            <div style={{ padding: '6px 12px', background: 'var(--red-l)', borderRadius: 6, color: 'var(--red)', fontWeight: 700, gridColumn: '1 / -1' }}>
              ⚠ Revised ×{task.reviseCount} — score penalty applied
            </div>
          )}
        </div>

        <div className="gold-divider" />

        {/* Step Progress */}
        {stepsTotal > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)', marginBottom: 8 }}>
              Task Steps ({stepsDone}/{stepsTotal})
            </div>
            {task.taskSteps.map((step: any, i: number) => {
              const isCompleted = step.status === 'COMPLETED'
              const isCurrentStep = !isCompleted && (i === 0 || task.taskSteps[i - 1]?.status === 'COMPLETED')
              const isMyStep = step.assigneeId === currentUserId
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
                    {step.assignee && (
                      <span style={{ fontSize: 10, color: 'var(--t3)', marginLeft: 6 }}>
                        · {step.assignee.name}{isMyStep ? ' (you)' : ''}
                      </span>
                    )}
                  </div>
                  {/* Step action button — only ADMIN/EA can complete steps */}
                  {!isCompleted && isCurrentStep && task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && canModifyTask && (
                    <button
                      className="btn btn-xs"
                      style={{
                        background: 'var(--green-l)',
                        color: 'var(--green)',
                        border: '1px solid var(--green)',
                        fontWeight: 700, whiteSpace: 'nowrap',
                      }}
                      onClick={() => completeStep(step.id)}
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

        {/* ACTION BUTTONS — Role-based */}
        <div className="gold-divider" />
        {canModifyTask ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* ADMIN/EA: Full action buttons */}
            {(task.status === 'PENDING' || task.status === 'IN_PROGRESS' || task.status === 'IN_REVIEW' || task.status === 'ON_HOLD') && (
              <>
                {stepsTotal > 0 && stepsDone < stepsTotal ? (
                  <div style={{
                    padding: '8px 16px',
                    background: 'var(--blue-l)',
                    borderRadius: 8,
                    border: '1.5px solid var(--blue)',
                    fontSize: 13, fontWeight: 700, color: 'var(--blue)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    ☰ Complete all steps first ({stepsDone}/{stepsTotal})
                  </div>
                ) : (
                  <button className="btn btn-green" onClick={() => handleStatusChange('COMPLETED', 'Task completed! ✓')}>
                    ✓ Done
                  </button>
                )}
              </>
            )}
            {task.status !== 'CANCELLED' && task.status !== 'COMPLETED' && (
              <button className="btn btn-red btn-sm" onClick={() => handleStatusChange('CANCELLED', 'Task cancelled')} style={{ marginLeft: 'auto' }}>
                🚫 Cancel Task
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* EMPLOYEE/MANAGER/DIRECTOR: Read-only notice */}
            {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
              <div style={{
                padding: '8px 16px',
                background: 'var(--bg2)',
                borderRadius: 8,
                border: '1px solid var(--b2)',
                fontSize: 12, fontWeight: 600, color: 'var(--t3)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                🔒 Only Admin/EA can mark tasks as Done/Revise
              </div>
            )}
          </div>
        )}
        {/* COMPLETED → Show completion badge — everyone sees this */}
        {task.status === 'COMPLETED' && (
          <div style={{
            padding: '8px 16px',
            background: 'var(--green-l)',
            borderRadius: 8,
            border: '1.5px solid var(--green)',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 14, fontWeight: 800, color: 'var(--green)',
          }}>
            Completed task ✅
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
        )}
        {/* CANCELLED → Show cancelled badge */}
        {task.status === 'CANCELLED' && (
          <div style={{
            padding: '8px 16px',
            background: 'var(--bg2)',
            borderRadius: 8,
            border: '1px solid var(--b2)',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 14, fontWeight: 800, color: 'var(--t3)',
          }}>
            🚫 Task Cancelled
          </div>
        )}

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
}

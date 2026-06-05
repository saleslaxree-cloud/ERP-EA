'use client'

import { useWorkflowStore } from '@/stores/workflow-store'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

const DEPTS = ['Sales', 'Back Office', 'Accounts', 'HR', 'Coordinator', 'Admin']
const CATEGORIES = ['Routine Work', 'Reconciliation', 'One Time Work', 'Compliance', 'Operations', 'Procurement']
const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const FREQUENCIES = ['One Time', 'Daily', 'Weekly', 'Monthly']
const ASSIGN_NEEDED_OPTIONS = ['No — Direct Step', 'Ashish Sir', 'Samarth Sir']

interface TaskStep {
  title: string
  assignNeeded: string
  directorNote: string
}

export function LaxreeCreateTask() {
  const { createTaskOpen, setCreateTaskOpen, addToast, currentUserId } = useWorkflowStore()
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    title: '', description: '', assignTo: '', department: DEPTS[0],
    category: CATEGORIES[0], priority: 'MEDIUM', dueDate: '', frequency: 'One Time',
  })

  const [steps, setSteps] = useState<TaskStep[]>([])

  const { data: fetchedUsers = [] } = useQuery({
    queryKey: ['users-create-task'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
    enabled: createTaskOpen,
  })

  const addStep = () => {
    setSteps([...steps, { title: '', assignNeeded: 'No — Direct Step', directorNote: '' }])
  }

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index))
  }

  const updateStep = (index: number, field: keyof TaskStep, value: string) => {
    const newSteps = [...steps]
    newSteps[index] = { ...newSteps[index], [field]: value }
    setSteps(newSteps)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      addToast('err', 'Title is required')
      return
    }

    setSaving(true)
    try {
      // Find user by name to get ownerId
      const user = fetchedUsers.find((u: any) => u.name === form.assignTo)

      // Build taskSteps data
      const taskSteps = steps
        .filter(s => s.title.trim())
        .map((s, i) => ({
          title: s.title.trim(),
          assigneeId: null as string | null,
          directorName: s.assignNeeded !== 'No — Direct Step' ? s.assignNeeded : null,
          directorNote: s.assignNeeded !== 'No — Direct Step' ? s.directorNote : null,
          order: i + 1,
        }))

      // Collect director dependencies from steps
      const directorDeps = steps
        .filter(s => s.assignNeeded !== 'No — Direct Step')
        .map(s => s.assignNeeded)
        .filter((v, i, a) => a.indexOf(v) === i) // unique

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          priority: form.priority,
          ownerId: user?.id || currentUserId,
          dueDate: form.dueDate || undefined,
          department: form.department,
          category: form.category,
          taskSteps,
          departmentDependencies: [],
          directorDependencies: directorDeps,
        }),
      })

      if (res.ok) {
        addToast('ok', `Task "${form.title}" created successfully`)
        qc.invalidateQueries({ queryKey: ['tasks'] })
        qc.invalidateQueries({ queryKey: ['tasks-list'] })
        qc.invalidateQueries({ queryKey: ['dashboard'] })
        setCreateTaskOpen(false)
        setForm({ title: '', description: '', assignTo: '', department: DEPTS[0], category: CATEGORIES[0], priority: 'MEDIUM', dueDate: '', frequency: 'One Time' })
        setSteps([])
      } else {
        const err = await res.json().catch(() => ({}))
        addToast('err', err.error || 'Failed to create task')
      }
    } catch {
      addToast('err', 'Failed to create task')
    }
    setSaving(false)
  }

  if (!createTaskOpen) return null

  const updateField = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  // Filter users for assign dropdown (exclude directors)
  const assignableUsers = fetchedUsers.filter((u: any) => u.role !== 'DIRECTOR')

  return (
    <div className="overlay show" onClick={() => setCreateTaskOpen(false)}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <button className="mx" onClick={() => setCreateTaskOpen(false)}>✕</button>
        <div className="mt">Create New Task</div>
        <div className="ms">Add a new task to the LAXREE system</div>

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="form-row fr-1">
            <div className="fg">
              <label>Title <span style={{ color: 'var(--red)' }}>*</span></label>
              <input className="fi" placeholder="Enter task title" value={form.title} onChange={e => updateField('title', e.target.value)} required />
            </div>
          </div>

          {/* Description */}
          <div className="form-row fr-1">
            <div className="fg">
              <label>Description</label>
              <textarea className="fi" placeholder="Enter task description" value={form.description} onChange={e => updateField('description', e.target.value)} rows={3} />
            </div>
          </div>

          {/* Assign To + Department */}
          <div className="form-row fr-2">
            <div className="fg">
              <label>Assign To</label>
              <select className="fi" value={form.assignTo} onChange={e => updateField('assignTo', e.target.value)}>
                <option value="">Select team member</option>
                {assignableUsers.map((u: any) => <option key={u.id} value={u.name}>{u.name} ({u.department || '—'})</option>)}
              </select>
            </div>
            <div className="fg">
              <label>Department</label>
              <select className="fi" value={form.department} onChange={e => updateField('department', e.target.value)}>
                {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Category + Priority + Due Date */}
          <div className="form-row fr-3">
            <div className="fg">
              <label>Category</label>
              <select className="fi" value={form.category} onChange={e => updateField('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="fg">
              <label>Priority</label>
              <select className="fi" value={form.priority} onChange={e => updateField('priority', e.target.value)}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="fg">
              <label>Due Date</label>
              <input className="fi" type="date" value={form.dueDate} onChange={e => updateField('dueDate', e.target.value)} />
            </div>
          </div>

          {/* Frequency */}
          <div className="form-row fr-2">
            <div className="fg">
              <label>Frequency</label>
              <select className="fi" value={form.frequency} onChange={e => updateField('frequency', e.target.value)}>
                {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="fg" />
          </div>

          {/* ═══ TASK STEPS / WORKFLOW SECTION ═══ */}
          <div className="gold-divider" />
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--g2)', marginBottom: 4 }}>
              TASK STEPS / WORKFLOW (OPTIONAL)
            </div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 12 }}>
              Break this task into ordered steps. Enable Assign Needed on a step to route it to another person or department.
            </div>

            {steps.map((step, index) => (
              <div key={index} style={{ background: 'var(--bg2)', border: '1px solid var(--b1)', borderRadius: 8, padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  {/* Blue numbered circle */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: 'var(--g2)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800, flexShrink: 0,
                  }}>
                    {index + 1}
                  </div>
                  {/* Step input */}
                  <input
                    className="fi"
                    placeholder={`Step ${index + 1} description — what needs to be done?`}
                    value={step.title}
                    onChange={e => updateStep(index, 'title', e.target.value)}
                    style={{ flex: 1 }}
                  />
                  {/* Delete step */}
                  <button
                    type="button"
                    onClick={() => removeStep(index)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--red)', fontSize: 16, fontWeight: 700, padding: '0 4px', flexShrink: 0,
                    }}
                    title="Delete step"
                  >
                    ✕
                  </button>
                </div>

                {/* Assign Needed dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 38 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>
                    ASSIGN NEEDED?
                  </div>
                  <select
                    className="fi"
                    value={step.assignNeeded}
                    onChange={e => updateStep(index, 'assignNeeded', e.target.value)}
                    style={{ width: 180, fontSize: 11, padding: '5px 8px' }}
                  >
                    {ASSIGN_NEEDED_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                {/* Director note field */}
                {step.assignNeeded !== 'No — Direct Step' && (
                  <div style={{ marginLeft: 38, marginTop: 8 }}>
                    <input
                      className="fi"
                      placeholder={`What does ${step.assignNeeded} need to do?`}
                      value={step.directorNote}
                      onChange={e => updateStep(index, 'directorNote', e.target.value)}
                      style={{ fontSize: 11, padding: '5px 8px' }}
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Add Step button */}
            <button
              type="button"
              onClick={addStep}
              className="btn btn-ghost btn-sm"
              style={{ border: '1px dashed var(--b2)', width: '100%', textAlign: 'center', padding: '10px' }}
            >
              + Add Step
            </button>

            {/* Info bar */}
            <div style={{
              marginTop: 10, padding: '8px 12px', background: 'var(--blue-l)', borderRadius: 6,
              fontSize: 10, color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 13 }}>ℹ</span>
              To attach files to this task, save it first then use the attachment option in the task view.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="form-actions" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setCreateTaskOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-gold" disabled={saving || !form.title.trim()}>
              {saving ? 'Saving...' : 'Save Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

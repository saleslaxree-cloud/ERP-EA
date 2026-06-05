'use client'

import { useWorkflowStore } from '@/stores/workflow-store'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

const MEMBERS = [
  'Sandeep', 'Khushboo Manglani', 'Aditya Sharma', 'Ronak Jain', 'Aakash',
  'Anamika', 'Radhika', 'Saurabh', 'Ruchi', 'Arti Sharma',
  'Tanuja Tigaya', 'Aayush', 'Kamlesh', 'Hitesh Tak',
]

const DEPTS = ['Sales', 'Back Office', 'Accounts']
const CATEGORIES = ['Routine Work', 'Reconciliation', 'One Time Work', 'Compliance', 'Operations', 'Procurement']
const PROJECTS = ['General', 'Hotel Operations', 'Roofing Projects', 'Interior Procurement']
const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const REPEAT_OPTIONS = ['None', 'Daily', 'Weekly', 'Monthly']
const DIRECTORS = ['Ashish Sir', 'Samarth Sir', 'Both']

export function LaxreeCreateTask() {
  const { createTaskOpen, setCreateTaskOpen, addToast } = useWorkflowStore()
  const qc = useQueryClient()
  const [form, setForm] = useState({
    title: '', description: '', assignTo: MEMBERS[0], department: DEPTS[0],
    category: CATEGORIES[0], priority: 'MEDIUM', dueDate: '', project: PROJECTS[0],
    repeat: 'None', dependency: 'None', director: '', steps: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      addToast('err', 'Title is required')
      return
    }

    // Find user by name to get ownerId
    try {
      const usersRes = await fetch('/api/users')
      const users = await usersRes.json()
      const user = users.find((u: { name: string }) => u.name === form.assignTo)

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          priority: form.priority,
          ownerId: user?.id || 'unknown',
          dueDate: form.dueDate || undefined,
        }),
      })

      if (res.ok) {
        addToast('ok', `Task "${form.title}" created successfully`)
        qc.invalidateQueries({ queryKey: ['tasks'] })
        qc.invalidateQueries({ queryKey: ['tasks-page'] })
        qc.invalidateQueries({ queryKey: ['dashboard'] })
        setCreateTaskOpen(false)
        setForm({ title: '', description: '', assignTo: MEMBERS[0], department: DEPTS[0], category: CATEGORIES[0], priority: 'MEDIUM', dueDate: '', project: PROJECTS[0], repeat: 'None', dependency: 'None', director: '', steps: '' })
      } else {
        addToast('err', 'Failed to create task')
      }
    } catch {
      addToast('err', 'Failed to create task')
    }
  }

  if (!createTaskOpen) return null

  const updateField = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div className="overlay show" onClick={() => setCreateTaskOpen(false)}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <button className="mx" onClick={() => setCreateTaskOpen(false)}>✕</button>
        <div className="mt">Create New Task</div>
        <div className="ms">Add a new task to the LAXREE system</div>

        <form onSubmit={handleSubmit}>
          <div className="form-row fr-1">
            <div className="fg">
              <label>Title <span>*</span></label>
              <input className="fi" placeholder="Enter task title" value={form.title} onChange={e => updateField('title', e.target.value)} required />
            </div>
          </div>

          <div className="form-row fr-1">
            <div className="fg">
              <label>Description</label>
              <textarea className="fi" placeholder="Enter task description" value={form.description} onChange={e => updateField('description', e.target.value)} />
            </div>
          </div>

          <div className="form-row fr-2">
            <div className="fg">
              <label>Assign To</label>
              <select className="fi" value={form.assignTo} onChange={e => updateField('assignTo', e.target.value)}>
                {MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="fg">
              <label>Department</label>
              <select className="fi" value={form.department} onChange={e => updateField('department', e.target.value)}>
                {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

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

          <div className="form-row fr-2">
            <div className="fg">
              <label>Project</label>
              <select className="fi" value={form.project} onChange={e => updateField('project', e.target.value)}>
                {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="fg">
              <label>Repeat</label>
              <select className="fi" value={form.repeat} onChange={e => updateField('repeat', e.target.value)}>
                {REPEAT_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Dependency Section */}
          <div className="gold-divider" />
          <div className="form-row fr-1">
            <div className="fg">
              <label>Dependency</label>
              <select className="fi" value={form.dependency} onChange={e => updateField('dependency', e.target.value)}>
                <option value="None">None</option>
                <option value="Internal">Internal</option>
                <option value="External Hold">External Hold</option>
              </select>
            </div>
          </div>

          {form.dependency === 'External Hold' && (
            <div className="form-row fr-1">
              <div className="fg">
                <label>Director</label>
                <select className="fi" value={form.director} onChange={e => updateField('director', e.target.value)}>
                  <option value="">Select Director</option>
                  {DIRECTORS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setCreateTaskOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-gold">Create Task</button>
          </div>
        </form>
      </div>
    </div>
  )
}

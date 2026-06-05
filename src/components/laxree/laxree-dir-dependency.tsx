'use client'

import { useQuery } from '@tanstack/react-query'
import { useWorkflowStore } from '@/stores/workflow-store'

export function LaxreeDirDependency() {
  const { currentUser } = useWorkflowStore()

  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows-dirdep'],
    queryFn: () => fetch('/api/workflows').then(r => r.json()),
  })

  const { data: users = [] } = useQuery({
    queryKey: ['users-dirdep'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
  })

  const statusLabels: Record<string, string> = {
    PENDING: 'Approval Pending', IN_REVIEW: 'Awaiting Review', APPROVED: 'Director Approved',
    REJECTED: 'Rejected', IN_PROGRESS: 'In Progress', ON_HOLD: 'On Hold',
    ESCALATED: 'Escalated', COMPLETED: 'Completed', CANCELLED: 'Cancelled', EXTERNAL_HOLD: 'External Hold',
  }

  // Group workflows by dependency status
  const approvalPending = workflows.filter((w: any) => w.status === 'PENDING' || w.status === 'IN_REVIEW')
  const waitingDirector = workflows.filter((w: any) => w.status === 'APPROVED' && w.currentStepOrder > 0)
  const onHold = workflows.filter((w: any) => w.status === 'ON_HOLD')
  const escalated = workflows.filter((w: any) => w.status === 'ESCALATED')
  const extHold = workflows.filter((w: any) => w.status === 'EXTERNAL_HOLD')

  const sections = [
    { label: 'Approval Pending', items: approvalPending, cls: 'dd-approval-pending', badge: 'dd-status-approval-pending', icon: '🔔' },
    { label: 'Waiting Director', items: waitingDirector, cls: 'dd-waiting-director', badge: 'dd-status-waiting-director', icon: '📋' },
    { label: 'On Hold', items: onHold, cls: 'dd-on-hold', badge: 'dd-status-on-hold', icon: '⏸' },
    { label: 'Escalated', items: escalated, cls: 'dd-escalated', badge: 'dd-status-escalated', icon: '🚨' },
    { label: 'External Hold', items: extHold, cls: 'dd-returned-ea', badge: 'dd-status-sent-ea', icon: '⏳' },
  ]

  const getInitials = (name: string) => name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '?'

  return (
    <>
      <div className="ph">
        <div className="ph-left">
          <h2>Director Dependency Center</h2>
          <p>Track all items dependent on Director action — Ashish Sir &amp; Samarth Sir</p>
        </div>
      </div>
      <div className="page-accent" />

      {currentUser?.role === 'director' && (
        <div className="dd-dir-action-banner" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>👔</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#6D28D9' }}>Director View Active</div>
              <div style={{ fontSize: 11, color: 'var(--t2)' }}>Welcome {currentUser.name} — your pending items are highlighted below</div>
            </div>
          </div>
        </div>
      )}

      {sections.map(section => section.items.length > 0 && (
        <div key={section.label} style={{ marginBottom: 16 }}>
          <div className="dd-section-header">
            <span style={{ fontSize: 16 }}>{section.icon}</span>
            <div className="dd-section-title">{section.label}</div>
            <div className="dd-section-count">{section.items.length}</div>
          </div>
          {section.items.map((w: any) => (
            <div key={w.id} className={`dd-card ${section.cls}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div className="av" style={{ background: 'var(--purple)' }}>{getInitials(w.title)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{w.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>Step {w.currentStepOrder} · Created {w.createdAt ? new Date(w.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}</div>
                </div>
                <span className={`dd-status-badge ${section.badge}`}>{statusLabels[w.status] || w.status}</span>
              </div>

              {w.description && <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 8 }}>{w.description}</div>}

              {/* Workflow flow */}
              <div className="wf-flow">
                <span className="wf-stage wf-stage-ea">EA</span>
                <span className="wf-arrow">→</span>
                <span className="wf-stage wf-stage-dir">Director</span>
                <span className="wf-arrow">→</span>
                <span className="wf-stage wf-stage-done">Done</span>
              </div>

              <div className="dd-action-bar">
                {(currentUser?.role === 'director' || currentUser?.role === 'admin') && (
                  <>
                    <button className="dd-btn-dir-approve">✓ Approve</button>
                    <button className="dd-btn-dir-reject">✕ Reject</button>
                    <button className="dd-btn-dir-changes">📝 Request Changes</button>
                    <button className="dd-btn-dir-hold">⏸ Hold</button>
                    <button className="dd-btn-send-ea">↩ Send Back to EA</button>
                  </>
                )}
                {currentUser?.role === 'ea' && (
                  <>
                    <button className="dd-btn-verify">✓ Verify</button>
                    <button className="dd-btn-send-dir">📤 Send to Director</button>
                    <button className="dd-btn-priority">⚡ Priority</button>
                    <button className="dd-btn-notes">📝 Notes</button>
                  </>
                )}
              </div>

              {/* Timeline */}
              <div className="dd-timeline">
                <div className="dd-timeline-title">Timeline</div>
                <div className="dd-tl-item">
                  <div className="dd-tl-dot" style={{ background: 'var(--g2)' }} />
                  <div className="dd-tl-body">Created{w.createdAt ? ` — ${new Date(w.createdAt).toLocaleString()}` : ''}</div>
                </div>
                <div className="dd-tl-item">
                  <div className="dd-tl-dot" style={{ background: 'var(--amber)' }} />
                  <div className="dd-tl-body">Current Status: {statusLabels[w.status] || w.status}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}

      {sections.every(s => s.items.length === 0) && (
        <div className="card">
          <div className="cb">
            <div className="empty">
              <h3>No Director Dependencies</h3>
              <p>All items are up to date — no pending director actions required.</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { useWorkflowStore } from '@/stores/workflow-store'
import { useQuery } from '@tanstack/react-query'

interface TaskData { tasks?: unknown[] }
interface ApprovalData { pending?: unknown[] }

export function AppSidebar() {
  const { activeView, setActiveView, sidebarOpen, setSidebarOpen } = useWorkflowStore()

  const { data: approvalData } = useQuery<ApprovalData>({
    queryKey: ['approvals-count'],
    queryFn: () => fetch('/api/approvals?userId=user-admin').then(r => r.json()),
  })

  const { data: taskData } = useQuery<TaskData>({
    queryKey: ['tasks-count'],
    queryFn: () => fetch('/api/tasks').then(r => r.json()),
  })

  const approvalCount = Array.isArray(approvalData?.pending) ? approvalData!.pending.length : 0
  const taskCount = Array.isArray(taskData) ? taskData.length : 0

  const nav = (view: string) => {
    setActiveView(view as any)
    setSidebarOpen(false)
  }

  const navItems = [
    {
      section: 'Command Center',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          view: 'dashboard',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
          badge: null,
        },
        {
          id: 'executive',
          label: 'Executive View',
          view: 'executive',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
          badge: <span className="nb nb-new">CEO</span>,
        },
        {
          id: 'approvals',
          label: 'Approvals',
          view: 'approvals',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
          badge: approvalCount > 0 ? <span className="nb nb-alert">{approvalCount}</span> : null,
        },
      ],
    },
    {
      section: 'Weekly Review',
      items: [
        {
          id: 'workflows',
          label: 'Monday Meeting',
          view: 'workflows',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
          badge: <span className="nb" style={{ background: 'var(--gb)', color: 'var(--g2)' }}>Score</span>,
        },
      ],
    },
    {
      section: 'Task Management',
      items: [
        {
          id: 'tasks',
          label: 'All Tasks',
          view: 'tasks',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
          badge: taskCount > 0 ? <span className="nb nb-live">{taskCount}</span> : null,
        },
        {
          id: 'cancelled',
          label: 'Cancelled',
          view: 'cancelled',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
          badge: null,
        },
      ],
    },
    {
      section: 'Intelligence',
      items: [
        {
          id: 'analytics',
          label: 'Analytics & Reports',
          view: 'analytics',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
          badge: <span className="nb nb-warn">Live</span>,
        },
        {
          id: 'performance',
          label: 'Performance',
          view: 'performance',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>,
          badge: null,
        },
        {
          id: 'departments',
          label: 'Departments',
          view: 'departments',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><path d="M13 17h8M17 13v8"/></svg>,
          badge: null,
        },
      ],
    },
    {
      section: 'Management',
      items: [
        {
          id: 'team',
          label: 'Team Members',
          view: 'team',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
          badge: null,
        },
        {
          id: 'categories',
          label: 'Categories',
          view: 'categories',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></svg>,
          badge: null,
        },
        {
          id: 'holidays',
          label: 'Holidays',
          view: 'holidays',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
          badge: null,
        },
        {
          id: 'escalations',
          label: 'Director Dependency',
          view: 'director-dependency',
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#6D28D9' }}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
          badge: null,
          special: true,
        },
      ],
    },
  ]

  return (
    <>
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 399 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {navItems.map((section) => (
          <div className="sb-section" key={section.section}>
            <div className="sb-label">{section.section}</div>
            {section.items.map((item) => {
              const isActive = activeView === item.view
              return (
                <div
                  key={item.id}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => nav(item.view)}
                  style={item.special ? {
                    background: isActive ? 'var(--gb)' : 'linear-gradient(90deg,rgba(109,40,217,.09),transparent)',
                    borderLeftColor: isActive ? 'var(--g2)' : 'rgba(109,40,217,.5)',
                  } : undefined}
                >
                  {item.icon}
                  <span style={item.special ? { color: '#6D28D9', fontWeight: 700 } : undefined}>
                    {item.label}
                  </span>
                  {item.badge}
                </div>
              )
            })}
          </div>
        ))}
        <div className="sb-footer">
          <button className="logout-btn">⏏ Sign Out</button>
        </div>
      </aside>
    </>
  )
}

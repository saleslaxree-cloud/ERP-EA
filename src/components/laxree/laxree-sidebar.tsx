'use client'

import { useWorkflowStore } from '@/stores/workflow-store'
import { useQuery } from '@tanstack/react-query'

type ActivePage = 'dashboard' | 'executive' | 'tasks' | 'cancelled' | 'analytics' | 'performance' | 'departments' | 'team' | 'categories' | 'exthold' | 'monday' | 'escalations' | 'employee-dashboard' | 'leaves' | 'emp-leaves' | 'ai-assistant'

interface NavItem {
  id: ActivePage
  label: string
  icon: React.ReactNode
  badge?: React.ReactNode
  specialStyle?: boolean
}

export function LaxreeSidebar() {
  const { activePage, setActivePage, currentUser, sidebarOpen, setSidebarOpen, logout, currentUserId } = useWorkflowStore()

  const { data: dashData } = useQuery({
    queryKey: ['sidebar-stats', currentUserId],
    queryFn: () => fetch(`/api/dashboard?userId=${currentUserId}`).then(r => r.json()),
    enabled: !!currentUserId,
  })

  const d = dashData as any
  const activeTasks = (d?.totalTasks || 0) - (d?.completedTasks || 0) - ((d?.statusCounts?.CANCELLED || 0))
  const overdueTasks = d?.overdueTasks || 0

  // Fetch pending leaves count for employee badge
  const { data: empLeavesData } = useQuery({
    queryKey: ['emp-leaves-sidebar', currentUserId],
    queryFn: () => fetch(`/api/leaves?userId=${currentUserId}`).then(r => r.json()),
    enabled: !!currentUserId && (currentUser?.role === 'EMPLOYEE' || currentUser?.role === 'MANAGER' || currentUser?.role === 'DIRECTOR'),
  })
  const empPendingLeaves = (empLeavesData as any)?.leaves?.filter((l: any) => l.status === 'PENDING')?.length || 0

  // Fetch ALL pending leaves count for EA/Admin badge
  const { data: eaLeavesData } = useQuery({
    queryKey: ['ea-leaves-sidebar'],
    queryFn: () => fetch('/api/leaves?status=PENDING').then(r => r.json()),
    enabled: currentUser?.role === 'ADMIN' || currentUser?.role === 'EA',
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  })
  const eaPendingLeaves = (eaLeavesData as any)?.leaves?.length || 0

  const commandCenter: NavItem[] = [
    {
      id: 'dashboard', label: 'Dashboard',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>,
    },
    {
      id: 'executive', label: 'Executive View',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>,
      badge: <span className="nb nb-new">CEO</span>,
    },
  ]

  const weeklyReview: NavItem[] = [
    {
      id: 'monday', label: 'Monday Meeting',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
      badge: <span className="nb" style={{ background: 'var(--gb)', color: 'var(--g2)' }}>Score</span>,
    },
  ]

  const taskMgmt: NavItem[] = [
    {
      id: 'tasks', label: 'All Tasks',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
      badge: <span className="nb nb-live">{activeTasks}</span>,
    },
    {
      id: 'cancelled', label: 'Cancelled',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>,
    },
  ]

  const intelligence: NavItem[] = [
    {
      id: 'analytics', label: 'Analytics & Reports',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
      badge: <span className="nb nb-warn">Live</span>,
    },
    {
      id: 'performance', label: 'Performance',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /></svg>,
    },
    {
      id: 'departments', label: 'Departments',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /><path d="M13 17h8M17 13v8" /></svg>,
    },
  ]

  const management: NavItem[] = [
    {
      id: 'team', label: 'Team Members',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    },
    {
      id: 'categories', label: 'Categories',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z" /></svg>,
    },
    {
      id: 'leaves', label: 'Leaves',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
      badge: eaPendingLeaves > 0
        ? <span className="nb nb-live">{eaPendingLeaves} Pending</span>
        : <span className="nb nb-warn">EA</span>,
    },
  ]

  // Employee-specific sidebar navigation
  const employeeDashboard: NavItem[] = [
    {
      id: 'employee-dashboard', label: 'My Dashboard',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    },
  ]

  const employeeLeaves: NavItem[] = [
    {
      id: 'emp-leaves', label: 'Leave Management',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
      badge: empPendingLeaves > 0 ? <span className="nb nb-warn">{empPendingLeaves}</span> : undefined,
    },
  ]

  const employeeAI: NavItem[] = [
    {
      id: 'ai-assistant', label: 'AI Assistant',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" /><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="12" r="3" /><path d="M12 9v-1" /><path d="M12 15v1" /></svg>,
      badge: <span className="nb" style={{ background: 'rgba(109,40,217,.1)', color: '#6D28D9', fontWeight: 800 }}>AI</span>,
      specialStyle: true,
    },
  ]

  const isEmployee = currentUser?.role === 'EMPLOYEE' || currentUser?.role === 'MANAGER' || currentUser?.role === 'DIRECTOR'
  const sections = isEmployee ? [
    { label: 'My Space', items: employeeDashboard },
    { label: 'Leave Management', items: employeeLeaves },
    { label: 'AI Assistant', items: employeeAI },
    { label: 'Task Management', items: taskMgmt },
  ] : [
    { label: 'Command Center', items: commandCenter },
    { label: 'Weekly Review', items: weeklyReview },
    { label: 'Task Management', items: taskMgmt },
    { label: 'Intelligence', items: intelligence },
    { label: 'Management', items: management },
  ]

  return (
    <>
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 199 }}
          onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        {sections.map(section => (
          <div className="sb-section" key={section.label}>
            <div className="sb-label">{section.label}</div>
            {section.items.map(item => (
              <div
                key={item.id}
                className={`nav-item${activePage === item.id ? ' active' : ''}`}
                style={item.specialStyle ? {
                  background: activePage === item.id ? undefined : 'linear-gradient(90deg, rgba(109,40,217,.09), transparent)',
                  borderLeftColor: activePage === item.id ? undefined : 'rgba(109,40,217,.5)',
                } : undefined}
                onClick={() => setActivePage(item.id)}
              >
                {item.icon}
                <span style={item.specialStyle ? { color: '#6D28D9', fontWeight: 700 } : undefined}>
                  {item.label}
                </span>
                {item.badge}
              </div>
            ))}
          </div>
        ))}
        <div className="sb-footer">
          <button className="logout-btn" onClick={logout}>⏏ Sign Out</button>
        </div>
      </aside>
    </>
  )
}

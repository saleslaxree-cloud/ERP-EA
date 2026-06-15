'use client'

import { useWorkflowStore } from '@/stores/workflow-store'
import { useQuery } from '@tanstack/react-query'

type ActivePage = 'dashboard' | 'executive' | 'tasks' | 'cancelled' | 'analytics' | 'performance' | 'departments' | 'team' | 'categories' | 'exthold' | 'monday' | 'escalations' | 'employee-dashboard' | 'leaves' | 'emp-leaves' | 'emp-tasks' | 'ai-assistant' | 'user-management'

interface NavItem {
  id: ActivePage
  label: string
  icon: React.ReactNode
  badge?: React.ReactNode
  specialStyle?: boolean
}

export function LaxreeSidebar() {
  const { activePage, setActivePage, currentUser, sidebarOpen, setSidebarOpen, logout, currentUserId, currentRole } = useWorkflowStore()

  const isAdmin = currentRole === 'ADMIN'
  const isEA = currentRole === 'EA'
  const isEmployee = currentRole === 'EMPLOYEE' || currentRole === 'MANAGER' || currentRole === 'DIRECTOR'

  // Fetch dashboard stats for sidebar badges
  const { data: dashData } = useQuery({
    queryKey: ['sidebar-stats', currentUserId],
    queryFn: () => fetch(`/api/dashboard?userId=${currentUserId}`).then(r => r.json()),
    enabled: !!currentUserId && !isEmployee,
  })

  const d = dashData as any
  const activeTasks = (d?.totalTasks || 0) - (d?.completedTasks || 0) - ((d?.statusCounts?.CANCELLED || 0))

  // Fetch pending leaves count for employee badge
  const { data: empLeavesData } = useQuery({
    queryKey: ['emp-leaves-sidebar', currentUserId],
    queryFn: () => fetch(`/api/leaves?userId=${currentUserId}`).then(r => r.json()),
    enabled: !!currentUserId && isEmployee,
  })
  const empPendingLeaves = (empLeavesData as any)?.leaves?.filter((l: any) => l.status === 'PENDING')?.length || 0

  // Fetch ALL pending leaves count for Admin/EAs
  const { data: eaLeavesData } = useQuery({
    queryKey: ['ea-leaves-sidebar'],
    queryFn: () => fetch('/api/leaves?status=PENDING').then(r => r.json()),
    enabled: isAdmin || isEA,
    refetchInterval: 5000,
  })
  const eaPendingLeaves = (eaLeavesData as any)?.leaves?.length || 0

  // ═══════════════════════════════════════════════════════════
  // ADMIN SIDEBAR — Full CEO Command Center
  // ═══════════════════════════════════════════════════════════
  const adminCEOCommandCenter: NavItem[] = [
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

  const adminCEOSection: NavItem[] = [
    {
      id: 'executive', label: 'CEO',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
      badge: <span className="nb nb-new">CEO</span>,
    },
  ]

  const adminWeeklyReview: NavItem[] = [
    {
      id: 'monday', label: 'Monday Meeting',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
      badge: <span className="nb" style={{ background: 'var(--gb)', color: 'var(--g2)' }}>Score</span>,
    },
  ]

  const adminScorecard: NavItem[] = [
    {
      id: 'performance', label: 'Scorecard',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" /></svg>,
      badge: <span className="nb" style={{ background: '#FEF3C7', color: '#92400E', fontWeight: 800 }}>KPI</span>,
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
    {
      id: 'user-management', label: 'User Management',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 11h-6" /><path d="M19 8v6" /></svg>,
      badge: <span className="nb" style={{ background: 'rgba(109,40,217,.1)', color: '#6D28D9', fontWeight: 800 }}>&#x1F510;</span>,
    },
  ]

  // ═══════════════════════════════════════════════════════════
  // EA SIDEBAR — Task Management + Intelligence + Management
  // (NO Executive View, NO Monday Meeting, NO Scorecard)
  // ═══════════════════════════════════════════════════════════
  const eaDashboard: NavItem[] = [
    {
      id: 'dashboard', label: 'Dashboard',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>,
    },
  ]

  // ═══════════════════════════════════════════════════════════
  // EMPLOYEE SIDEBAR
  // ═══════════════════════════════════════════════════════════
  const employeeDashboard: NavItem[] = [
    {
      id: 'employee-dashboard', label: 'My Dashboard',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    },
  ]

  // Fetch employee tasks count for badge
  const { data: empTasksData } = useQuery({
    queryKey: ['emp-tasks-sidebar', currentUserId],
    queryFn: () => fetch(`/api/tasks?ownerId=${currentUserId}&assignedTo=${currentUserId}`).then(r => {
      if (Array.isArray(r)) return r
      return []
    }).catch(() => []),
    enabled: !!currentUserId && isEmployee,
  })
  const empActiveTasks = Array.isArray(empTasksData)
    ? empTasksData.filter((t: any) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length
    : 0

  const employeeTasks: NavItem[] = [
    {
      id: 'emp-tasks', label: 'My Tasks',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
      badge: empActiveTasks > 0 ? <span className="nb nb-live">{empActiveTasks}</span> : undefined,
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

  // ═══════════════════════════════════════════════════════════
  // BUILD SECTIONS BASED ON ROLE
  // ═══════════════════════════════════════════════════════════
  let sections: { label: string; items: NavItem[] }[]

  if (isEmployee) {
    sections = [
      { label: 'My Space', items: employeeDashboard },
      { label: 'My Tasks', items: employeeTasks },
      { label: 'Leave Management', items: employeeLeaves },
      { label: 'AI Assistant', items: employeeAI },
    ]
  } else if (isAdmin) {
    // ADMIN: Full CEO Command Center with Executive View, Monday Meeting, Scorecard
    sections = [
      { label: 'CEO Command Center', items: adminCEOCommandCenter },
      { label: 'CEO', items: adminCEOSection },
      { label: 'Weekly Review', items: adminWeeklyReview },
      { label: 'Scorecard', items: adminScorecard },
      { label: 'Task Management', items: taskMgmt },
      { label: 'Intelligence', items: intelligence },
      { label: 'Departments', items: [{ id: 'departments' as ActivePage, label: 'Departments', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /><path d="M13 17h8M17 13v8" /></svg> }] },
      { label: 'Management', items: management },
    ]
  } else {
    // EA: Dashboard + Task Management + Intelligence + Departments + Management + Leaves + EA + User Management
    // (NO Executive View, NO Monday Meeting, NO Scorecard, NO CEO sections)
    sections = [
      { label: 'Dashboard', items: eaDashboard },
      { label: 'Task Management', items: taskMgmt },
      { label: 'Intelligence', items: intelligence },
      { label: 'Departments', items: [{ id: 'departments' as ActivePage, label: 'Departments', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /><path d="M13 17h8M17 13v8" /></svg> }] },
      { label: 'Management', items: management },
      { label: 'Leaves', items: [{ id: 'leaves' as ActivePage, label: 'Leave Management', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>, badge: eaPendingLeaves > 0 ? <span className="nb nb-live">{eaPendingLeaves} Pending</span> : undefined }] },
      { label: 'EA', items: [{ id: 'leaves' as ActivePage, label: 'EA Overview', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>, badge: <span className="nb nb-warn">EA</span> }] },
    ]
  }

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
          <button className="logout-btn" onClick={logout}>&#9238; Sign Out</button>
        </div>
      </aside>
    </>
  )
}

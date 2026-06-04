'use client'

import { useWorkflowStore } from '@/stores/workflow-store'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AppSidebar } from '@/components/app-sidebar'
import { AppHeader } from '@/components/app-header'
import { WorkflowDashboard } from '@/components/workflow-dashboard'
import { WorkflowList } from '@/components/workflow-list'
import { ApprovalList } from '@/components/approval-list'
import { TaskList } from '@/components/task-list'
import { NotificationList } from '@/components/notification-list'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useEffect, useState } from 'react'

function ActiveView() {
  const { activeView } = useWorkflowStore()

  switch (activeView) {
    case 'dashboard':
      return <WorkflowDashboard />
    case 'workflows':
      return <WorkflowList />
    case 'approvals':
      return <ApprovalList />
    case 'tasks':
    case 'cancelled':
      return <TaskList />
    case 'notifications':
      return <NotificationList />
    case 'executive':
      return <ExecutiveView />
    case 'analytics':
      return <AnalyticsView />
    case 'performance':
      return <PerformanceView />
    case 'departments':
      return <DepartmentsView />
    case 'team':
      return <TeamView />
    case 'categories':
      return <CategoriesView />
    case 'holidays':
      return <HolidaysView />
    case 'director-dependency':
    case 'escalations':
      return <DirectorDependencyView />
    case 'employees':
      return <EmployeesView />
    case 'projects':
      return <ProjectsView />
    case 'reports':
      return <ReportsView />
    case 'scorecards':
      return <ScorecardsView />
    case 'settings':
      return <SettingsView />
    default:
      return <WorkflowDashboard />
  }
}

/* ═══════════════════════════════════════════════════════════
   Executive View
   ═══════════════════════════════════════════════════════════ */
function ExecutiveView() {
  const { currentUserId } = useWorkflowStore()

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', currentUserId],
    queryFn: () => fetch(`/api/dashboard?userId=${currentUserId}`).then(r => r.json()),
  })

  if (isLoading) return <div className="lcard"><div className="cb" style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>Loading executive data…</div></div>

  const d = data as any
  const score = d?.performanceScore || d?.completionRate || 0
  const userPerf = d?.userPerformance || []
  const deptMap = d?.deptMap || {}

  return (
    <div>
      <div className="ph">
        <div className="ph-left">
          <h2>Executive Command Center</h2>
          <p>C-Suite operational intelligence · Real-time business health overview</p>
        </div>
        <div className="ph-right">
          <span className="badge b-green">● Live Feed</span>
        </div>
      </div>
      <div className="page-accent" />

      <div className="g2">
        <div className="lcard">
          <div className="ch"><div className="ct">🏆 Business Health Score</div></div>
          <div className="cb" style={{ textAlign: 'center', padding: 30 }}>
            <div className="health-val" style={{ color: score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--amber)' : 'var(--red)' }}>{score}</div>
            <div className="health-lbl">Overall Score</div>
            <div className="health-status" style={{
              background: score >= 70 ? 'var(--green-l)' : score >= 40 ? 'var(--amber-l)' : 'var(--red-l)',
              color: score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--amber)' : 'var(--red)',
            }}>
              {score >= 70 ? 'Healthy' : score >= 40 ? 'Needs Attention' : 'Critical'}
            </div>
          </div>
        </div>
        <div className="ai-widget">
          <div className="ai-label"><div className="ai-pulse" />CEO AI Briefing</div>
          <div className="ai-item">
            <div className="ai-bullet" style={{ background: score >= 70 ? 'var(--green)' : 'var(--amber)' }} />
            <div className="ai-text"><strong>Operations {score >= 70 ? 'stable' : 'need attention'}.</strong> Overall score at {score}%.</div>
          </div>
          <div className="ai-item">
            <div className="ai-bullet" style={{ background: 'var(--amber)' }} />
            <div className="ai-text"><strong>{d?.pendingApprovals || 0} approvals pending</strong> from EA review stage.</div>
          </div>
          <div className="ai-item">
            <div className="ai-bullet" style={{ background: 'var(--red)' }} />
            <div className="ai-text"><strong>{d?.overdueTasks || 0} overdue tasks</strong> require director intervention.</div>
          </div>
          {userPerf.length > 0 && (
            <div className="ai-item">
              <div className="ai-bullet" style={{ background: 'var(--g2)' }} />
              <div className="ai-text"><strong>Top performer:</strong> {userPerf[0]?.name} (score: {userPerf[0]?.score}).</div>
            </div>
          )}
        </div>
      </div>

      {/* Executive Stats */}
      <div className="stat-grid sg-4" style={{ marginBottom: 14 }}>
        <div className="sc lux-border">
          <div className="sc-accent" style={{ background: 'var(--g2)' }} />
          <div className="sc-top"><div><div className="sc-label">Total Tasks</div><div className="sc-val c-gold">{d?.totalTasks || 0}</div></div><div className="sc-icon" style={{ background: 'var(--gb)' }}>📋</div></div>
        </div>
        <div className="sc lux-border">
          <div className="sc-accent" style={{ background: 'var(--green)' }} />
          <div className="sc-top"><div><div className="sc-label">Completed</div><div className="sc-val c-green">{d?.completedTasks || 0}</div></div><div className="sc-icon" style={{ background: 'var(--green-m)' }}>✅</div></div>
        </div>
        <div className="sc lux-border">
          <div className="sc-accent" style={{ background: 'var(--amber)' }} />
          <div className="sc-top"><div><div className="sc-label">In Progress</div><div className="sc-val c-amber">{d?.inProgressTasks || 0}</div></div><div className="sc-icon" style={{ background: 'var(--amber-m)' }}>🔄</div></div>
        </div>
        <div className="sc lux-border">
          <div className="sc-accent" style={{ background: 'var(--red)' }} />
          <div className="sc-top"><div><div className="sc-label">Overdue</div><div className="sc-val c-red">{d?.overdueTasks || 0}</div></div><div className="sc-icon" style={{ background: 'var(--red-m)' }}>⚠</div></div>
        </div>
      </div>

      {/* Department Breakdown */}
      <div className="lcard">
        <div className="ch"><div className="ct">🏢 Department Breakdown</div><span className="badge b-gold f10">Live</span></div>
        <div className="cb">
          {Object.entries(deptMap).map(([name, v]: [string, any]) => {
            const rate = v.total > 0 ? Math.round((v.done / v.total) * 100) : 0
            return (
              <div key={name} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{name}</span>
                  <span style={{ fontSize: 11, color: 'var(--t3)' }}>{v.done}/{v.total} · {rate}%</span>
                </div>
                <div className="prog">
                  <div className="prog-bg" style={{ height: 8 }}>
                    <div className="prog-fill" style={{
                      width: `${rate}%`,
                      background: rate >= 70 ? 'var(--green)' : rate >= 40 ? 'var(--amber)' : 'var(--red)',
                      height: '100%',
                    }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Analytics View
   ═══════════════════════════════════════════════════════════ */
function AnalyticsView() {
  const { currentUserId } = useWorkflowStore()

  const { data } = useQuery({
    queryKey: ['dashboard', currentUserId],
    queryFn: () => fetch(`/api/dashboard?userId=${currentUserId}`).then(r => r.json()),
  })

  const d = data as any
  const deptMap = d?.deptMap || {}
  const deptChartData = Object.entries(deptMap).map(([name, v]: [string, any]) => ({
    name, Total: v.total, Completed: v.done, Overdue: v.overdue,
  }))

  const catMap = d?.catMap || {}

  return (
    <div>
      <div className="ph">
        <div className="ph-left">
          <h2>Analytics &amp; Reports</h2>
          <p>Business intelligence &amp; operational reporting hub</p>
        </div>
        <div className="ph-right">
          <span className="badge b-gold">● Live</span>
        </div>
      </div>
      <div className="page-accent" />

      <div className="stat-grid sg-4" style={{ marginBottom: 16 }}>
        <div className="sc"><div className="sc-accent" style={{ background: 'var(--g2)' }} /><div className="sc-top"><div><div className="sc-label">Total Tasks</div><div className="sc-val c-gold">{d?.totalTasks || 0}</div></div></div></div>
        <div className="sc"><div className="sc-accent" style={{ background: 'var(--green)' }} /><div className="sc-top"><div><div className="sc-label">Completed</div><div className="sc-val c-green">{d?.completedTasks || 0}</div></div></div></div>
        <div className="sc"><div className="sc-accent" style={{ background: 'var(--amber)' }} /><div className="sc-top"><div><div className="sc-label">In Progress</div><div className="sc-val c-amber">{d?.inProgressTasks || 0}</div></div></div></div>
        <div className="sc"><div className="sc-accent" style={{ background: 'var(--red)' }} /><div className="sc-top"><div><div className="sc-label">Overdue</div><div className="sc-val c-red">{d?.overdueTasks || 0}</div></div></div></div>
      </div>

      <div className="g2">
        <div className="lcard">
          <div className="ch"><div className="ct">📊 Department Performance</div><span className="badge b-gold f10">Live</span></div>
          <div className="cb">
            {deptChartData.length > 0 ? (
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--b1)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--t3)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--t3)' }} />
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--b2)', borderRadius: 'var(--r-sm)', fontSize: 12 }} />
                    <Bar dataKey="Total" fill="var(--blue)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Completed" fill="var(--green)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Overdue" fill="var(--red)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty"><p>No data yet</p></div>
            )}
          </div>
        </div>

        <div className="lcard">
          <div className="ch"><div className="ct">📂 Category Distribution</div></div>
          <div className="cb">
            {Object.entries(catMap).length > 0 ? Object.entries(catMap).map(([name, v]: [string, any]) => {
              const rate = v.total > 0 ? Math.round((v.done / v.total) * 100) : 0
              return (
                <div key={name} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700 }}>{name}</span>
                    <span style={{ fontSize: 11, color: 'var(--t3)' }}>{v.done}/{v.total} · {rate}%</span>
                  </div>
                  <div className="prog">
                    <div className="prog-bg">
                      <div className="prog-fill" style={{ width: `${rate}%`, background: rate >= 70 ? 'var(--green)' : rate >= 40 ? 'var(--amber)' : 'var(--red)' }} />
                    </div>
                  </div>
                </div>
              )
            }) : (
              <div className="empty"><p>No category data</p></div>
            )}
          </div>
        </div>
      </div>

      <div className="ai-widget" style={{ marginTop: 14 }}>
        <div className="ai-label"><div className="ai-pulse" />AI Insights</div>
        <div className="ai-item">
          <div className="ai-bullet" style={{ background: 'var(--g2)' }} />
          <div className="ai-text"><strong>Completion rate:</strong> {d?.completionRate || 0}% across all departments.</div>
        </div>
        <div className="ai-item">
          <div className="ai-bullet" style={{ background: 'var(--amber)' }} />
          <div className="ai-text"><strong>{d?.pendingTasks || 0} pending tasks</strong> awaiting action from team members.</div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Performance View
   ═══════════════════════════════════════════════════════════ */
function PerformanceView() {
  const { currentUserId } = useWorkflowStore()

  const { data } = useQuery({
    queryKey: ['dashboard', currentUserId],
    queryFn: () => fetch(`/api/dashboard?userId=${currentUserId}`).then(r => r.json()),
  })

  const d = data as any
  const userPerf = d?.userPerformance || []

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const scoreColor = (score: number) => score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--amber)' : 'var(--red)'

  return (
    <div>
      <div className="ph">
        <div className="ph-left">
          <h2>Performance Intelligence</h2>
          <p>Deep-dive employee analytics &amp; comparison engine</p>
        </div>
      </div>
      <div className="page-accent" />

      <div className="mc-grid">
        {userPerf.map((u: any) => (
          <div key={u.id} className="mc">
            <div className="mc-top">
              <div className="av" style={{ width: 36, height: 36, fontSize: 13, background: `linear-gradient(135deg,${scoreColor(u.score)},${scoreColor(u.score)}88)` }}>
                {getInitials(u.name)}
              </div>
              <div className="mc-info">
                <div className="mc-name">{u.name}</div>
                <div className="mc-role">{u.role} · {u.department || '—'}</div>
              </div>
            </div>
            <div className="mc-stat"><span>Total Tasks</span><span>{u.total}</span></div>
            <div className="mc-stat"><span>Completed</span><span style={{ color: 'var(--green)' }}>{u.done}</span></div>
            <div className="mc-stat"><span>In Progress</span><span style={{ color: 'var(--blue)' }}>{u.inProgress}</span></div>
            <div className="mc-stat"><span>Overdue</span><span style={{ color: u.overdue > 0 ? 'var(--red)' : 'var(--t2)' }}>{u.overdue}</span></div>
            <div className="prog" style={{ marginTop: 8 }}>
              <div className="prog-bg">
                <div className="prog-fill" style={{ width: `${u.completionRate}%`, background: scoreColor(u.score) }} />
              </div>
              <span className="prog-lbl">{u.completionRate}%</span>
            </div>
            <div className="mc-score">
              <span>Score:</span>
              <span style={{ fontSize: 18, color: scoreColor(u.score) }}>{u.score}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Departments View
   ═══════════════════════════════════════════════════════════ */
function DepartmentsView() {
  const { currentUserId } = useWorkflowStore()

  const { data } = useQuery({
    queryKey: ['dashboard', currentUserId],
    queryFn: () => fetch(`/api/dashboard?userId=${currentUserId}`).then(r => r.json()),
  })

  const d = data as any
  const deptMap = d?.deptMap || {}
  const userPerf = d?.userPerformance || []

  const deptColors: Record<string, string> = {
    'Sales': 'var(--blue)',
    'Back Office': 'var(--amber)',
    'Accounts': 'var(--green)',
  }

  return (
    <div>
      <div className="ph">
        <div className="ph-left">
          <h2>Departments</h2>
          <p>Department structure and productivity analysis</p>
        </div>
      </div>
      <div className="page-accent" />

      <div className="mc-grid">
        {Object.entries(deptMap).map(([name, v]: [string, any]) => {
          const rate = v.total > 0 ? Math.round((v.done / v.total) * 100) : 0
          const color = deptColors[name] || 'var(--g2)'
          const deptUsers = userPerf.filter((u: any) => u.department === name)

          return (
            <div key={name} className="dept-card" style={{ borderLeft: `3px solid ${color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏢</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)' }}>{name}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>{deptUsers.length} members</div>
                </div>
              </div>
              <div className="mc-stat"><span>Total Tasks</span><span>{v.total}</span></div>
              <div className="mc-stat"><span>Completed</span><span style={{ color: 'var(--green)' }}>{v.done}</span></div>
              <div className="mc-stat"><span>In Progress</span><span style={{ color: 'var(--blue)' }}>{v.inProgress}</span></div>
              <div className="mc-stat"><span>Overdue</span><span style={{ color: v.overdue > 0 ? 'var(--red)' : 'var(--t2)' }}>{v.overdue}</span></div>
              <div className="prog" style={{ marginTop: 8 }}>
                <div className="prog-bg"><div className="prog-fill" style={{ width: `${rate}%`, background: color }} /></div>
                <span className="prog-lbl">{rate}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Team View
   ═══════════════════════════════════════════════════════════ */
function TeamView() {
  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
  })

  const { data } = useQuery({
    queryKey: ['dashboard', 'user-admin'],
    queryFn: () => fetch('/api/dashboard?userId=user-admin').then(r => r.json()),
  })

  const d = data as any
  const userPerf = d?.userPerformance || []
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const roleBadge: Record<string, string> = {
    ADMIN: 'b-gold', DIRECTOR: 'b-purple', EA: 'b-blue', MANAGER: 'b-green', EMPLOYEE: 'b-gray',
  }

  return (
    <div>
      <div className="ph">
        <div className="ph-left">
          <h2>Team Members</h2>
          <p>Team management and performance tracking</p>
        </div>
        <div className="ph-right">
          <span className="badge b-gold">{users.length} Members</span>
        </div>
      </div>
      <div className="page-accent" />

      <div className="mc-grid">
        {users.map((u: any) => {
          const perf = userPerf.find((p: any) => p.id === u.id)
          const score = perf?.score || 0
          const scoreCol = score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--amber)' : 'var(--red)'

          return (
            <div key={u.id} className="mc">
              <div className="mc-top">
                <div className="av" style={{ width: 38, height: 38, fontSize: 14, background: `linear-gradient(135deg,var(--g1),var(--g3))` }}>
                  {getInitials(u.name)}
                </div>
                <div className="mc-info">
                  <div className="mc-name">{u.name}</div>
                  <div className="mc-role" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span className={`badge ${roleBadge[u.role] || 'b-gray'}`} style={{ fontSize: 9, padding: '1px 6px' }}>{u.role}</span>
                    <span>{u.department || '—'}</span>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>{u.email}</div>
              {perf && (
                <>
                  <div className="mc-stat"><span>Tasks</span><span>{perf.total}</span></div>
                  <div className="mc-stat"><span>Completed</span><span>{perf.done}</span></div>
                  <div className="mc-stat"><span>Overdue</span><span style={{ color: perf.overdue > 0 ? 'var(--red)' : 'var(--t2)' }}>{perf.overdue}</span></div>
                  <div className="mc-score">
                    <span>Score:</span>
                    <span style={{ fontSize: 18, color: scoreCol }}>{score}</span>
                  </div>
                </>
              )}
              <div style={{ marginTop: 8 }}>
                <span className={`badge ${u.isActive ? 'b-green' : 'b-red'}`} style={{ fontSize: 10 }}>
                  {u.isActive ? '● Active' : '● Inactive'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Categories View
   ═══════════════════════════════════════════════════════════ */
function CategoriesView() {
  const { currentUserId } = useWorkflowStore()

  const { data } = useQuery({
    queryKey: ['dashboard', currentUserId],
    queryFn: () => fetch(`/api/dashboard?userId=${currentUserId}`).then(r => r.json()),
  })

  const d = data as any
  const catMap = d?.catMap || {}
  const catIcons: Record<string, string> = {
    'Operations': '⚙️', 'Finance': '💰', 'HR': '👥', 'IT': '💻',
    'Marketing': '📢', 'Sales': '📊', 'Admin': '📋', 'Compliance': '🔒',
  }

  return (
    <div>
      <div className="ph">
        <div className="ph-left">
          <h2>Categories</h2>
          <p>Task and workflow category management</p>
        </div>
      </div>
      <div className="page-accent" />

      <div className="stat-grid sg-4" style={{ marginBottom: 16 }}>
        <div className="sc"><div className="sc-accent" style={{ background: 'var(--g2)' }} /><div className="sc-top"><div><div className="sc-label">Total Categories</div><div className="sc-val c-gold">{Object.keys(catMap).length}</div></div></div></div>
        <div className="sc"><div className="sc-accent" style={{ background: 'var(--blue)' }} /><div className="sc-top"><div><div className="sc-label">Total Tasks</div><div className="sc-val c-amber">{Object.values(catMap).reduce((s: number, v: any) => s + v.total, 0)}</div></div></div></div>
        <div className="sc"><div className="sc-accent" style={{ background: 'var(--green)' }} /><div className="sc-top"><div><div className="sc-label">Completed</div><div className="sc-val c-green">{Object.values(catMap).reduce((s: number, v: any) => s + v.done, 0)}</div></div></div></div>
        <div className="sc"><div className="sc-accent" style={{ background: 'var(--amber)' }} /><div className="sc-top"><div><div className="sc-label">In Progress</div><div className="sc-val c-amber">{Object.values(catMap).reduce((s: number, v: any) => s + v.inProgress, 0)}</div></div></div></div>
      </div>

      <div className="mc-grid">
        {Object.entries(catMap).map(([name, v]: [string, any]) => {
          const rate = v.total > 0 ? Math.round((v.done / v.total) * 100) : 0
          return (
            <div key={name} className="dept-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--gb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  {catIcons[name] || '📁'}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{name}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>{v.total} tasks</div>
                </div>
              </div>
              <div className="mc-stat"><span>Completed</span><span style={{ color: 'var(--green)' }}>{v.done}</span></div>
              <div className="mc-stat"><span>In Progress</span><span style={{ color: 'var(--blue)' }}>{v.inProgress}</span></div>
              <div className="prog" style={{ marginTop: 8 }}>
                <div className="prog-bg"><div className="prog-fill" style={{ width: `${rate}%`, background: rate >= 70 ? 'var(--green)' : rate >= 40 ? 'var(--amber)' : 'var(--red)' }} /></div>
                <span className="prog-lbl">{rate}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Holidays View
   ═══════════════════════════════════════════════════════════ */
function HolidaysView() {
  // Static holiday data (could be from API later)
  const holidays = [
    { name: 'New Year\'s Day', date: '2025-01-01', type: 'PUBLIC' },
    { name: 'Republic Day', date: '2025-01-26', type: 'PUBLIC' },
    { name: 'Holi', date: '2025-03-14', type: 'PUBLIC' },
    { name: 'Good Friday', date: '2025-04-18', type: 'PUBLIC' },
    { name: 'Eid ul-Fitr', date: '2025-03-31', type: 'PUBLIC' },
    { name: 'Independence Day', date: '2025-08-15', type: 'PUBLIC' },
    { name: 'Gandhi Jayanti', date: '2025-10-02', type: 'PUBLIC' },
    { name: 'Dussehra', date: '2025-10-20', type: 'PUBLIC' },
    { name: 'Diwali', date: '2025-10-28', type: 'PUBLIC' },
    { name: 'Christmas', date: '2025-12-25', type: 'PUBLIC' },
    { name: 'Company Foundation Day', date: '2025-06-15', type: 'COMPANY' },
    { name: 'Year End Break', date: '2025-12-30', type: 'COMPANY' },
  ]

  const typeColors: Record<string, { bg: string; color: string }> = {
    PUBLIC: { bg: 'var(--blue-l)', color: 'var(--blue)' },
    COMPANY: { bg: 'var(--purple-l)', color: 'var(--purple)' },
    OPTIONAL: { bg: 'var(--amber-l)', color: 'var(--amber)' },
  }

  return (
    <div>
      <div className="ph">
        <div className="ph-left">
          <h2>Holidays</h2>
          <p>Holiday calendar and scheduling</p>
        </div>
        <div className="ph-right">
          <span className="badge b-gold">{holidays.length} Holidays</span>
        </div>
      </div>
      <div className="page-accent" />

      <div className="lcard">
        <div className="ch">
          <div className="ct">📅 Holiday Calendar 2025</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="badge" style={{ background: 'var(--blue-l)', color: 'var(--blue)' }}>Public</span>
            <span className="badge" style={{ background: 'var(--purple-l)', color: 'var(--purple)' }}>Company</span>
          </div>
        </div>
        <div className="tw">
          <table className="ltable">
            <thead>
              <tr><th>#</th><th>Holiday</th><th>Date</th><th>Day</th><th>Type</th></tr>
            </thead>
            <tbody>
              {holidays.map((h, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--t3)', fontSize: 11 }}>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{h.name}</td>
                  <td>{new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td>{new Date(h.date).toLocaleDateString('en-US', { weekday: 'long' })}</td>
                  <td>
                    <span className="badge" style={{ background: typeColors[h.type]?.bg, color: typeColors[h.type]?.color }}>
                      {h.type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Director Dependency View
   ═══════════════════════════════════════════════════════════ */
function DirectorDependencyView() {
  const { currentUserId } = useWorkflowStore()

  const { data } = useQuery({
    queryKey: ['dashboard', currentUserId],
    queryFn: () => fetch(`/api/dashboard?userId=${currentUserId}`).then(r => r.json()),
  })

  const d = data as any
  const userPerf = d?.userPerformance || []
  const pendingApprovals = d?.pendingApprovalsList || []

  // Find director-dependent tasks
  const directorUsers = userPerf.filter((u: any) => u.role === 'DIRECTOR' || u.role === 'EA')
  const bottleneckUsers = userPerf.filter((u: any) => u.overdue > 2)

  return (
    <div>
      <div className="ph">
        <div className="ph-left">
          <h2>Director Dependency Center</h2>
          <p>Approval routing and director dependency management</p>
        </div>
        <div className="ph-right">
          <span className="badge" style={{ background: 'var(--purple-l)', color: 'var(--purple)', border: '1px solid rgba(109,40,217,.2)' }}>
            👔 Director View
          </span>
        </div>
      </div>
      <div className="page-accent" style={{ background: 'linear-gradient(90deg,var(--purple),var(--g4),transparent)' }} />

      {/* Flow Diagram */}
      <div className="lcard" style={{ padding: '14px 18px', marginBottom: 14, background: 'linear-gradient(135deg,rgba(109,40,217,.06),var(--card))', borderLeft: '3px solid var(--purple)' }}>
        <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--purple)', marginBottom: 10 }}>⚙ Dependency Flow</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--blue-l)', color: 'var(--blue)', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800 }}>👤 Employee</div>
          <span style={{ color: 'var(--purple)', fontSize: 14, fontWeight: 900 }}>→</span>
          <div style={{ background: 'var(--amber-l)', color: 'var(--amber)', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800 }}>📋 EA Review</div>
          <span style={{ color: 'var(--purple)', fontSize: 14, fontWeight: 900 }}>→</span>
          <div style={{ background: 'var(--purple-l)', color: 'var(--purple)', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, border: '2px solid var(--purple)', animation: 'ap-pulse 2s infinite' }}>👔 Director Approval</div>
          <span style={{ color: 'var(--purple)', fontSize: 14, fontWeight: 900 }}>→</span>
          <div style={{ background: 'var(--green-l)', color: 'var(--green)', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800 }}>✅ Complete</div>
        </div>
      </div>

      {/* Key Stats */}
      <div className="stat-grid sg-3" style={{ marginBottom: 14 }}>
        <div className="sc lux-border">
          <div className="sc-accent" style={{ background: 'var(--purple)' }} />
          <div className="sc-top">
            <div><div className="sc-label">Pending Director Approvals</div><div className="sc-val" style={{ color: 'var(--purple)' }}>{pendingApprovals.length}</div></div>
            <div className="sc-icon" style={{ background: 'var(--purple-m)' }}>👔</div>
          </div>
        </div>
        <div className="sc lux-border">
          <div className="sc-accent" style={{ background: 'var(--red)' }} />
          <div className="sc-top">
            <div><div className="sc-label">Bottleneck Risk Users</div><div className="sc-val" style={{ color: 'var(--red)' }}>{bottleneckUsers.length}</div></div>
            <div className="sc-icon" style={{ background: 'var(--red-m)' }}>⚠</div>
          </div>
        </div>
        <div className="sc lux-border">
          <div className="sc-accent" style={{ background: 'var(--amber)' }} />
          <div className="sc-top">
            <div><div className="sc-label">Director/EA Users</div><div className="sc-val" style={{ color: 'var(--amber)' }}>{directorUsers.length}</div></div>
            <div className="sc-icon" style={{ background: 'var(--amber-m)' }}>👥</div>
          </div>
        </div>
      </div>

      {/* Director/EA User Cards */}
      <div className="lcard" style={{ marginBottom: 14 }}>
        <div className="ch"><div className="ct">👔 Director &amp; EA Approvers</div><span className="badge" style={{ background: 'var(--purple-l)', color: 'var(--purple)' }}>Key Personnel</span></div>
        <div className="cb">
          <div className="mc-grid">
            {directorUsers.map((u: any) => (
              <div key={u.id} className="mc" style={{ borderLeft: '3px solid var(--purple)' }}>
                <div className="mc-top">
                  <div className="av" style={{ width: 36, height: 36, fontSize: 13, background: 'linear-gradient(135deg,var(--purple),#8b5cf6)' }}>
                    {u.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="mc-info">
                    <div className="mc-name">{u.name}</div>
                    <div className="mc-role"><span className="badge b-purple" style={{ fontSize: 9, padding: '1px 6px' }}>{u.role}</span> {u.department || '—'}</div>
                  </div>
                </div>
                <div className="mc-stat"><span>Pending Approvals</span><span>{u.total}</span></div>
                <div className="mc-stat"><span>Overdue</span><span style={{ color: u.overdue > 0 ? 'var(--red)' : 'var(--t2)' }}>{u.overdue}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottleneck Analysis */}
      {bottleneckUsers.length > 0 && (
        <div className="lcard" style={{ borderLeft: '3px solid var(--red)' }}>
          <div className="ch"><div className="ct">⚠ Bottleneck Risk</div><span className="badge b-red f10">Alert</span></div>
          <div className="cb">
            {bottleneckUsers.map((u: any) => (
              <div key={u.id} className="esc-item">
                <span className="esc-badge">{u.overdue} OVERDUE</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>{u.role} · {u.department || '—'} · Score: {u.score}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Employees View
   ═══════════════════════════════════════════════════════════ */
function EmployeesView() {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '', role: 'EMPLOYEE', department: '', designation: '', phone: '', location: '' })
  const [addLoading, setAddLoading] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => fetch('/api/employees').then(r => r.json()),
  })

  const employees = (data as any)?.employees || []
  const stats = (data as any)?.stats || { total: 0, active: 0, departments: 0, onLeave: 0 }

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const roleBadge: Record<string, string> = {
    ADMIN: 'b-gold', DIRECTOR: 'b-purple', EA: 'b-blue', MANAGER: 'b-green', EMPLOYEE: 'b-gray',
  }

  const handleAdd = async () => {
    if (!addForm.name || !addForm.email) return
    setAddLoading(true)
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ['employees'] })
        setShowAddDialog(false)
        setAddForm({ name: '', email: '', role: 'EMPLOYEE', department: '', designation: '', phone: '', location: '' })
        showToast('Employee added successfully', 'ok')
      } else {
        showToast('Failed to add employee', 'err')
      }
    } catch {
      showToast('Failed to add employee', 'err')
    }
    setAddLoading(false)
  }

  return (
    <div>
      <div className="ph">
        <div className="ph-left">
          <h2>Employees</h2>
          <p>Manage your organization&apos;s team members</p>
        </div>
        <div className="ph-right">
          <button className="btn btn-gold" onClick={() => setShowAddDialog(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Member
          </button>
        </div>
      </div>
      <div className="page-accent" />

      {/* Stat Cards */}
      <div className="stat-grid sg-4" style={{ marginBottom: 16 }}>
        <div className="sc">
          <div className="sc-accent" style={{ background: 'var(--g2)' }} />
          <div className="sc-top">
            <div><div className="sc-label">Total Members</div><div className="sc-val c-gold">{stats.total}</div></div>
            <div className="sc-icon" style={{ background: 'var(--gb)' }}>👥</div>
          </div>
        </div>
        <div className="sc">
          <div className="sc-accent" style={{ background: 'var(--green)' }} />
          <div className="sc-top">
            <div><div className="sc-label">Active Members</div><div className="sc-val c-green">{stats.active}</div></div>
            <div className="sc-icon" style={{ background: 'var(--green-m)' }}>✅</div>
          </div>
        </div>
        <div className="sc">
          <div className="sc-accent" style={{ background: 'var(--blue)' }} />
          <div className="sc-top">
            <div><div className="sc-label">Departments</div><div className="sc-val" style={{ color: 'var(--blue)' }}>{stats.departments}</div></div>
            <div className="sc-icon" style={{ background: 'var(--blue-m)' }}>🏢</div>
          </div>
        </div>
        <div className="sc">
          <div className="sc-accent" style={{ background: 'var(--amber)' }} />
          <div className="sc-top">
            <div><div className="sc-label">On Leave</div><div className="sc-val c-amber">{stats.onLeave}</div></div>
            <div className="sc-icon" style={{ background: 'var(--amber-m)' }}>🏖</div>
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <div className="lcard">
        <div className="ch">
          <div className="ct">👤 Employee Directory</div>
          <span className="badge b-gold f10">{employees.length} Members</span>
        </div>
        <div className="tw">
          {isLoading ? (
            <div className="cb" style={{ textAlign: 'center', padding: 30, color: 'var(--t3)' }}>Loading employees…</div>
          ) : (
            <table className="ltable">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Role / Designation</th>
                  <th>Status</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp: any) => (
                  <tr key={emp.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="av" style={{ background: 'linear-gradient(135deg,var(--g1),var(--g3))' }}>
                          {getInitials(emp.name)}
                        </div>
                        <span style={{ fontWeight: 700 }}>{emp.name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--t2)', fontSize: 12 }}>{emp.email}</td>
                    <td>{emp.department || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <span className={`badge ${roleBadge[emp.role] || 'b-gray'}`} style={{ fontSize: 9, padding: '1px 6px' }}>{emp.role}</span>
                        {emp.designation && <span className="badge b-gray" style={{ fontSize: 9, padding: '1px 6px' }}>{emp.designation}</span>}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${emp.isActive ? 'b-green' : 'b-red'}`} style={{ fontSize: 10 }}>
                        {emp.isActive ? '● Active' : '● Inactive'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, color: emp.performanceScore >= 70 ? 'var(--green)' : emp.performanceScore >= 40 ? 'var(--amber)' : 'var(--red)' }}>
                        {emp.performanceScore}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Member Dialog */}
      {showAddDialog && (
        <div className="overlay show" onClick={() => setShowAddDialog(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <button className="mx" onClick={() => setShowAddDialog(false)}>✕</button>
            <div className="mt">Add New Member</div>
            <div className="ms">Fill in the details to add a new team member</div>

            <div className="form-row fr-2">
              <div className="fg">
                <label>Full Name <span>*</span></label>
                <input className="fi" placeholder="Enter full name" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="fg">
                <label>Email <span>*</span></label>
                <input className="fi" type="email" placeholder="Enter email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="form-row fr-2">
              <div className="fg">
                <label>Role</label>
                <select className="fi" value={addForm.role} onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                  <option value="EA">EA</option>
                  <option value="DIRECTOR">Director</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="fg">
                <label>Department</label>
                <input className="fi" placeholder="e.g. Sales, Accounts" value={addForm.department} onChange={e => setAddForm(f => ({ ...f, department: e.target.value }))} />
              </div>
            </div>
            <div className="form-row fr-2">
              <div className="fg">
                <label>Designation</label>
                <input className="fi" placeholder="e.g. Sr. Executive" value={addForm.designation} onChange={e => setAddForm(f => ({ ...f, designation: e.target.value }))} />
              </div>
              <div className="fg">
                <label>Phone</label>
                <input className="fi" placeholder="Enter phone number" value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="form-row fr-1">
              <div className="fg">
                <label>Location</label>
                <input className="fi" placeholder="Enter location" value={addForm.location} onChange={e => setAddForm(f => ({ ...f, location: e.target.value }))} />
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-out" onClick={() => setShowAddDialog(false)}>Cancel</button>
              <button className="btn btn-gold" onClick={handleAdd} disabled={addLoading}>
                {addLoading ? 'Adding…' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Projects View
   ═══════════════════════════════════════════════════════════ */
function ProjectsView() {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', description: '', department: '', managerId: '', priority: 'MEDIUM', startDate: '', endDate: '' })
  const [addLoading, setAddLoading] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => fetch('/api/projects').then(r => r.json()),
  })

  const { data: users = [] } = useQuery({
    queryKey: ['users-list-projects'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
  })

  const projects = (data as any)?.projects || []
  const stats = (data as any)?.stats || { total: 0, inProgress: 0, completed: 0, onHold: 0 }

  const statusBadge: Record<string, string> = {
    PENDING: 'b-amber',
    IN_PROGRESS: 'b-blue',
    COMPLETED: 'b-green',
    ON_HOLD: 'b-gray',
    CANCELLED: 'b-red',
  }
  const statusLabel: Record<string, string> = {
    PENDING: 'Pending',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    ON_HOLD: 'On Hold',
    CANCELLED: 'Cancelled',
  }
  const priorityBadge: Record<string, string> = {
    HIGH: 'p-high',
    MEDIUM: 'p-med',
    LOW: 'p-low',
    CRITICAL: 'p-critical',
  }

  const handleAdd = async () => {
    if (!addForm.name) return
    setAddLoading(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ['projects'] })
        setShowAddDialog(false)
        setAddForm({ name: '', description: '', department: '', managerId: '', priority: 'MEDIUM', startDate: '', endDate: '' })
        showToast('Project created successfully', 'ok')
      } else {
        showToast('Failed to create project', 'err')
      }
    } catch {
      showToast('Failed to create project', 'err')
    }
    setAddLoading(false)
  }

  return (
    <div>
      <div className="ph">
        <div className="ph-left">
          <h2>Projects</h2>
          <p>Track and manage organizational projects</p>
        </div>
        <div className="ph-right">
          <button className="btn btn-gold" onClick={() => setShowAddDialog(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            New Project
          </button>
        </div>
      </div>
      <div className="page-accent" />

      {/* Stat Cards */}
      <div className="stat-grid sg-4" style={{ marginBottom: 16 }}>
        <div className="sc">
          <div className="sc-accent" style={{ background: 'var(--g2)' }} />
          <div className="sc-top">
            <div><div className="sc-label">Total Projects</div><div className="sc-val c-gold">{stats.total}</div></div>
            <div className="sc-icon" style={{ background: 'var(--gb)' }}>📋</div>
          </div>
        </div>
        <div className="sc">
          <div className="sc-accent" style={{ background: 'var(--blue)' }} />
          <div className="sc-top">
            <div><div className="sc-label">In Progress</div><div className="sc-val" style={{ color: 'var(--blue)' }}>{stats.inProgress}</div></div>
            <div className="sc-icon" style={{ background: 'var(--blue-m)' }}>🔄</div>
          </div>
        </div>
        <div className="sc">
          <div className="sc-accent" style={{ background: 'var(--green)' }} />
          <div className="sc-top">
            <div><div className="sc-label">Completed</div><div className="sc-val c-green">{stats.completed}</div></div>
            <div className="sc-icon" style={{ background: 'var(--green-m)' }}>✅</div>
          </div>
        </div>
        <div className="sc">
          <div className="sc-accent" style={{ background: 'var(--amber)' }} />
          <div className="sc-top">
            <div><div className="sc-label">On Hold</div><div className="sc-val c-amber">{stats.onHold}</div></div>
            <div className="sc-icon" style={{ background: 'var(--amber-m)' }}>⏸</div>
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="lcard">
        <div className="ch">
          <div className="ct">📁 Projects Overview</div>
          <span className="badge b-gold f10">{projects.length} Projects</span>
        </div>
        <div className="tw">
          {isLoading ? (
            <div className="cb" style={{ textAlign: 'center', padding: 30, color: 'var(--t3)' }}>Loading projects…</div>
          ) : (
            <table className="ltable">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Department</th>
                  <th>Manager</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                  <th>Completion</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p: any) => (
                  <tr key={p.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 700 }}>{p.name}</div>
                        {p.description && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>}
                      </div>
                    </td>
                    <td>{p.department || '—'}</td>
                    <td>{p.manager?.name || '—'}</td>
                    <td><span className={`badge ${statusBadge[p.status] || 'b-gray'}`}>{statusLabel[p.status] || p.status}</span></td>
                    <td><span className={`badge ${priorityBadge[p.priority] || 'p-med'}`}>{p.priority}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--t2)' }}>{p.endDate ? new Date(p.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
                    <td>
                      <div className="prog">
                        <div className="prog-bg">
                          <div className="prog-fill" style={{
                            width: `${p.completionRate}%`,
                            background: p.completionRate >= 70 ? 'var(--green)' : p.completionRate >= 40 ? 'var(--amber)' : 'var(--red)',
                          }} />
                        </div>
                        <span className="prog-lbl">{p.completionRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Project Dialog */}
      {showAddDialog && (
        <div className="overlay show" onClick={() => setShowAddDialog(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <button className="mx" onClick={() => setShowAddDialog(false)}>✕</button>
            <div className="mt">Create New Project</div>
            <div className="ms">Fill in the details to create a new project</div>

            <div className="form-row fr-2">
              <div className="fg">
                <label>Project Name <span>*</span></label>
                <input className="fi" placeholder="Enter project name" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="fg">
                <label>Department</label>
                <input className="fi" placeholder="e.g. Sales, Accounts" value={addForm.department} onChange={e => setAddForm(f => ({ ...f, department: e.target.value }))} />
              </div>
            </div>
            <div className="form-row fr-1">
              <div className="fg">
                <label>Description</label>
                <textarea className="fi" placeholder="Enter project description" value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <div className="form-row fr-2">
              <div className="fg">
                <label>Manager</label>
                <select className="fi" value={addForm.managerId} onChange={e => setAddForm(f => ({ ...f, managerId: e.target.value }))}>
                  <option value="">Select manager</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label>Priority</label>
                <select className="fi" value={addForm.priority} onChange={e => setAddForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>
            <div className="form-row fr-2">
              <div className="fg">
                <label>Start Date</label>
                <input className="fi" type="date" value={addForm.startDate} onChange={e => setAddForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="fg">
                <label>End Date</label>
                <input className="fi" type="date" value={addForm.endDate} onChange={e => setAddForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-out" onClick={() => setShowAddDialog(false)}>Cancel</button>
              <button className="btn btn-gold" onClick={handleAdd} disabled={addLoading}>
                {addLoading ? 'Creating…' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Reports View
   ═══════════════════════════════════════════════════════════ */
function ReportsView() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [reportData, setReportData] = useState<any>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState<string | null>(null)

  const reportTypes = [
    { key: 'employee', title: 'Employee Report', subtitle: 'Comprehensive employee performance and details', icon: '👥', color: 'var(--g2)', bg: 'var(--gb)' },
    { key: 'task', title: 'Task Report', subtitle: 'All tasks with status, priority, and owner info', icon: '📋', color: 'var(--blue)', bg: 'var(--blue-m)' },
    { key: 'performance', title: 'Performance Report', subtitle: 'Employee ratings, scores, and category breakdown', icon: '🏆', color: 'var(--green)', bg: 'var(--green-m)' },
    { key: 'department', title: 'Department Report', subtitle: 'Department efficiency, completion rates, and metrics', icon: '🏢', color: 'var(--purple)', bg: 'var(--purple-m)' },
  ]

  const fetchReport = async (type: string) => {
    setSelectedReport(type)
    setReportLoading(true)
    try {
      const res = await fetch(`/api/reports?type=${type}`)
      const data = await res.json()
      setReportData(data)
    } catch {
      showToast('Failed to load report', 'err')
    }
    setReportLoading(false)
  }

  const exportCSV = async (type: string) => {
    setExportLoading(type)
    try {
      const res = await fetch(`/api/reports?type=${type}`)
      const data = await res.json()
      const rows = data.data || []
      if (rows.length === 0) {
        showToast('No data to export', 'warn')
        setExportLoading(null)
        return
      }
      const headers = Object.keys(rows[0])
      const csv = [
        headers.join(','),
        ...rows.map((row: any) => headers.map(h => {
          const val = row[h]
          if (val === null || val === undefined) return ''
          if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`
          const str = String(val)
          if (str.includes(',') || str.includes('"') || str.includes('\n')) return `"${str.replace(/"/g, '""')}"`
          return str
        }).join(','))
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}_report_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} report exported`, 'ok')
    } catch {
      showToast('Failed to export report', 'err')
    }
    setExportLoading(null)
  }

  return (
    <div>
      <div className="ph">
        <div className="ph-left">
          <h2>Reports</h2>
          <p>Generate and export organizational reports</p>
        </div>
      </div>
      <div className="page-accent" />

      {/* Report Type Cards */}
      <div className="stat-grid sg-4" style={{ marginBottom: 16 }}>
        {reportTypes.map(rt => (
          <div key={rt.key} className="lcard" style={{ cursor: 'pointer', borderLeft: `3px solid ${rt.color}` }} onClick={() => fetchReport(rt.key)}>
            <div className="cb">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div className="sc-icon" style={{ background: rt.bg, fontSize: 22 }}>{rt.icon}</div>
                <button
                  className="btn btn-sm btn-out"
                  onClick={(e) => { e.stopPropagation(); exportCSV(rt.key) }}
                  disabled={exportLoading === rt.key}
                >
                  {exportLoading === rt.key ? '…' : 'Export CSV'}
                </button>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)', marginBottom: 4 }}>{rt.title}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)' }}>{rt.subtitle}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Report Preview */}
      {selectedReport && (
        <div className="lcard">
          <div className="ch">
            <div className="ct">
              📊 {reportTypes.find(r => r.key === selectedReport)?.title || 'Report'} Preview
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="badge b-gold f10">
                Generated: {reportData?.generatedAt ? new Date(reportData.generatedAt).toLocaleString() : '—'}
              </span>
              <button className="btn btn-sm btn-gold" onClick={() => exportCSV(selectedReport)} disabled={exportLoading === selectedReport}>
                ↓ Export
              </button>
            </div>
          </div>
          <div className="tw">
            {reportLoading ? (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--t3)' }}>Loading report…</div>
            ) : reportData?.data?.length > 0 ? (
              <table className="ltable">
                <thead>
                  <tr>
                    {Object.keys(reportData.data[0]).filter(k => typeof reportData.data[0][k] !== 'object').slice(0, 7).map((key) => (
                      <th key={key}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.data.slice(0, 20).map((row: any, i: number) => (
                    <tr key={i}>
                      {Object.entries(row).filter(([, v]) => typeof v !== 'object').slice(0, 7).map(([key, val]: [string, any]) => {
                        if (key.toLowerCase().includes('score') || key.toLowerCase().includes('rate')) {
                          return (
                            <td key={key}>
                              <span style={{ fontWeight: 800, color: val >= 70 ? 'var(--green)' : val >= 40 ? 'var(--amber)' : 'var(--red)' }}>
                                {val}{key.toLowerCase().includes('rate') ? '%' : ''}
                              </span>
                            </td>
                          )
                        }
                        if (key === 'isOverdue') {
                          return <td key={key}><span className={`badge ${val ? 'b-red' : 'b-green'}`}>{val ? 'Yes' : 'No'}</span></td>
                        }
                        if (key.toLowerCase().includes('status')) {
                          const statusMap: Record<string, string> = {
                            COMPLETED: 'b-green', IN_PROGRESS: 'b-blue', PENDING: 'b-amber',
                            CANCELLED: 'b-red', ON_HOLD: 'b-gray',
                          }
                          return <td key={key}><span className={`badge ${statusMap[val] || 'b-gray'}`}>{String(val).replace(/_/g, ' ')}</span></td>
                        }
                        if (key.toLowerCase().includes('priority')) {
                          const priMap: Record<string, string> = { HIGH: 'p-high', MEDIUM: 'p-med', LOW: 'p-low', CRITICAL: 'p-critical' }
                          return <td key={key}><span className={`badge ${priMap[val] || 'p-med'}`}>{val}</span></td>
                        }
                        return <td key={key} style={{ fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(val ?? '—')}</td>
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty"><p>No data available for this report</p></div>
            )}
          </div>
          {reportData?.data?.length > 20 && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--b1)', fontSize: 11, color: 'var(--t3)', textAlign: 'center' }}>
              Showing 20 of {reportData.data.length} rows. Export CSV for full data.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Scorecards View
   ═══════════════════════════════════════════════════════════ */
function ScorecardsView() {
  const { currentUserId } = useWorkflowStore()

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', currentUserId],
    queryFn: () => fetch(`/api/dashboard?userId=${currentUserId}`).then(r => r.json()),
  })

  const d = data as any
  const userPerf = d?.userPerformance || []

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const scoreColor = (score: number) => score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--amber)' : 'var(--red)'

  // Calculate overall score
  const avgScore = userPerf.length > 0 ? Math.round(userPerf.reduce((s: number, u: any) => s + u.score, 0) / userPerf.length) : 0
  const totalTasks = userPerf.reduce((s: number, u: any) => s + u.total, 0)
  const totalCompleted = userPerf.reduce((s: number, u: any) => s + u.done, 0)
  const totalOverdue = userPerf.reduce((s: number, u: any) => s + u.overdue, 0)

  // Get current week
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  const weekLabel = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  return (
    <div>
      <div className="ph">
        <div className="ph-left">
          <h2>Monday Meeting Scorecard</h2>
          <p>Weekly team performance scorecard · {weekLabel}</p>
        </div>
        <div className="ph-right">
          <span className="badge b-gold">🏆 Scorecard</span>
        </div>
      </div>
      <div className="page-accent" />

      {/* Summary Stats */}
      <div className="stat-grid sg-4" style={{ marginBottom: 16 }}>
        <div className="sc">
          <div className="sc-accent" style={{ background: 'var(--g2)' }} />
          <div className="sc-top">
            <div><div className="sc-label">Avg Score</div><div className="sc-val c-gold">{avgScore}</div></div>
            <div className="sc-icon" style={{ background: 'var(--gb)' }}>🏆</div>
          </div>
        </div>
        <div className="sc">
          <div className="sc-accent" style={{ background: 'var(--blue)' }} />
          <div className="sc-top">
            <div><div className="sc-label">Total Tasks</div><div className="sc-val" style={{ color: 'var(--blue)' }}>{totalTasks}</div></div>
            <div className="sc-icon" style={{ background: 'var(--blue-m)' }}>📋</div>
          </div>
        </div>
        <div className="sc">
          <div className="sc-accent" style={{ background: 'var(--green)' }} />
          <div className="sc-top">
            <div><div className="sc-label">Completed</div><div className="sc-val c-green">{totalCompleted}</div></div>
            <div className="sc-icon" style={{ background: 'var(--green-m)' }}>✅</div>
          </div>
        </div>
        <div className="sc">
          <div className="sc-accent" style={{ background: 'var(--red)' }} />
          <div className="sc-top">
            <div><div className="sc-label">Overdue</div><div className="sc-val c-red">{totalOverdue}</div></div>
            <div className="sc-icon" style={{ background: 'var(--red-m)' }}>⚠</div>
          </div>
        </div>
      </div>

      {/* Scorecard Table */}
      <div className="lcard">
        <div className="ch">
          <div className="ct">📊 Weekly Scorecard</div>
          <span className="badge b-gold f10">{userPerf.length} Members</span>
        </div>
        <div className="tw">
          {isLoading ? (
            <div className="cb" style={{ textAlign: 'center', padding: 30, color: 'var(--t3)' }}>Loading scorecard…</div>
          ) : (
            <table className="ltable">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Department</th>
                  <th>Tasks</th>
                  <th>Completed</th>
                  <th>In Progress</th>
                  <th>Overdue</th>
                  <th>Completion</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {userPerf.map((u: any) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="av" style={{ background: `linear-gradient(135deg,${scoreColor(u.score)},${scoreColor(u.score)}88)` }}>
                          {getInitials(u.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{u.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--t3)' }}>{u.role}</div>
                        </div>
                      </div>
                    </td>
                    <td>{u.department || '—'}</td>
                    <td style={{ fontWeight: 700 }}>{u.total}</td>
                    <td style={{ fontWeight: 700, color: 'var(--green)' }}>{u.done}</td>
                    <td style={{ color: 'var(--blue)' }}>{u.inProgress}</td>
                    <td style={{ fontWeight: 700, color: u.overdue > 0 ? 'var(--red)' : 'var(--t2)' }}>{u.overdue}</td>
                    <td>
                      <div className="prog">
                        <div className="prog-bg">
                          <div className="prog-fill" style={{ width: `${u.completionRate}%`, background: scoreColor(u.score) }} />
                        </div>
                        <span className="prog-lbl">{u.completionRate}%</span>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        fontWeight: 800,
                        fontSize: 14,
                        color: scoreColor(u.score),
                      }}>
                        {u.score}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Top Performers */}
      <div className="g2" style={{ marginTop: 14 }}>
        <div className="lcard">
          <div className="ch"><div className="ct">🥇 Top Performers</div></div>
          <div className="cb">
            {userPerf.sort((a: any, b: any) => b.score - a.score).slice(0, 5).map((u: any, i: number) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--b1)' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: i === 0 ? 'var(--g2)' : i === 1 ? 'var(--t2)' : 'var(--t3)', width: 24, textAlign: 'center' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <div className="av" style={{ width: 28, height: 28, fontSize: 10, background: `linear-gradient(135deg,var(--g1),var(--g3))` }}>
                  {getInitials(u.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{u.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--t3)' }}>{u.department || '—'}</div>
                </div>
                <span style={{ fontWeight: 800, color: scoreColor(u.score) }}>{u.score}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lcard">
          <div className="ch"><div className="ct">⚠ Needs Attention</div></div>
          <div className="cb">
            {userPerf.filter((u: any) => u.score < 40).length > 0 ? (
              userPerf.filter((u: any) => u.score < 40).map((u: any) => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--b1)' }}>
                  <div className="av" style={{ width: 28, height: 28, fontSize: 10, background: 'var(--red-l)', color: 'var(--red)' }}>
                    {getInitials(u.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>{u.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--t3)' }}>{u.department || '—'} · {u.overdue} overdue</div>
                  </div>
                  <span style={{ fontWeight: 800, color: 'var(--red)' }}>{u.score}</span>
                </div>
              ))
            ) : (
              <div className="empty"><p>🎉 Everyone is performing well!</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Settings View
   ═══════════════════════════════════════════════════════════ */
function SettingsView() {
  const { darkMode, toggleDarkMode, currentUserName, currentRole, currentUserId } = useWorkflowStore()

  const { data: userData } = useQuery({
    queryKey: ['user-settings', currentUserId],
    queryFn: () => fetch('/api/users').then(r => r.json()),
  })

  const users = Array.isArray(userData) ? userData : []
  const currentUser = users.find((u: any) => u.id === currentUserId)

  return (
    <div>
      <div className="ph">
        <div className="ph-left">
          <h2>Settings</h2>
          <p>Manage your preferences and account settings</p>
        </div>
      </div>
      <div className="page-accent" />

      <div className="g2">
        {/* Profile Card */}
        <div className="lcard">
          <div className="ch"><div className="ct">👤 Profile Information</div></div>
          <div className="cb">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div className="av" style={{ width: 56, height: 56, fontSize: 20, background: 'linear-gradient(135deg,var(--g1),var(--g3))' }}>
                {currentUser?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--t1)' }}>{currentUser?.name || currentUserName}</div>
                <div style={{ fontSize: 12, color: 'var(--t3)' }}>{currentUser?.email || '—'}</div>
                <div style={{ marginTop: 4 }}>
                  <span className="badge b-gold" style={{ fontSize: 10 }}>{currentRole}</span>
                </div>
              </div>
            </div>

            <div className="divider" />

            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--t3)' }}>Department</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{currentUser?.department || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--t3)' }}>Designation</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{currentUser?.designation || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--t3)' }}>Phone</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{currentUser?.phone || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--t3)' }}>Location</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{currentUser?.location || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--t3)' }}>User ID</span>
                <span className="td-code">{currentUserId}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Preferences Card */}
        <div className="lcard">
          <div className="ch"><div className="ct">⚙ Preferences</div></div>
          <div className="cb">
            {/* Dark Mode Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--b1)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Dark Mode</div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>Switch between light and dark theme</div>
              </div>
              <button
                className={`dark-toggle ${darkMode ? 'on' : ''}`}
                onClick={toggleDarkMode}
                title="Toggle dark mode"
              />
            </div>

            {/* Notification Settings */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--b1)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Email Notifications</div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>Receive email alerts for approvals and tasks</div>
              </div>
              <button className="dark-toggle on" style={{ opacity: 0.5, cursor: 'not-allowed' }} disabled />
            </div>

            {/* Auto Refresh */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--b1)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Auto-Refresh Data</div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>Automatically refresh dashboard every 30 seconds</div>
              </div>
              <button className="dark-toggle on" style={{ opacity: 0.5, cursor: 'not-allowed' }} disabled />
            </div>

            {/* Compact View */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Compact View</div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>Reduce spacing and card sizes</div>
              </div>
              <button className="dark-toggle" style={{ opacity: 0.5, cursor: 'not-allowed' }} disabled />
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="lcard" style={{ marginTop: 14 }}>
        <div className="ch"><div className="ct">ℹ️ About LAXREE Enterprise Suite</div></div>
        <div className="cb">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 800 }}>Version</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>2.0.0</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 800 }}>Environment</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>Production</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 800 }}>License</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>Enterprise</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 800 }}>Support</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>support@laxree.com</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Toast Helper
   ═══════════════════════════════════════════════════════════ */
function showToast(msg: string, type: 'ok' | 'err' | 'warn' | 'info' = 'info') {
  const area = document.getElementById('toastArea')
  if (!area) return
  const el = document.createElement('div')
  el.className = `toast ${type}`
  el.textContent = msg
  area.appendChild(el)
  setTimeout(() => el.remove(), 3500)
}

export default function HomePage() {
  const { darkMode } = useWorkflowStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', transition: 'background .3s' }}>
      <AppHeader />
      <AppSidebar />
      <main className="main-area">
        <ActiveView />
      </main>
      <div id="toastArea" />
    </div>
  )
}

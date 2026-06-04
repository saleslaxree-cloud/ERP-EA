'use client'

import { useWorkflowStore } from '@/stores/workflow-store'
import { useQuery } from '@tanstack/react-query'
import { AppSidebar } from '@/components/app-sidebar'
import { AppHeader } from '@/components/app-header'
import { WorkflowDashboard } from '@/components/workflow-dashboard'
import { WorkflowList } from '@/components/workflow-list'
import { ApprovalList } from '@/components/approval-list'
import { TaskList } from '@/components/task-list'
import { NotificationList } from '@/components/notification-list'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useEffect } from 'react'

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

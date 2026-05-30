'use client'

import { useQuery } from '@tanstack/react-query'
import { useWorkflowStore } from '@/stores/workflow-store'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface DashboardData {
  statusCounts: Record<string, number>
  totalWorkflows: number
  pendingApprovals: number
  activeTasks: number
  overdueTasks: number
  escalationCount: number
  completionRate: number
  recentActivities: {
    id: string
    fromStatus: string
    toStatus: string
    changedBy: string | null
    reason: string | null
    createdAt: string
    workflow: { id: string; title: string }
  }[]
}

interface TaskData {
  id: string
  title: string
  status: string
  priority: string
  dueDate: string | null
  owner: { name: string; department: string | null }
}

interface UserData {
  id: string
  name: string
  role: string
  department: string | null
}

export function WorkflowDashboard() {
  const { currentUserId, currentUserName, setActiveView } = useWorkflowStore()

  const { data, isLoading, refetch } = useQuery<DashboardData>({
    queryKey: ['dashboard', currentUserId],
    queryFn: () => fetch(`/api/dashboard?userId=${currentUserId}`).then(r => r.json()),
  })

  const { data: tasks = [] } = useQuery<TaskData[]>({
    queryKey: ['tasks'],
    queryFn: () => fetch('/api/tasks').then(r => r.json()),
  })

  const { data: users = [] } = useQuery<UserData[]>({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
  })

  if (isLoading) {
    return (
      <div>
        <div className="ph">
          <div className="ph-left"><h2>Welcome back…</h2></div>
        </div>
        <div className="stat-grid sg-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="sc" style={{ opacity: 0.5 }}>
              <div className="sc-accent" style={{ background: 'var(--b2)' }} />
              <div className="sc-top"><div><div className="sc-label">Loading…</div><div className="sc-val">—</div></div></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const d = data || {
    statusCounts: {},
    totalWorkflows: 0,
    pendingApprovals: 0,
    activeTasks: 0,
    overdueTasks: 0,
    escalationCount: 0,
    completionRate: 0,
    recentActivities: [],
  }

  const today = new Date()
  const todayStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  // Task calculations
  const todayTasks = tasks.filter(t => {
    if (!t.dueDate) return false
    const due = new Date(t.dueDate)
    return due.toDateString() === today.toDateString()
  })

  const upcomingTasks = tasks.filter(t => {
    if (!t.dueDate) return false
    const due = new Date(t.dueDate)
    const diffDays = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    return diffDays > 0 && diffDays <= 7
  })

  const overdueTasksList = tasks.filter(t => {
    if (!t.dueDate) return false
    const due = new Date(t.dueDate)
    return due < today && !['COMPLETED', 'CANCELLED'].includes(t.status)
  })

  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length
  const performanceScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // User performance for score board
  const userPerformance = users.map(user => {
    const userTasks = tasks.filter(t => t.owner?.name === user.name)
    const done = userTasks.filter(t => t.status === 'COMPLETED').length
    const overdue = userTasks.filter(t => {
      if (!t.dueDate) return false
      return new Date(t.dueDate) < today && !['COMPLETED', 'CANCELLED'].includes(t.status)
    }).length
    const score = userTasks.length > 0 ? Math.round((done / userTasks.length) * 100 - overdue * 5) : 0
    return { ...user, total: userTasks.length, done, overdue, score: Math.max(0, score) }
  })

  // Department stats
  const deptMap: Record<string, { total: number; done: number; overdue: number }> = {}
  tasks.forEach(t => {
    const dept = t.owner?.department || 'Unassigned'
    if (!deptMap[dept]) deptMap[dept] = { total: 0, done: 0, overdue: 0 }
    deptMap[dept].total++
    if (t.status === 'COMPLETED') deptMap[dept].done++
    if (t.dueDate && new Date(t.dueDate) < today && !['COMPLETED', 'CANCELLED'].includes(t.status)) deptMap[dept].overdue++
  })

  // Chart data
  const chartData = Object.entries(d.statusCounts).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
  }))

  const deptChartData = Object.entries(deptMap).map(([name, v]) => ({
    name,
    Total: v.total,
    Completed: v.done,
    Overdue: v.overdue,
  }))

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'var(--amber)', IN_REVIEW: 'var(--blue)', APPROVED: 'var(--green)',
      REJECTED: 'var(--red)', IN_PROGRESS: 'var(--blue)', ON_HOLD: 'var(--purple)',
      ESCALATED: 'var(--rose)', COMPLETED: 'var(--green)', CANCELLED: 'var(--t4)',
      DRAFT: 'var(--t3)', RE_OPENED: 'var(--amber)', EXTERNAL_HOLD: 'var(--purple)',
    }
    return colors[status] || 'var(--t3)'
  }

  const getBadgeClass = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 's-pending', IN_PROGRESS: 's-inprog', COMPLETED: 's-done',
      OVERDUE: 's-overdue', CANCELLED: 's-cancelled', ESCALATED: 'b-red',
      APPROVED: 'b-green', REJECTED: 'b-red', ON_HOLD: 's-waiting',
      DRAFT: 's-pending', IN_REVIEW: 'b-blue', EXTERNAL_HOLD: 's-exthold',
      RE_OPENED: 'b-amber',
    }
    return map[status] || 'b-gray'
  }

  const getPriorityBadge = (p: string) => {
    const map: Record<string, string> = { CRITICAL: 'p-critical', HIGH: 'p-high', MEDIUM: 'p-med', LOW: 'p-low' }
    return map[p] || 'p-med'
  }

  return (
    <div>
      {/* Page Header */}
      <div className="ph">
        <div className="ph-left">
          <h2>Welcome back, <span style={{ color: 'var(--g2)' }}>{currentUserName}</span> 👋</h2>
          <p>Live operations overview · <span style={{ color: 'var(--g2)', fontWeight: 700 }}>{todayStr}</span></p>
        </div>
        <div className="ph-right">
          <button className="btn btn-out btn-sm" onClick={() => refetch()}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Alert Banners */}
      {d.pendingApprovals > 0 && (
        <div className="alert alert-gold">
          <div className="alert-icon">🔔</div>
          <div className="alert-body">
            <div className="alert-title" style={{ color: 'var(--g2)' }}>Pending Approvals Required</div>
            <div className="alert-sub">Employee completions awaiting your review</div>
          </div>
          <span className="alert-cnt">{d.pendingApprovals}</span>
          <button className="btn btn-gold btn-sm" onClick={() => setActiveView('approvals')}>Review →</button>
        </div>
      )}

      {overdueTasksList.length > 0 && (
        <div className="alert" style={{ background: '#FFF7ED', border: '1.5px solid rgba(194,65,12,.3)' }}>
          <div className="alert-icon">⏸</div>
          <div className="alert-body">
            <div className="alert-title" style={{ color: '#C2410C' }}>Tasks on External Hold — Director/Dept Action Needed</div>
            <div className="alert-sub">Employee work is done but waiting on external action</div>
          </div>
          <span style={{ background: '#C2410C', color: '#fff', borderRadius: 20, padding: '3px 12px', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{overdueTasksList.length}</span>
        </div>
      )}

      {d.escalationCount > 0 && (
        <div className="alert alert-red">
          <div className="alert-icon">🚨</div>
          <div className="alert-body">
            <div className="alert-title" style={{ color: 'var(--red)' }}>Critical Escalations Active</div>
            <div className="alert-sub">Tasks overdue beyond threshold</div>
          </div>
          <button className="btn btn-red btn-sm" onClick={() => setActiveView('escalations')}>View →</button>
        </div>
      )}

      {/* 4 KPI Stats */}
      <div className="stat-grid sg-4 mb0" style={{ marginBottom: 12 }}>
        <div className="sc lux-border" style={{ cursor: 'pointer' }} onClick={() => setActiveView('tasks')}>
          <div className="sc-accent" style={{ background: 'var(--red)' }} />
          <div className="sc-top">
            <div>
              <div className="sc-label">🔴 Overdue Tasks</div>
              <div className="sc-val" style={{ color: 'var(--red)' }}>{overdueTasksList.length}</div>
            </div>
            <div className="sc-icon" style={{ background: 'var(--red-m)' }}>⚠</div>
          </div>
          <div className="sc-sub">Requires immediate action</div>
          <div className="sc-bar"><div className="sc-bar-fill" style={{ background: 'var(--red)', width: `${totalTasks > 0 ? (overdueTasksList.length / totalTasks) * 100 : 0}%` }} /></div>
        </div>

        <div className="sc lux-border" style={{ cursor: 'pointer' }} onClick={() => setActiveView('tasks')}>
          <div className="sc-accent" style={{ background: 'var(--amber)' }} />
          <div className="sc-top">
            <div>
              <div className="sc-label">🟡 Today&apos;s Tasks</div>
              <div className="sc-val" style={{ color: 'var(--amber)' }}>{todayTasks.length}</div>
            </div>
            <div className="sc-icon" style={{ background: 'var(--amber-m)' }}>📅</div>
          </div>
          <div className="sc-sub">Due today</div>
          <div className="sc-bar"><div className="sc-bar-fill" style={{ background: 'var(--amber)', width: `${totalTasks > 0 ? (todayTasks.length / totalTasks) * 100 : 0}%` }} /></div>
        </div>

        <div className="sc lux-border" style={{ cursor: 'pointer' }} onClick={() => setActiveView('tasks')}>
          <div className="sc-accent" style={{ background: 'var(--blue)' }} />
          <div className="sc-top">
            <div>
              <div className="sc-label">📌 Upcoming Tasks</div>
              <div className="sc-val" style={{ color: 'var(--blue)' }}>{upcomingTasks.length}</div>
            </div>
            <div className="sc-icon" style={{ background: 'var(--blue-m)' }}>🗓</div>
          </div>
          <div className="sc-sub">Next 7 days</div>
          <div className="sc-bar"><div className="sc-bar-fill" style={{ background: 'var(--blue)', width: `${totalTasks > 0 ? (upcomingTasks.length / totalTasks) * 100 : 0}%` }} /></div>
        </div>

        <div className="sc lux-border">
          <div className="sc-accent" style={{ background: 'var(--green)' }} />
          <div className="sc-top">
            <div>
              <div className="sc-label">🟢 Performance Score</div>
              <div className="sc-val" style={{ color: 'var(--g2)' }}>{performanceScore}%</div>
            </div>
            <div className="sc-icon" style={{ background: 'var(--gb)' }}>📈</div>
          </div>
          <div className="sc-sub">Team efficiency this week</div>
          <div className="sc-bar"><div className="sc-bar-fill" style={{ background: 'var(--g2)', width: `${performanceScore}%` }} /></div>
        </div>
      </div>

      {/* Performance Score Board */}
      <div className="lcard" style={{ marginBottom: 14, padding: '14px 16px', background: 'linear-gradient(135deg,var(--g5),var(--card))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--g2)' }}>📊 Performance Score Board</div>
          <span style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 700 }}>🟢 ≥70 Excellent | 🟡 40–69 On Track | 🔴 &lt;40 Needs Attention</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 8 }}>
          {userPerformance.slice(0, 8).map(u => (
            <div key={u.id} style={{
              background: 'var(--card)', border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)',
              padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div className="ua" style={{ width: 28, height: 28, fontSize: 9 }}>
                {u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                <div style={{ fontSize: 10, color: 'var(--t3)' }}>{u.total} tasks · {u.done} done</div>
              </div>
              <div style={{
                fontSize: 14, fontWeight: 800,
                color: u.score >= 70 ? 'var(--green)' : u.score >= 40 ? 'var(--amber)' : 'var(--red)',
              }}>
                {u.score}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Performance + AI Insights */}
      <div className="g-70-30">
        <div className="lcard">
          <div className="ch">
            <div className="ct">⚡ Weekly Team Performance</div>
            <span className="badge b-gold f10">Live</span>
          </div>
          <div className="tw">
            <table className="ltable">
              <thead>
                <tr>
                  <th>Member</th><th>Dept</th><th>Tasks</th><th>Done</th><th>Overdue</th><th>Score</th><th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {userPerformance.slice(0, 10).map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="ua" style={{ width: 24, height: 24, fontSize: 8 }}>
                          {u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        {u.name}
                      </div>
                    </td>
                    <td>{u.department || '—'}</td>
                    <td>{u.total}</td>
                    <td style={{ color: 'var(--green)', fontWeight: 700 }}>{u.done}</td>
                    <td style={{ color: u.overdue > 0 ? 'var(--red)' : 'var(--t2)', fontWeight: u.overdue > 0 ? 700 : 400 }}>{u.overdue}</td>
                    <td>
                      <span className={`badge ${u.score >= 70 ? 'b-green' : u.score >= 40 ? 'b-amber' : 'b-red'}`}>
                        {u.score}
                      </span>
                    </td>
                    <td>
                      <div className="prog">
                        <div className="prog-bg">
                          <div className="prog-fill" style={{
                            width: `${u.total > 0 ? (u.done / u.total) * 100 : 0}%`,
                            background: u.score >= 70 ? 'var(--green)' : u.score >= 40 ? 'var(--amber)' : 'var(--red)',
                          }} />
                        </div>
                        <span className="prog-lbl">{u.total > 0 ? Math.round((u.done / u.total) * 100) : 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="ai-widget">
          <div className="ai-label"><div className="ai-pulse" />AI Intelligence Engine</div>
          <div className="ai-item">
            <div className="ai-bullet" style={{ background: 'var(--green)' }} />
            <div className="ai-text"><strong>Team performance is {performanceScore >= 70 ? 'excellent' : performanceScore >= 40 ? 'on track' : 'needs attention'}.</strong> Overall completion rate at {performanceScore}%.</div>
          </div>
          <div className="ai-item">
            <div className="ai-bullet" style={{ background: 'var(--amber)' }} />
            <div className="ai-text"><strong>{d.pendingApprovals} approval{d.pendingApprovals !== 1 ? 's' : ''} pending.</strong> Review to unblock team progress.</div>
          </div>
          <div className="ai-item">
            <div className="ai-bullet" style={{ background: 'var(--red)' }} />
            <div className="ai-text"><strong>{overdueTasksList.length} overdue task{overdueTasksList.length !== 1 ? 's' : ''}</strong> require immediate attention.</div>
          </div>
          {userPerformance.filter(u => u.score >= 70).length > 0 && (
            <div className="ai-item">
              <div className="ai-bullet" style={{ background: 'var(--g2)' }} />
              <div className="ai-text"><strong>Top performer:</strong> {userPerformance.sort((a, b) => b.score - a.score)[0]?.name} with score {userPerformance[0]?.score}.</div>
            </div>
          )}
        </div>
      </div>

      {/* Today's Tasks + Upcoming Tasks */}
      <div className="g2">
        <div className="lcard">
          <div className="ch">
            <div className="ct">📅 Today&apos;s Tasks</div>
            <span className="badge b-amber f10">{todayTasks.length}</span>
          </div>
          <div className="cb p0" style={{ padding: '0 8px 8px', maxHeight: 320, overflowY: 'auto' }}>
            {todayTasks.length > 0 ? todayTasks.map(t => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderBottom: '1px solid var(--b1)',
                fontSize: 12,
              }}>
                <div className="av" style={{ width: 26, height: 26, fontSize: 9, background: 'linear-gradient(135deg,var(--g1),var(--g3))' }}>
                  {t.owner?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                  <div style={{ fontSize: 10, color: 'var(--t3)' }}>{t.owner?.name} · {t.owner?.department}</div>
                </div>
                <span className={`badge ${getBadgeClass(t.status)}`}>{t.status.replace(/_/g, ' ')}</span>
                <span className={`badge ${getPriorityBadge(t.priority)}`}>{t.priority}</span>
              </div>
            )) : (
              <div className="empty" style={{ padding: 20 }}><p>No tasks due today 🎉</p></div>
            )}
          </div>
        </div>

        <div className="lcard">
          <div className="ch">
            <div className="ct">🗓 Upcoming Tasks</div>
            <span className="badge b-blue f10">{upcomingTasks.length}</span>
          </div>
          <div className="cb p0" style={{ padding: '0 8px 8px', maxHeight: 320, overflowY: 'auto' }}>
            {upcomingTasks.length > 0 ? upcomingTasks.map(t => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderBottom: '1px solid var(--b1)',
                fontSize: 12,
              }}>
                <div className="av" style={{ width: 26, height: 26, fontSize: 9, background: 'linear-gradient(135deg,var(--g1),var(--g3))' }}>
                  {t.owner?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                  <div style={{ fontSize: 10, color: 'var(--t3)' }}>
                    {t.owner?.name} · Due {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}
                  </div>
                </div>
                <span className={`badge ${getBadgeClass(t.status)}`}>{t.status.replace(/_/g, ' ')}</span>
              </div>
            )) : (
              <div className="empty" style={{ padding: 20 }}><p>No upcoming tasks in next 7 days</p></div>
            )}
          </div>
        </div>
      </div>

      {/* Team Commitment vs Delivery */}
      <div className="lcard" style={{ marginBottom: 14 }}>
        <div className="ch">
          <div className="ct">🎯 Team Commitment vs Delivery</div>
          <span className="badge b-gold f10">This Week</span>
        </div>
        <div className="cb">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
            {userPerformance.slice(0, 6).map(u => {
              const rate = u.total > 0 ? Math.round((u.done / u.total) * 100) : 0
              return (
                <div key={u.id} style={{
                  background: 'var(--bg)', borderRadius: 'var(--r-sm)', padding: 10,
                  border: '1px solid var(--b1)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{u.name}</span>
                    <span className={`badge ${rate >= 70 ? 'b-green' : rate >= 40 ? 'b-amber' : 'b-red'}`}>
                      {rate}%
                    </span>
                  </div>
                  <div className="prog">
                    <div className="prog-bg">
                      <div className="prog-fill" style={{
                        width: `${rate}%`,
                        background: rate >= 70 ? 'var(--green)' : rate >= 40 ? 'var(--amber)' : 'var(--red)',
                      }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>
                    Committed: {u.total} · Delivered: {u.done}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Department Productivity + Chart */}
      <div className="g2">
        <div className="lcard">
          <div className="ch">
            <div className="ct">🏢 Department Productivity</div>
            <span className="badge b-gold f10">Live</span>
          </div>
          <div className="cb">
            {Object.entries(deptMap).length > 0 ? Object.entries(deptMap).map(([name, v]) => {
              const rate = v.total > 0 ? Math.round((v.done / v.total) * 100) : 0
              return (
                <div key={name} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700 }}>{name}</span>
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
                  {v.overdue > 0 && (
                    <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 600, marginTop: 2, display: 'block' }}>
                      ⚠ {v.overdue} overdue
                    </span>
                  )}
                </div>
              )
            }) : (
              <div className="empty" style={{ padding: 20 }}><p>No department data yet</p></div>
            )}
          </div>
        </div>

        <div className="lcard">
          <div className="ch">
            <div className="ct">📅 Task Completion Timeline</div>
            <span className="badge b-green f10">Weekly</span>
          </div>
          <div className="cb">
            {chartData.length > 0 ? (
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--b1)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--t3)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--t3)' }} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--card)', border: '1px solid var(--b2)',
                        borderRadius: 'var(--r-sm)', fontSize: 12,
                      }}
                    />
                    <Bar dataKey="Total" fill="var(--blue)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Completed" fill="var(--green)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Overdue" fill="var(--red)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty" style={{ padding: 20 }}><p>No chart data yet</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

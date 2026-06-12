'use client'

import { useQuery } from '@tanstack/react-query'
import { useWorkflowStore } from '@/stores/workflow-store'

interface DashboardData {
  statusCounts: Record<string, number>
  totalWorkflows: number
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  inProgressTasks: number
  overdueTasks: number
  todayTasks: number
  upcomingTasks: number
  pendingApprovals: number
  escalationCount: number
  completionRate: number
  performanceScore: number
  userPerformance: any[]
  deptMap: Record<string, { total: number; done: number; overdue: number; inProgress: number; pending: number }>
  catMap: Record<string, { total: number; done: number; inProgress: number }>
  recentActivities: any[]
  todayTasksList: any[]
  upcomingTasksList: any[]
  overdueTasksList: any[]
  pendingApprovalsList: any[]
}

interface User {
  id: string; name: string; email: string; role: string; department: string | null
}

const AVATAR_COLORS = ['#B45309', '#6D28D9', '#0F766E', '#1D4ED8', '#BE123C', '#15803D', '#C2410C', '#7C3AED', '#0D9488', '#B8860B']
function avatarColor(name: string) { let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h); return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length] }

export function LaxreeDashboard() {
  const { currentUser, setActivePage, currentUserId } = useWorkflowStore()

  const { data: dash, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard', currentUserId],
    queryFn: () => fetch(`/api/dashboard?userId=${currentUserId}`).then(r => r.json()),
    enabled: !!currentUserId,
  })

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
  })

  if (isLoading) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>⏳</div>
      <div style={{ color: 'var(--t3)', fontWeight: 600 }}>Loading dashboard data...</div>
    </div>
  )

  const total = dash?.totalTasks || 0
  const completed = dash?.completedTasks || 0
  const overdue = dash?.overdueTasks || 0
  // pendingApprovals removed — approval center has been removed
  const inProgress = dash?.inProgressTasks || 0
  const completionRate = dash?.completionRate || 0
  const effScore = Math.max(0, completionRate - Math.round(overdue / Math.max(total, 1) * 10))

  const userPerf = dash?.userPerformance || []
  const todayTasks = dash?.todayTasksList || []
  const upcomingTasks = dash?.upcomingTasksList || []
  const overdueTasks = dash?.overdueTasksList || []

  const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
  const scoreColor = (s: number) => s >= 70 ? 'var(--green)' : s >= 40 ? 'var(--amber)' : 'var(--red)'

  const statusLabels: Record<string, string> = {
    DRAFT: 'Draft', PENDING: 'Pending', IN_REVIEW: 'In Review', APPROVED: 'Approved',
    REJECTED: 'Rejected', IN_PROGRESS: 'In Progress', ON_HOLD: 'On Hold',
    ESCALATED: 'Escalated', COMPLETED: 'Completed', CANCELLED: 'Cancelled', EXTERNAL_HOLD: 'External Hold',
  }

  return (
    <>
      <div className="ph">
        <div className="ph-left">
          <h2>Welcome back, <span style={{ color: 'var(--g2)' }}>{currentUser?.name || 'Admin'}</span></h2>
          <p>Live operations overview · <span style={{ color: 'var(--g2)', fontWeight: 700 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </span></p>
        </div>
      </div>

      {/* Alert Banners */}
      {overdue > 0 && (
        <div className="alert alert-red">
          <div className="alert-icon">🚨</div>
          <div className="alert-body">
            <div className="alert-title" style={{ color: 'var(--red)' }}>Critical: Overdue Tasks</div>
            <div className="alert-sub">{overdue} task(s) are past due date — immediate attention needed</div>
          </div>
          <button className="btn btn-red btn-sm" onClick={() => setActivePage('tasks')}>View →</button>
        </div>
      )}

      {/* 4 KPI Stat Cards */}
      <div className="stat-grid sg-4" style={{ marginBottom: 16 }}>
        <div className="sc lux-border" style={{ cursor: 'pointer' }} onClick={() => setActivePage('tasks')}>
          <div className="sc-accent" style={{ background: 'var(--red)' }} />
          <div className="sc-top">
            <div><div className="sc-label">🔴 Overdue</div><div className="sc-val" style={{ color: 'var(--red)' }}>{overdue}</div></div>
            <div className="sc-icon" style={{ background: 'var(--red-m)' }}>⚠️</div>
          </div>
          <div className="sc-sub">Requires immediate action</div>
          <div className="sc-bar"><div className="sc-bar-fill" style={{ width: `${Math.min(100, overdue * 10)}%`, background: 'var(--red)' }} /></div>
        </div>
        <div className="sc lux-border" style={{ cursor: 'pointer' }} onClick={() => setActivePage('tasks')}>
          <div className="sc-accent" style={{ background: 'var(--amber)' }} />
          <div className="sc-top">
            <div><div className="sc-label">🟡 Today&apos;s Tasks</div><div className="sc-val" style={{ color: 'var(--amber)' }}>{todayTasks.length}</div></div>
            <div className="sc-icon" style={{ background: 'var(--amber-m)' }}>📅</div>
          </div>
          <div className="sc-sub">Due today</div>
          <div className="sc-bar"><div className="sc-bar-fill" style={{ width: `${Math.min(100, todayTasks.length * 10)}%`, background: 'var(--amber)' }} /></div>
        </div>
        <div className="sc lux-border" style={{ cursor: 'pointer' }} onClick={() => setActivePage('tasks')}>
          <div className="sc-accent" style={{ background: 'var(--blue)' }} />
          <div className="sc-top">
            <div><div className="sc-label">🔵 In Progress</div><div className="sc-val" style={{ color: 'var(--blue)' }}>{inProgress}</div></div>
            <div className="sc-icon" style={{ background: 'var(--blue-m)' }}>🔄</div>
          </div>
          <div className="sc-sub">Currently active</div>
          <div className="sc-bar"><div className="sc-bar-fill" style={{ width: `${Math.min(100, inProgress * 7)}%`, background: 'var(--blue)' }} /></div>
        </div>
        <div className="sc lux-border">
          <div className="sc-accent" style={{ background: 'var(--green)' }} />
          <div className="sc-top">
            <div><div className="sc-label">🟢 Performance</div><div className="sc-val" style={{ color: 'var(--g2)' }}>{effScore}%</div></div>
            <div className="sc-icon" style={{ background: 'var(--gb)' }}>📈</div>
          </div>
          <div className="sc-sub">{effScore >= 70 ? 'Excellent performance' : effScore >= 40 ? 'On track' : 'Needs attention'}</div>
          <div className="sc-bar"><div className="sc-bar-fill" style={{ width: `${effScore}%`, background: 'var(--g2)' }} /></div>
        </div>
      </div>

      {/* Performance Score Board */}
      <div className="lcard" style={{ marginBottom: 14 }}>
        <div className="ch">
          <div className="ct">📊 Team Performance Score Board</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 9, color: 'var(--t3)', fontWeight: 700 }}>🟢 ≥70 Excellent | 🟡 40-69 On Track | 🔴 &lt;40 Attention</span>
          </div>
        </div>
        <div className="cb">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
            {userPerf.filter(u => u.role !== 'DIRECTOR').slice(0, 8).map((u: any) => (
              <div key={u.id} style={{
                background: 'var(--card)', border: '1.5px solid var(--b1)', borderRadius: 'var(--r-sm)',
                padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all .15s', cursor: 'pointer',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--b1)'}
              >
                <div className="av" style={{ background: avatarColor(u.name) }}>{getInitials(u.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                  <div style={{ fontSize: 9.5, color: 'var(--t3)' }}>{u.done}/{u.total} done · {u.department || '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: scoreColor(u.score) }}>{u.score}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two Column: Tasks + AI Insights */}
      <div className="g-70-30" style={{ marginBottom: 14 }}>
        {/* Weekly Team Performance Table */}
        <div className="lcard">
          <div className="ch">
            <div className="ct">⚡ Weekly Team Performance</div>
            <span className="badge b-gold" style={{ fontSize: 10 }}>Live</span>
          </div>
          <div className="tw">
            <table className="ltable">
              <thead>
                <tr><th>Member</th><th>Department</th><th>Role</th><th>Tasks</th><th>Done</th><th>Score</th></tr>
              </thead>
              <tbody>
                {userPerf.filter(u => u.role !== 'DIRECTOR').slice(0, 10).map((u: any) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="av" style={{ width: 26, height: 26, fontSize: 9, background: avatarColor(u.name) }}>{getInitials(u.name)}</div>
                        <span style={{ fontWeight: 600, fontSize: 12 }}>{u.name}</span>
                      </div>
                    </td>
                    <td><span className="badge b-gray" style={{ fontSize: 9 }}>{u.department || '—'}</span></td>
                    <td style={{ fontSize: 11 }}>{u.role}</td>
                    <td style={{ fontSize: 11, fontWeight: 700 }}>{u.total}</td>
                    <td style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)' }}>{u.done}</td>
                    <td>
                      <span style={{ fontWeight: 900, fontSize: 13, color: scoreColor(u.score) }}>{u.score}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Insights */}
        <div className="ai-widget">
          <div className="ai-label"><div className="ai-pulse" />AI Intelligence</div>
          <div className="ai-item">
            <div className="ai-bullet" style={{ background: completionRate >= 70 ? 'var(--green)' : 'var(--red)' }} />
            <div className="ai-text"><strong>Completion Rate: {completionRate}%</strong> — {completionRate >= 70 ? 'Healthy output across departments.' : 'Below target. Consider workload redistribution.'}</div>
          </div>
          {overdue > 0 && (
            <div className="ai-item">
              <div className="ai-bullet" style={{ background: 'var(--red)' }} />
              <div className="ai-text"><strong>{overdue} Overdue Task(s)</strong> — Immediate attention required.</div>
            </div>
          )}
          <div className="ai-item">
            <div className="ai-bullet" style={{ background: 'var(--green)' }} />
            <div className="ai-text"><strong>{users.length} Active Members</strong> — Team is operational.</div>
          </div>
        </div>
      </div>

      {/* Today + Upcoming Tasks */}
      <div className="g2" style={{ marginBottom: 14 }}>
        <div className="lcard">
          <div className="ch">
            <div className="ct">📅 Today&apos;s Tasks</div>
            <span className="badge b-amber" style={{ fontSize: 10 }}>{todayTasks.length}</span>
          </div>
          <div className="cb">
            {todayTasks.length === 0 ? (
              <div className="empty" style={{ padding: 20 }}><p>No tasks due today</p></div>
            ) : todayTasks.slice(0, 5).map((t: any) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderBottom: '1px solid var(--b1)', cursor: 'pointer' }}>
                <div className="av" style={{ width: 28, height: 28, fontSize: 10, background: avatarColor(t.owner?.name || 'T') }}>{getInitials(t.owner?.name || 'T')}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                  <div style={{ fontSize: 10, color: 'var(--t3)' }}>{t.owner?.name} · {t.department || '—'}</div>
                </div>
                <span className="badge" style={{ fontSize: 9, padding: '2px 6px', background: statusLabels[t.status] ? 'var(--amber-l)' : 'var(--bg2)', color: 'var(--amber)' }}>
                  {statusLabels[t.status] || t.status}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="lcard">
          <div className="ch">
            <div className="ct">📌 Upcoming Tasks</div>
            <span className="badge b-blue" style={{ fontSize: 10 }}>{upcomingTasks.length}</span>
          </div>
          <div className="cb">
            {upcomingTasks.length === 0 ? (
              <div className="empty" style={{ padding: 20 }}><p>No upcoming tasks</p></div>
            ) : upcomingTasks.slice(0, 5).map((t: any) => {
              const daysLeft = t.dueDate ? Math.ceil((new Date(t.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderBottom: '1px solid var(--b1)', cursor: 'pointer' }}>
                  <div className="av" style={{ width: 28, height: 28, fontSize: 10, background: 'var(--blue)' }}>{getInitials(t.owner?.name || 'T')}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                    <div style={{ fontSize: 10, color: 'var(--t3)' }}>{t.owner?.name} · {t.department || '—'}</div>
                  </div>
                  <span className="badge b-blue" style={{ fontSize: 9, flexShrink: 0 }}>in {daysLeft}d</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Department Breakdown */}
      <div className="lcard" style={{ marginBottom: 14 }}>
        <div className="ch"><div className="ct">🏢 Department Breakdown</div><span className="badge b-gold" style={{ fontSize: 10 }}>Live</span></div>
        <div className="cb">
          {Object.entries(dash?.deptMap || {}).length === 0 ? (
            <div className="empty"><p>No department data yet</p></div>
          ) : Object.entries(dash?.deptMap || {}).map(([name, v]: [string, any]) => {
            const rate = v.total > 0 ? Math.round((v.done / v.total) * 100) : 0
            return (
              <div key={name} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{name}</span>
                  <span style={{ fontSize: 11, color: 'var(--t3)' }}>{v.done}/{v.total} done · {rate}% · {v.overdue} overdue</span>
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

      {/* Recent Activity */}
      <div className="lcard" style={{ marginBottom: 14 }}>
        <div className="ch"><div className="ct">🕐 Recent Activity</div><span className="badge b-gold" style={{ fontSize: 10 }}>Live</span></div>
        <div className="cb">
          {(dash?.recentActivities || []).length === 0 ? (
            <div className="empty"><p>No recent activity</p></div>
          ) : (dash?.recentActivities || []).slice(0, 8).map((a: any) => (
            <div key={a.id} className="feed-item">
              <div className="feed-dot" style={{ background: 'var(--g2)' }} />
              <div className="feed-body">
                <div className="feed-text"><strong>{a.workflow?.title || 'Workflow'}</strong> — {statusLabels[a.fromStatus] || a.fromStatus} → {statusLabels[a.toStatus] || a.toStatus}</div>
                <div className="feed-time">{a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

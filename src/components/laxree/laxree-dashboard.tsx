'use client'

import { useQuery } from '@tanstack/react-query'
import { useWorkflowStore } from '@/stores/workflow-store'

interface DashboardData {
  statusCounts: Record<string, number>
  totalWorkflows: number
  pendingApprovals: number
  activeTasks: number
  overdueTasks: number
  escalationCount: number
  completionRate: number
  recentActivities: any[]
}

interface User {
  id: string; name: string; email: string; role: string; department: string | null
}

export function LaxreeDashboard() {
  const { currentUser, setActivePage } = useWorkflowStore()

  const { data: dash, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard?userId=user-admin').then(r => r.json()),
  })

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
  })

  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows-dash'],
    queryFn: () => fetch('/api/workflows').then(r => r.json()),
  })

  if (isLoading) return <div style={{ padding: 40, color: 'var(--t3)' }}>Loading dashboard...</div>

  const total = dash?.totalWorkflows || 0
  const completed = dash?.statusCounts?.COMPLETED || 0
  const overdue = dash?.overdueTasks || 0
  const pending = dash?.pendingApprovals || 0
  const completionRate = dash?.completionRate || 0
  const effScore = Math.max(0, completionRate - Math.round(overdue / (total || 1) * 10))

  const today = new Date().toISOString().split('T')[0]
  const in7 = new Date(); in7.setDate(in7.getDate() + 7)
  const in7Str = in7.toISOString().split('T')[0]

  const todayTasks = workflows.filter((w: any) => w.dueDate?.substring(0, 10) === today && w.status !== 'COMPLETED' && w.status !== 'CANCELLED')
  const upcomingTasks = workflows.filter((w: any) => w.dueDate?.substring(0, 10) > today && w.dueDate?.substring(0, 10) <= in7Str && w.status !== 'COMPLETED' && w.status !== 'CANCELLED')

  const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
  const scoreColor = (s: number) => s >= 70 ? 'var(--green)' : s >= 40 ? 'var(--amber)' : 'var(--red)'

  const memberScores = users.filter(u => u.role !== 'DIRECTOR').map(u => {
    const uTasks = workflows.filter((w: any) => {
      const creator = u.name
      return w.creatorId === u.id || w.title?.includes(creator)
    })
    const done = uTasks.filter((t: any) => t.status === 'COMPLETED').length
    const rate = uTasks.length ? Math.round(done / uTasks.length * 100) : 0
    const score = Math.max(0, rate)
    return { user: u, total: uTasks.length, done, score }
  }).sort((a, b) => b.score - a.score).slice(0, 8)

  const statusLabels: Record<string, string> = {
    DRAFT: 'Draft', PENDING: 'Pending', IN_REVIEW: 'In Review', APPROVED: 'Approved',
    REJECTED: 'Rejected', IN_PROGRESS: 'In Progress', ON_HOLD: 'On Hold',
    ESCALATED: 'Escalated', COMPLETED: 'Completed', CANCELLED: 'Cancelled', EXTERNAL_HOLD: 'External Hold',
  }

  return (
    <>
      <div className="ph">
        <div className="ph-left">
          <h2>Welcome back, <span style={{ color: 'var(--g2)' }}>{currentUser?.name || 'Admin'}</span> 👋</h2>
          <p>Live operations overview · <span style={{ color: 'var(--g2)', fontWeight: 700 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </span></p>
        </div>
      </div>

      {/* Approval Alert */}
      {pending > 0 && (
        <div className="alert alert-gold">
          <div className="alert-icon">🔔</div>
          <div className="alert-body">
            <div className="alert-title" style={{ color: 'var(--g2)' }}>Pending Approvals Required</div>
            <div className="alert-sub">Employee completions awaiting your review</div>
          </div>
          <span className="alert-cnt">{pending}</span>
          <button className="btn btn-gold btn-sm" onClick={() => setActivePage('approvals')}>Review →</button>
        </div>
      )}

      {/* Overdue Alert */}
      {overdue > 0 && (
        <div className="alert alert-red">
          <div className="alert-icon">🚨</div>
          <div className="alert-body">
            <div className="alert-title" style={{ color: 'var(--red)' }}>Critical Escalations Active</div>
            <div className="alert-sub">{overdue} task(s) are past due date — immediate attention needed</div>
          </div>
          <button className="btn btn-red btn-sm" onClick={() => setActivePage('escalations')}>View →</button>
        </div>
      )}

      {/* 4 KPI Stats */}
      <div className="stat-grid sg-4" style={{ marginBottom: 12 }}>
        <div className="sc lux-border" style={{ cursor: 'pointer' }} onClick={() => setActivePage('tasks')}>
          <div className="sc-accent" style={{ background: 'var(--red)' }} />
          <div className="sc-top">
            <div><div className="sc-label">🔴 Overdue Tasks</div><div className="sc-val" style={{ color: 'var(--red)' }}>{overdue}</div></div>
            <div className="sc-icon" style={{ background: 'var(--red-m)' }}>⚠</div>
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
            <div><div className="sc-label">📌 Upcoming Tasks</div><div className="sc-val" style={{ color: 'var(--blue)' }}>{upcomingTasks.length}</div></div>
            <div className="sc-icon" style={{ background: 'var(--blue-m)' }}>🗓</div>
          </div>
          <div className="sc-sub">Next 7 days</div>
          <div className="sc-bar"><div className="sc-bar-fill" style={{ width: `${Math.min(100, upcomingTasks.length * 7)}%`, background: 'var(--blue)' }} /></div>
        </div>
        <div className="sc lux-border">
          <div className="sc-accent" style={{ background: 'var(--green)' }} />
          <div className="sc-top">
            <div><div className="sc-label">🟢 Performance Score</div><div className="sc-val" style={{ color: 'var(--g2)' }}>{effScore}%</div></div>
            <div className="sc-icon" style={{ background: 'var(--gb)' }}>📈</div>
          </div>
          <div className="sc-sub">{effScore >= 70 ? 'Excellent performance 🎉' : effScore >= 40 ? 'On track — watch overdue' : 'Needs attention ⚠'}</div>
          <div className="sc-bar"><div className="sc-bar-fill" style={{ width: `${effScore}%`, background: 'var(--g2)' }} /></div>
        </div>
      </div>

      {/* Performance Score Board */}
      <div className="card" style={{ marginBottom: 14, padding: '14px 16px', background: 'linear-gradient(135deg, var(--g5), var(--card))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--g2)' }}>📊 Performance Score Board</div>
          <span style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 700 }}>🟢 ≥70 Excellent &nbsp;|&nbsp; 🟡 40–69 On Track &nbsp;|&nbsp; 🔴 &lt;40 Needs Attention</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
          {memberScores.map(({ user, done, total: t, score }) => (
            <div key={user.id} style={{
              background: 'var(--card)', border: '1.5px solid var(--b1)', borderRadius: 'var(--r-sm)',
              padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div className="av" style={{
                background: ['var(--g1)', 'var(--purple)', 'var(--blue)', 'var(--teal)', 'var(--amber)', 'var(--green)'][Math.floor(Math.random() * 6)],
              }}>{getInitials(user.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                <div style={{ fontSize: 10, color: 'var(--t3)' }}>{done}/{t} done</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: scoreColor(score) }}>{score}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Performance Table + AI Insights */}
      <div className="g-70-30" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="ch">
            <div className="ct">⚡ Weekly Team Performance</div>
            <span className="badge b-gold" style={{ fontSize: 10 }}>Live</span>
          </div>
          <div className="tw">
            <table>
              <thead><tr><th>Member</th><th>Dept</th><th>Role</th><th>Score</th></tr></thead>
              <tbody>
                {users.filter(u => u.role !== 'DIRECTOR').slice(0, 8).map(u => (
                  <tr key={u.id}>
                    <td><div className="flex">
                      <div className="av" style={{ background: 'var(--g1)' }}>{getInitials(u.name)}</div>
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                    </div></td>
                    <td><span className="badge b-gray" style={{ fontSize: 10 }}>{u.department || '—'}</span></td>
                    <td>{u.role}</td>
                    <td><span style={{ fontWeight: 800, color: 'var(--g2)' }}>—</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="ai-widget">
          <div className="ai-label"><div className="ai-pulse" />AI Intelligence Engine</div>
          <div id="aiInsightsFeed">
            <div className="ai-item">
              <div className="ai-bullet" style={{ background: completionRate >= 70 ? 'var(--green)' : 'var(--red)' }} />
              <div className="ai-text"><strong>Completion Rate: {completionRate}%</strong> — {completionRate >= 70 ? 'Healthy output across departments.' : 'Below target. Consider workload redistribution.'}</div>
            </div>
            {overdue > 0 && (
              <div className="ai-item">
                <div className="ai-bullet" style={{ background: 'var(--red)' }} />
                <div className="ai-text"><strong>{overdue} Overdue Task(s)</strong> — Immediate attention required. Consider escalation protocols.</div>
              </div>
            )}
            {pending > 0 && (
              <div className="ai-item">
                <div className="ai-bullet" style={{ background: 'var(--amber)' }} />
                <div className="ai-text"><strong>{pending} Pending Approval(s)</strong> — EA review queue is growing. Prioritize approvals.</div>
              </div>
            )}
            <div className="ai-item">
              <div className="ai-bullet" style={{ background: 'var(--green)' }} />
              <div className="ai-text"><strong>{users.length} Active Members</strong> — Team is operational across {['Sales', 'Back Office', 'Accounts'].length} departments.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Today + Upcoming Tasks */}
      <div className="g2" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="ch">
            <div className="ct">📅 Today&apos;s Tasks</div>
            <span className="badge b-amber" style={{ fontSize: 10 }}>{todayTasks.length}</span>
          </div>
          <div className="cb">
            {todayTasks.length === 0 ? (
              <div className="empty" style={{ padding: 20 }}><p>No tasks due today 🎉</p></div>
            ) : todayTasks.slice(0, 5).map((t: any) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderBottom: '1px solid var(--b1)', cursor: 'pointer' }}>
                <div className="av" style={{ background: 'var(--g2)' }}>{getInitials(t.title || 'T')}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>{statusLabels[t.status] || t.status}</div>
                </div>
                <span className={`badge s-${t.status?.toLowerCase()}`} style={{ fontSize: 10, flexShrink: 0 }}>{statusLabels[t.status] || t.status}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="ch">
            <div className="ct">📌 Upcoming Tasks</div>
            <span className="badge b-blue" style={{ fontSize: 10 }}>{upcomingTasks.length}</span>
          </div>
          <div className="cb">
            {upcomingTasks.length === 0 ? (
              <div className="empty" style={{ padding: 20 }}><p>No upcoming tasks in next 7 days</p></div>
            ) : upcomingTasks.slice(0, 5).map((t: any) => {
              const daysLeft = Math.ceil((new Date(t.dueDate) - new Date()) / (1000 * 60 * 60 * 24))
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderBottom: '1px solid var(--b1)', cursor: 'pointer' }}>
                  <div className="av" style={{ background: 'var(--blue)' }}>{getInitials(t.title || 'T')}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--t3)' }}>{statusLabels[t.status] || t.status}</div>
                  </div>
                  <span className="badge b-blue" style={{ fontSize: 10, flexShrink: 0 }}>in {daysLeft}d</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="ch"><div className="ct">📊 Status Distribution</div></div>
        <div className="cb">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {Object.entries(dash?.statusCounts || {}).filter(([, v]) => v > 0).map(([status, count]) => (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--bg2)', borderRadius: 'var(--r-sm)', border: '1px solid var(--b1)' }}>
                <span className={`badge s-${status.toLowerCase()}`} style={{ fontSize: 10 }}>{statusLabels[status] || status}</span>
                <span style={{ fontWeight: 800, fontSize: 14 }}>{count}</span>
              </div>
            ))}
          </div>
          {/* Visual bar */}
          <div style={{ marginTop: 16 }}>
            {Object.entries(dash?.statusCounts || {}).filter(([, v]) => v > 0).map(([status, count]) => {
              const pct = total ? Math.round(count / total * 100) : 0
              const colors: Record<string, string> = {
                COMPLETED: 'var(--green)', PENDING: 'var(--amber)', IN_REVIEW: 'var(--blue)',
                IN_PROGRESS: 'var(--teal)', ON_HOLD: 'var(--purple)', ESCALATED: 'var(--red)',
                CANCELLED: 'var(--t3)', EXTERNAL_HOLD: '#C2410C', APPROVED: 'var(--green)',
                REJECTED: 'var(--red)', DRAFT: 'var(--t4)',
              }
              return (
                <div key={status} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                    <span style={{ color: 'var(--t2)', fontWeight: 600 }}>{statusLabels[status] || status}</span>
                    <span style={{ fontWeight: 700, color: colors[status] || 'var(--t2)' }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--b1)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: colors[status] || 'var(--t2)', borderRadius: 3, transition: 'width .5s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card" style={{ marginBottom: 14 }}>
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

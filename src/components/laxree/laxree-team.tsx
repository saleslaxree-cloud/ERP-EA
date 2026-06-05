'use client'

import { useQuery } from '@tanstack/react-query'

export function LaxreeTeam() {
  const { data: users = [] } = useQuery({
    queryKey: ['users-team'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
  })

  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows-team'],
    queryFn: () => fetch('/api/workflows').then(r => r.json()),
  })

  const getInitials = (name: string) => name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '?'

  const colors = ['#B8860B', '#D97706', '#F0C040', '#7C3AED', '#2563EB', '#0891B2', '#16A34A', '#DC2626', '#65A30D', '#9333EA', '#0369A1', '#BE123C', '#0F766E', '#1D4ED8']

  const roleBadge: Record<string, string> = {
    ADMIN: 'b-gold', DIRECTOR: 'b-purple', EA: 'b-green', MANAGER: 'b-blue', EMPLOYEE: 'b-gray',
  }

  return (
    <>
      <div className="ph">
        <div className="ph-left">
          <h2>Team Members</h2>
          <p>Organization directory and performance overview</p>
        </div>
      </div>
      <div className="page-accent" />

      <div className="mc-grid">
        {users.map((u: any, idx: number) => {
          const uWorkflows = workflows.filter((w: any) => w.creatorId === u.id)
          const done = uWorkflows.filter((w: any) => w.status === 'COMPLETED').length
          const active = uWorkflows.filter((w: any) => w.status !== 'COMPLETED' && w.status !== 'CANCELLED').length

          return (
            <div className="mc" key={u.id}>
              <div className="mc-top">
                <div className="av" style={{ background: colors[idx % colors.length], width: 36, height: 36, fontSize: 13 }}>
                  {getInitials(u.name)}
                </div>
                <div className="mc-info">
                  <div className="mc-name">{u.name}</div>
                  <div className="mc-role">{u.department || '—'} · <span className={`badge ${roleBadge[u.role] || 'b-gray'}`} style={{ fontSize: 9 }}>{u.role}</span></div>
                </div>
              </div>
              <div className="mc-stat"><span>Active</span><span>{active}</span></div>
              <div className="mc-stat"><span>Completed</span><span>{done}</span></div>
              <div className="mc-stat"><span>Total</span><span>{uWorkflows.length}</span></div>
              <div className="mc-score">
                <div style={{ height: 6, flex: 1, background: 'var(--b1)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${uWorkflows.length ? Math.round(done / uWorkflows.length * 100) : 0}%`, background: 'var(--g2)', borderRadius: 3 }} />
                </div>
                <span style={{ color: 'var(--g2)' }}>{uWorkflows.length ? Math.round(done / uWorkflows.length * 100) : 0}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

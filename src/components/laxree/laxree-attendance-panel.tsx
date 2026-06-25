'use client'

// ════════════════════════════════════════════════════════════════════════
// v24·0625 — LaxreeAttendancePanel
// ════════════════════════════════════════════════════════════════════════
// Embedded inside Employee + EA dashboards. Provides:
//   1. Read-only monthly attendance view (sourced live from HRMS via bridge)
//   2. "Raise Attendance Query" form (writes to ERP AttendanceQuery table)
//   3. List of user's past queries with HR replies
//
// SAFETY: This component NEVER writes to attendance. It only:
//   - READS from /api/attendance/bridge (which reads from HRMS, read-only)
//   - WRITES to /api/attendance-queries (a NEW table — additive only)
// ════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWorkflowStore } from '@/stores/workflow-store'
import { useState } from 'react'

export function LaxreeAttendancePanel() {
  const { currentUserId, addToast } = useWorkflowStore()
  const queryClient = useQueryClient()

  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  // ─── Live attendance data (read-only from HRMS via bridge) ───
  const { data: attData, isLoading: attLoading } = useQuery({
    queryKey: ['attendance-bridge', currentUserId, month, year],
    queryFn: () =>
      fetch(`/api/attendance/bridge?userId=${currentUserId}&month=${month}&year=${year}`).then(r => r.json()),
    enabled: !!currentUserId,
  })

  // ─── User's existing attendance queries ───
  const { data: queriesData, isLoading: queriesLoading } = useQuery({
    queryKey: ['attendance-queries', currentUserId],
    queryFn: () =>
      fetch(`/api/attendance-queries?userId=${currentUserId}`).then(r => r.json()),
    enabled: !!currentUserId,
  })

  // ─── New query form state ───
  const [queryText, setQueryText] = useState('')
  const [queryMonth, setQueryMonth] = useState(month)
  const [queryYear, setQueryYear] = useState(year)

  // ─── Submit new query ───
  const submitMutation = useMutation({
    mutationFn: (body: any) =>
      fetch('/api/attendance-queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-queries', currentUserId] })
      addToast('ok', 'Attendance query raised — HR will respond soon')
      setQueryText('')
    },
    onError: (err: any) => {
      addToast('err', `Failed to raise query: ${err?.message || 'unknown error'}`)
    },
  })

  const att: any = attData || {}
  const summary: any = att.summary || null
  const employee: any = att.employee || null
  const records: any[] = Array.isArray(att.records) ? att.records : []
  const queries: any[] = (queriesData as any)?.queries || []

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return (
    <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'minmax(0, 1fr)' }}>
      {/* ─── Header + month picker ─── */}
      <div className="lcard">
        <div className="ch">
          <div className="ct">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--g2)' }}>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            My Attendance
            <span style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 500, marginLeft: 4 }}>
              (read-only · from HRMS)
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--b1)', background: 'var(--bg)', color: 'var(--t1)', fontSize: 11, fontWeight: 600, cursor: 'pointer', outline: 'none' }}
            >
              {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--b1)', background: 'var(--bg)', color: 'var(--t1)', fontSize: 11, fontWeight: 600, cursor: 'pointer', outline: 'none' }}
            >
              {[0, 1, 2].map(off => {
                const y = now.getFullYear() - off
                return <option key={y} value={y}>{y}</option>
              })}
            </select>
          </div>
        </div>
        <div className="cb">
          {attLoading ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>Loading attendance…</div>
          ) : att.configured === false ? (
            // v24·0625: Bridge not configured on the ERP server. Show clear,
            // actionable instructions instead of a generic error.
            <div style={{
              padding: 18, fontSize: 12, background: 'var(--amber-l)', borderRadius: 8,
              border: '1px solid var(--amber-m)', color: 'var(--t1)',
            }}>
              <div style={{ fontWeight: 800, color: 'var(--amber)', marginBottom: 6, fontSize: 13 }}>
                ⚠ HRMS bridge is not configured yet
              </div>
              <div style={{ color: 'var(--t2)', lineHeight: 1.6, marginBottom: 10 }}>
                Your ERP admin needs to set two environment variables on the ERP server (Vercel) for the live attendance feed to work:
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--t2)', lineHeight: 1.7 }}>
                <li><code style={{ background: 'var(--bg)', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>HRMS_BRIDGE_URL</code> — base URL of the HRMS deployment</li>
                <li><code style={{ background: 'var(--bg)', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>HRMS_BRIDGE_API_KEY</code> — shared secret matching HRMS</li>
              </ul>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--amber-m)', color: 'var(--t3)', fontSize: 11 }}>
                Meanwhile, you can still raise attendance queries below — HR will see them in HRMS and respond.
              </div>
            </div>
          ) : att.error ? (
            // v24·0625: Bridge is configured but returned an error.
            // v24·0625-fix: When the error is specifically "401", the cause is almost
            // always env-var mismatch between ERP and HRMS Vercel projects (the shared
            // secret HRMS_BRIDGE_API_KEY must be IDENTICAL on both sides, AND both
            // projects must have been redeployed AFTER the env vars were set).
            (() => {
              const is401 = String(att.error).includes('401')
              return (
                <div style={{
                  padding: 18, fontSize: 12, background: 'var(--red-l)', borderRadius: 8,
                  border: '1px solid var(--red-m)', color: 'var(--t1)',
                }}>
                  <div style={{ fontWeight: 800, color: 'var(--red)', marginBottom: 6, fontSize: 13 }}>
                    ⚠ Could not fetch attendance from HRMS
                  </div>
                  <div style={{ color: 'var(--t2)', marginBottom: 8 }}>{att.error}</div>
                  {is401 ? (
                    <div style={{ color: 'var(--t3)', fontSize: 11, lineHeight: 1.6 }}>
                      <strong style={{ color: 'var(--t2)' }}>Auth mismatch (HTTP 401).</strong> The ERP
                      server reached HRMS, but HRMS rejected the shared secret. This almost always means:
                      <ul style={{ margin: '6px 0 6px 18px', padding: 0 }}>
                        <li>The <code style={{ background: 'var(--bg)', padding: '1px 5px', borderRadius: 4 }}>HRMS_BRIDGE_API_KEY</code> value on ERP Vercel ≠ the value on HRMS Vercel, OR</li>
                        <li>One of the Vercel projects has NOT been redeployed since the env var was added (Vercel only applies env vars on the NEXT deploy), OR</li>
                        <li>The env var was set only for "Preview" environment but the production URL is being hit.</li>
                      </ul>
                      <div style={{ marginTop: 6 }}>
                        Fix: confirm both Vercel projects have <code style={{ background: 'var(--bg)', padding: '1px 5px', borderRadius: 4 }}>HRMS_BRIDGE_API_KEY</code> set
                        to the same value for the <strong>Production</strong> environment, then trigger a redeploy on both projects.
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--t3)', fontSize: 11, lineHeight: 1.6 }}>
                      Likely causes: HRMS deployment is sleeping / cold-starting (retry in 30s),
                      or your ERP user's email/phone doesn't match any HRMS employee record.
                      Please contact HR if the problem persists.
                    </div>
                  )}
                  <button
                    className="btn"
                    style={{ marginTop: 10, padding: '5px 12px', fontSize: 11, fontWeight: 700 }}
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['attendance-bridge', currentUserId, month, year] })}
                  >
                    ↻ Retry now
                  </button>
                </div>
              )
            })()
          ) : !employee ? (
            <div style={{
              padding: 18, textAlign: 'center', color: 'var(--t3)', fontSize: 12,
              background: 'var(--bg2)', borderRadius: 8,
            }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>🔍</div>
              <div style={{ fontWeight: 700, color: 'var(--t2)', marginBottom: 4 }}>No HRMS record linked</div>
              <div>
                No HRMS employee matches your ERP email or phone. Please contact HR to update your contact details in HRMS.
              </div>
            </div>
          ) : (
            <>
              {/* Employee identity strip */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14, padding: 10, background: 'var(--bg)', borderRadius: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gb)', color: 'var(--g2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                  {(employee.fullName || '?').slice(0, 1).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{employee.fullName}</div>
                  <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>
                    ID: {employee.employeeId} · {employee.department || '—'} · {employee.designation || '—'}
                  </div>
                </div>
              </div>

              {/* Summary cards */}
              {summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginBottom: 14 }}>
                  <StatTile label="Present" value={summary.present ?? 0} bg="var(--green-l)" color="var(--green)" />
                  <StatTile label="Absent" value={summary.absent ?? 0} bg="var(--red-l)" color="var(--red)" />
                  <StatTile label="Late" value={summary.late ?? 0} bg="var(--amber-l)" color="var(--amber)" />
                  <StatTile label="Half Day" value={summary.halfDay ?? 0} bg="#FEF3C7" color="#92400E" />
                  <StatTile label="Early Out" value={summary.earlyOuts ?? 0} bg="#EDE9FE" color="#6D28D9" />
                  <StatTile label="Overtime hrs" value={summary.totalOvertimeHours ?? 0} bg="var(--blue-l)" color="var(--blue)" />
                </div>
              )}

              {/* Daily records table (scrollable on mobile) */}
              {records.length > 0 ? (
                <div className="tw" style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--b1)', borderRadius: 8 }}>
                  <table className="ltable" style={{ width: '100%', fontSize: 11 }}>
                    <thead style={{ background: 'var(--bg)', position: 'sticky', top: 0 }}>
                      <tr>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--t2)' }}>Date</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--t2)' }}>Check-In</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--t2)' }}>Check-Out</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--t2)' }}>Hours</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--t2)' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r: any, i: number) => (
                        <tr key={i} style={{ borderTop: '1px solid var(--b1)' }}>
                          <td style={{ padding: '7px 10px', color: 'var(--t1)' }}>
                            {new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </td>
                          <td style={{ padding: '7px 10px', color: 'var(--t2)' }}>{r.checkIn || '—'}</td>
                          <td style={{ padding: '7px 10px', color: 'var(--t2)' }}>{r.checkOut || '—'}</td>
                          <td style={{ padding: '7px 10px', color: 'var(--t2)' }}>{r.totalHours || 0}</td>
                          <td style={{ padding: '7px 10px' }}>
                            <span style={{
                              padding: '2px 7px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                              background:
                                r.status === 'present' ? 'var(--green-l)' :
                                r.status === 'absent' ? 'var(--red-l)' :
                                r.status === 'late' ? 'var(--amber-l)' :
                                r.status === 'half-day' ? '#FEF3C7' :
                                r.status === 'early-out' ? '#EDE9FE' : 'var(--bg2)',
                              color:
                                r.status === 'present' ? 'var(--green)' :
                                r.status === 'absent' ? 'var(--red)' :
                                r.status === 'late' ? 'var(--amber)' :
                                r.status === 'half-day' ? '#92400E' :
                                r.status === 'early-out' ? '#6D28D9' : 'var(--t2)',
                            }}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>
                  No attendance records found for this month.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── Raise a query + past queries ─── */}
      <div className="lcard">
        <div className="ch">
          <div className="ct">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--g2)' }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Raise Attendance Query
          </div>
        </div>
        <div className="cb">
          {/* Form */}
          <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5, width: '100%' }}>For Month / Year</label>
              <select
                value={queryMonth}
                onChange={e => setQueryMonth(Number(e.target.value))}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--b1)', background: 'var(--bg)', color: 'var(--t1)', fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none', flex: '1 1 100px' }}
              >
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select
                value={queryYear}
                onChange={e => setQueryYear(Number(e.target.value))}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--b1)', background: 'var(--bg)', color: 'var(--t1)', fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none', flex: '1 1 100px' }}
              >
                {[0, 1, 2].map(off => {
                  const y = now.getFullYear() - off
                  return <option key={y} value={y}>{y}</option>
                })}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Your Query</label>
              <textarea
                value={queryText}
                onChange={e => setQueryText(e.target.value)}
                placeholder="e.g., My check-in for 12 June is missing. Please verify."
                rows={3}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--b1)',
                  background: 'var(--bg)', color: 'var(--t1)', fontSize: 12.5,
                  fontFamily: "'DM Sans', sans-serif", outline: 'none', resize: 'vertical',
                }}
              />
            </div>
            <button
              className="btn btn-gold"
              disabled={!queryText.trim() || submitMutation.isPending}
              onClick={() => {
                if (!queryText.trim() || !currentUserId) return
                submitMutation.mutate({
                  userId: currentUserId,
                  queryMonth,
                  queryYear,
                  queryText: queryText.trim(),
                })
              }}
              style={{ justifySelf: 'start', padding: '8px 18px', fontSize: 12 }}
            >
              {submitMutation.isPending ? 'Submitting…' : 'Submit Query'}
            </button>
          </div>

          {/* Past queries */}
          <div style={{ borderTop: '1px solid var(--b1)', paddingTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              My Past Queries
            </div>
            {queriesLoading ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>Loading…</div>
            ) : queries.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>
                You haven't raised any attendance queries yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {queries.map((q: any) => (
                  <div key={q.id} style={{
                    padding: 10, border: '1px solid var(--b1)', borderRadius: 8,
                    background: 'var(--bg)', fontSize: 11.5,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                      <div style={{ fontWeight: 700, color: 'var(--t1)' }}>
                        {months[q.queryMonth - 1]} {q.queryYear}
                      </div>
                      <span style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: 9.5, fontWeight: 800,
                        background: q.status === 'OPEN' ? 'var(--amber-l)' : q.status === 'RESPONDED' ? 'var(--blue-l)' : 'var(--green-l)',
                        color: q.status === 'OPEN' ? 'var(--amber)' : q.status === 'RESPONDED' ? 'var(--blue)' : 'var(--green)',
                      }}>
                        {q.status}
                      </span>
                    </div>
                    <div style={{ color: 'var(--t2)', marginBottom: 6 }}>{q.queryText}</div>
                    {q.hrReply && (
                      <div style={{
                        padding: 8, background: 'var(--card)', borderRadius: 6, border: '1px solid var(--b1)',
                        fontSize: 11, color: 'var(--t2)',
                      }}>
                        <div style={{ fontSize: 9.5, fontWeight: 800, color: 'var(--green)', marginBottom: 3 }}>
                          HR Reply · {q.repliedBy || 'HR'} · {q.repliedAt ? new Date(q.repliedAt).toLocaleDateString('en-IN') : ''}
                        </div>
                        {q.hrReply}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Small stat tile ───
function StatTile({ label, value, bg, color }: { label: string; value: any; bg: string; color: string }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 8, background: bg, border: `1px solid ${color}22`,
    }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: color, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.85 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: color, marginTop: 2 }}>{value}</div>
    </div>
  )
}

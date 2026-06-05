'use client'

import { useWorkflowStore } from '@/stores/workflow-store'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo, useCallback } from 'react'

/* ═══════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
   ═══════════════════════════════════════════════════════════ */

// Get ISO week number from date
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// Get Monday of the week containing the date
function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

// Get Sunday of the week
function getSunday(date: Date): Date {
  const monday = getMonday(date)
  return new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000)
}

// Format date as DD/MM/YYYY
function formatDate(date: Date): string {
  const d = new Date(date)
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

// Calculate PR (Performance Rating) from scores
function calculatePR(actualGreen: number, actualYellow: number, actualRed: number): number {
  // PR is weighted: Green is good, Yellow is okay, Red is bad
  // Formula: (Green * 10 + Yellow * 5 + Red * 0) / 10 => gives 0-100
  const total = actualGreen + actualYellow + actualRed
  if (total === 0) return 0
  const score = (actualGreen * 10 + actualYellow * 5) / (total * 10 / 100)
  return Math.round(score * 10) / 10
}

// Get score color class
function scoreColor(value: number): string {
  if (value >= 70) return 'var(--green)'
  if (value >= 40) return 'var(--amber)'
  return 'var(--red)'
}

function scoreBg(value: number): string {
  if (value >= 70) return 'var(--green-l)'
  if (value >= 40) return 'var(--amber-l)'
  return 'var(--red-l)'
}

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

interface ScorecardData {
  id: string
  userId: string
  weekStartDate: string
  weekEndDate: string
  weekNumber: number
  year: number
  planRedScore: number
  planYellowScore: number
  planGreenScore: number
  actualRedScore: number
  actualYellowScore: number
  actualGreenScore: number
  nextRedScore: number
  nextYellowScore: number
  nextGreenScore: number
  prScore: number
  commitments: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    department: string | null
    designation: string | null
    phone: string | null
  }
}

interface FormData {
  planRedScore: number
  planYellowScore: number
  planGreenScore: number
  actualRedScore: number
  actualYellowScore: number
  actualGreenScore: number
  nextRedScore: number
  nextYellowScore: number
  nextGreenScore: number
  commitments: string
  notes: string
}

const emptyForm: FormData = {
  planRedScore: 0, planYellowScore: 0, planGreenScore: 0,
  actualRedScore: 0, actualYellowScore: 0, actualGreenScore: 0,
  nextRedScore: 0, nextYellowScore: 0, nextGreenScore: 0,
  commitments: '',
  notes: '',
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

export function LaxreeMonday() {
  const { addToast } = useWorkflowStore()
  const qc = useQueryClient()

  // State
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [weekOffset, setWeekOffset] = useState(0) // 0 = current week, -1 = last week, etc.
  const [form, setForm] = useState<FormData>({ ...emptyForm })
  const [saving, setSaving] = useState(false)

  // Computed week info
  const weekInfo = useMemo(() => {
    const now = new Date()
    const targetDate = new Date(now.getTime() + weekOffset * 7 * 24 * 60 * 60 * 1000)
    const monday = getMonday(targetDate)
    const sunday = getSunday(targetDate)
    const weekNum = getWeekNumber(targetDate)
    const year = targetDate.getFullYear()
    return { monday, sunday, weekNum, year, targetDate }
  }, [weekOffset])

  // Fetch users (employees only - no directors)
  const { data: usersData = [] } = useQuery({
    queryKey: ['users-monday'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
  })
  const users: any[] = Array.isArray(usersData) ? usersData : []

  // Filter users: employees, managers, EA, admin - exclude directors
  const doers = users.filter((u: any) => u.role !== 'DIRECTOR' && u.isActive)

  // Fetch scorecards for selected user
  const { data: scorecardsData = [], isLoading: scorecardsLoading } = useQuery({
    queryKey: ['monday-meeting', selectedUserId],
    queryFn: () => selectedUserId
      ? fetch(`/api/monday-meeting?userId=${selectedUserId}`).then(r => r.json())
      : Promise.resolve([]),
    enabled: !!selectedUserId,
  })
  const scorecards: ScorecardData[] = Array.isArray(scorecardsData) ? scorecardsData : []

  // Find current week scorecard
  const currentWeekScorecard = useMemo(() => {
    return scorecards.find((s: ScorecardData) =>
      s.weekNumber === weekInfo.weekNum && s.year === weekInfo.year
    )
  }, [scorecards, weekInfo])

  // Load form when scorecard is found
  const loadFormFromScorecard = useCallback((sc: ScorecardData | undefined) => {
    if (sc) {
      setForm({
        planRedScore: sc.planRedScore || 0,
        planYellowScore: sc.planYellowScore || 0,
        planGreenScore: sc.planGreenScore || 0,
        actualRedScore: sc.actualRedScore || 0,
        actualYellowScore: sc.actualYellowScore || 0,
        actualGreenScore: sc.actualGreenScore || 0,
        nextRedScore: sc.nextRedScore || 0,
        nextYellowScore: sc.nextYellowScore || 0,
        nextGreenScore: sc.nextGreenScore || 0,
        commitments: sc.commitments || '',
        notes: sc.notes || '',
      })
    } else {
      setForm({ ...emptyForm })
    }
  }, [])

  // Load form when currentWeekScorecard changes
  useMemo(() => {
    loadFormFromScorecard(currentWeekScorecard)
  }, [currentWeekScorecard, loadFormFromScorecard])

  // Fetch dashboard data for PR calculation
  const { data: dashData } = useQuery({
    queryKey: ['dashboard', selectedUserId],
    queryFn: () => selectedUserId
      ? fetch(`/api/dashboard?userId=${selectedUserId}`).then(r => r.json())
      : Promise.resolve(null),
    enabled: !!selectedUserId,
  })

  // Auto-calculate PR from task performance
  const autoPR = useMemo(() => {
    if (!dashData) return 0
    const d = dashData as any
    const userPerf = (d?.userPerformance || []).find((u: any) => u.id === selectedUserId)
    if (userPerf) return userPerf.score || 0
    // Fallback: calculate from scores
    return calculatePR(form.actualGreenScore, form.actualYellowScore, form.actualRedScore)
  }, [dashData, selectedUserId, form.actualGreenScore, form.actualYellowScore, form.actualRedScore])

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      setSaving(true)
      const prScore = autoPR || calculatePR(form.actualGreenScore, form.actualYellowScore, form.actualRedScore)
      const res = await fetch('/api/monday-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          weekStartDate: weekInfo.monday.toISOString(),
          weekEndDate: weekInfo.sunday.toISOString(),
          weekNumber: weekInfo.weekNum,
          year: weekInfo.year,
          planRedScore: form.planRedScore,
          planYellowScore: form.planYellowScore,
          planGreenScore: form.planGreenScore,
          actualRedScore: form.actualRedScore,
          actualYellowScore: form.actualYellowScore,
          actualGreenScore: form.actualGreenScore,
          nextRedScore: form.nextRedScore,
          nextYellowScore: form.nextYellowScore,
          nextGreenScore: form.nextGreenScore,
          prScore,
          commitments: form.commitments,
          notes: form.notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monday-meeting', selectedUserId] })
      addToast('ok', `Scorecard saved for ${weekInfo.weekNum} - Week ${weekInfo.year}`)
      setSaving(false)
    },
    onError: (err: any) => {
      addToast('err', `Save failed: ${err.message}`)
      setSaving(false)
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/monday-meeting?id=${id}`, { method: 'DELETE' })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monday-meeting', selectedUserId] })
      addToast('info', 'Scorecard deleted')
    },
  })

  // Update form field
  const updateField = (field: keyof FormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // Get past week scorecards for the selected user
  const pastWeeks = scorecards
    .filter((s: ScorecardData) => !(s.weekNumber === weekInfo.weekNum && s.year === weekInfo.year))
    .slice(0, 8) // Last 8 weeks

  const selectedUser = doers.find((u: any) => u.id === selectedUserId)

  return (
    <div>
      {/* Page Header */}
      <div className="ph">
        <div className="ph-left">
          <h2>Monday Meeting</h2>
          <p>Weekly performance scorecard &amp; commitment tracker</p>
        </div>
        <div className="ph-right">
          <span className="badge b-gold">Week {weekInfo.weekNum}</span>
        </div>
      </div>
      <div className="page-accent" />

      {/* Top Controls: User Selection + Week Navigation */}
      <div className="lcard" style={{ marginBottom: 14 }}>
        <div className="cb" style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Doer Name Selector */}
            <div style={{ flex: '1 1 260px', minWidth: 200 }}>
              <label style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--t3)', marginBottom: 5, display: 'block' }}>
                Select Doer Name
              </label>
              <select
                className="fi"
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                style={{ fontWeight: 700, fontSize: 14 }}
              >
                <option value="">-- Select Team Member --</option>
                {doers.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.phone ? `- ${u.phone.slice(-4)}` : ''} ({u.department || 'No Dept'})
                  </option>
                ))}
              </select>
            </div>

            {/* Week Navigation */}
            <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(w => w - 1)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                Prev
              </button>
              <div style={{ textAlign: 'center', minWidth: 180 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}>
                  Week {weekInfo.weekNum}
                </div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                  {formatDate(weekInfo.monday)} — {formatDate(weekInfo.sunday)}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(w => Math.min(w + 1, 0))}>
                Next
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </button>
              {weekOffset !== 0 && (
                <button className="btn btn-xs btn-out" onClick={() => setWeekOffset(0)}>
                  Current Week
                </button>
              )}
            </div>

            {/* PR Score Badge */}
            {selectedUserId && (
              <div style={{
                flex: '0 0 auto',
                padding: '10px 18px',
                borderRadius: 'var(--r)',
                background: autoPR >= 70 ? 'var(--green-l)' : autoPR >= 40 ? 'var(--amber-l)' : autoPR > 0 ? 'var(--red-l)' : 'var(--bg2)',
                border: `1.5px solid ${autoPR >= 70 ? 'var(--green)' : autoPR >= 40 ? 'var(--amber)' : autoPR > 0 ? 'var(--red)' : 'var(--b2)'}`,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)' }}>PR Score</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: autoPR >= 70 ? 'var(--green)' : autoPR >= 40 ? 'var(--amber)' : autoPR > 0 ? 'var(--red)' : 'var(--t3)', lineHeight: 1.1 }}>
                  {autoPR > 0 ? autoPR : '—'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {!selectedUserId ? (
        /* Empty State */
        <div className="lcard">
          <div className="cb" style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', marginBottom: 6 }}>Select a Team Member</div>
            <div style={{ fontSize: 13, color: 'var(--t3)' }}>Choose a doer name above to view or create their weekly scorecard</div>
          </div>
        </div>
      ) : (
        <>
          {/* Scorecard Grid — Matching the uploaded image */}
          <div className="lcard" style={{ marginBottom: 14 }}>
            <div className="ch">
              <div className="ct">
                <span style={{ fontSize: 16, marginRight: 6 }}>📝</span>
                Weekly Scorecard — {selectedUser?.name}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span className="badge b-gold">Week {weekInfo.weekNum}</span>
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>{formatDate(weekInfo.monday)} — {formatDate(weekInfo.sunday)}</span>
              </div>
            </div>
            <div className="cb" style={{ padding: '10px 14px 18px' }}>
              {/* Scorecard Table — Image-matching layout */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                }}>
                  <thead>
                    <tr>
                      <th style={{
                        padding: '10px 14px',
                        textAlign: 'left',
                        fontSize: 10,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: 0.8,
                        color: 'var(--t3)',
                        borderBottom: '2px solid var(--b1)',
                        width: 160,
                      }}>
                        Category
                      </th>
                      <th style={{
                        padding: '10px 14px',
                        textAlign: 'center',
                        fontSize: 10,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: 0.8,
                        color: '#DC2626',
                        borderBottom: '2px solid #FEE2E2',
                        background: '#FEF2F2',
                        minWidth: 120,
                      }}>
                        🔴 Red Score
                      </th>
                      <th style={{
                        padding: '10px 14px',
                        textAlign: 'center',
                        fontSize: 10,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: 0.8,
                        color: '#D97706',
                        borderBottom: '2px solid #FEF3C7',
                        background: '#FFFBEB',
                        minWidth: 120,
                      }}>
                        🟡 Yellow Score
                      </th>
                      <th style={{
                        padding: '10px 14px',
                        textAlign: 'center',
                        fontSize: 10,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: 0.8,
                        color: '#15803D',
                        borderBottom: '2px solid #DCFCE7',
                        background: '#F0FDF4',
                        minWidth: 120,
                      }}>
                        🟢 Green Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* This Week Plan Row */}
                    <tr>
                      <td style={{
                        padding: '10px 14px',
                        fontWeight: 700,
                        borderBottom: '1px solid var(--b1)',
                        color: 'var(--t1)',
                      }}>
                        📋 This Week Plan
                      </td>
                      <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--b1)', textAlign: 'center', background: '#FEF2F288' }}>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={form.planRedScore || ''}
                          onChange={e => updateField('planRedScore', Number(e.target.value))}
                          style={{
                            width: 80, textAlign: 'center', padding: '6px 8px',
                            border: '1.5px solid #FCA5A5', borderRadius: 6,
                            fontSize: 13, fontWeight: 700, color: '#DC2626',
                            background: '#FFF', fontFamily: "'DM Sans', sans-serif",
                          }}
                        />
                        <span style={{ fontSize: 10, color: 'var(--t3)', marginLeft: 4 }}>%</span>
                      </td>
                      <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--b1)', textAlign: 'center', background: '#FFFBEB88' }}>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={form.planYellowScore || ''}
                          onChange={e => updateField('planYellowScore', Number(e.target.value))}
                          style={{
                            width: 80, textAlign: 'center', padding: '6px 8px',
                            border: '1.5px solid #FCD34D', borderRadius: 6,
                            fontSize: 13, fontWeight: 700, color: '#D97706',
                            background: '#FFF', fontFamily: "'DM Sans', sans-serif",
                          }}
                        />
                        <span style={{ fontSize: 10, color: 'var(--t3)', marginLeft: 4 }}>%</span>
                      </td>
                      <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--b1)', textAlign: 'center', background: '#F0FDF488' }}>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={form.planGreenScore || ''}
                          onChange={e => updateField('planGreenScore', Number(e.target.value))}
                          style={{
                            width: 80, textAlign: 'center', padding: '6px 8px',
                            border: '1.5px solid #86EFAC', borderRadius: 6,
                            fontSize: 13, fontWeight: 700, color: '#15803D',
                            background: '#FFF', fontFamily: "'DM Sans', sans-serif",
                          }}
                        />
                        <span style={{ fontSize: 10, color: 'var(--t3)', marginLeft: 4 }}>%</span>
                      </td>
                    </tr>

                    {/* Actual Score Row */}
                    <tr>
                      <td style={{
                        padding: '10px 14px',
                        fontWeight: 700,
                        borderBottom: '1px solid var(--b1)',
                        color: 'var(--t1)',
                      }}>
                        ✅ Actual Score
                      </td>
                      <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--b1)', textAlign: 'center', background: '#FEF2F288' }}>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={form.actualRedScore || ''}
                          onChange={e => updateField('actualRedScore', Number(e.target.value))}
                          style={{
                            width: 80, textAlign: 'center', padding: '6px 8px',
                            border: '1.5px solid #FCA5A5', borderRadius: 6,
                            fontSize: 13, fontWeight: 700, color: '#DC2626',
                            background: '#FFF', fontFamily: "'DM Sans', sans-serif",
                          }}
                        />
                        <span style={{ fontSize: 10, color: 'var(--t3)', marginLeft: 4 }}>%</span>
                      </td>
                      <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--b1)', textAlign: 'center', background: '#FFFBEB88' }}>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={form.actualYellowScore || ''}
                          onChange={e => updateField('actualYellowScore', Number(e.target.value))}
                          style={{
                            width: 80, textAlign: 'center', padding: '6px 8px',
                            border: '1.5px solid #FCD34D', borderRadius: 6,
                            fontSize: 13, fontWeight: 700, color: '#D97706',
                            background: '#FFF', fontFamily: "'DM Sans', sans-serif",
                          }}
                        />
                        <span style={{ fontSize: 10, color: 'var(--t3)', marginLeft: 4 }}>%</span>
                      </td>
                      <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--b1)', textAlign: 'center', background: '#F0FDF488' }}>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={form.actualGreenScore || ''}
                          onChange={e => updateField('actualGreenScore', Number(e.target.value))}
                          style={{
                            width: 80, textAlign: 'center', padding: '6px 8px',
                            border: '1.5px solid #86EFAC', borderRadius: 6,
                            fontSize: 13, fontWeight: 700, color: '#15803D',
                            background: '#FFF', fontFamily: "'DM Sans', sans-serif",
                          }}
                        />
                        <span style={{ fontSize: 10, color: 'var(--t3)', marginLeft: 4 }}>%</span>
                      </td>
                    </tr>

                    {/* Next Week Plan Row */}
                    <tr>
                      <td style={{
                        padding: '10px 14px',
                        fontWeight: 700,
                        borderBottom: 'none',
                        color: 'var(--t1)',
                      }}>
                        🎯 Next Week Plan
                      </td>
                      <td style={{ padding: '8px 14px', borderBottom: 'none', textAlign: 'center', background: '#FEF2F288' }}>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={form.nextRedScore || ''}
                          onChange={e => updateField('nextRedScore', Number(e.target.value))}
                          style={{
                            width: 80, textAlign: 'center', padding: '6px 8px',
                            border: '1.5px solid #FCA5A5', borderRadius: 6,
                            fontSize: 13, fontWeight: 700, color: '#DC2626',
                            background: '#FFF', fontFamily: "'DM Sans', sans-serif",
                          }}
                        />
                        <span style={{ fontSize: 10, color: 'var(--t3)', marginLeft: 4 }}>%</span>
                      </td>
                      <td style={{ padding: '8px 14px', borderBottom: 'none', textAlign: 'center', background: '#FFFBEB88' }}>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={form.nextYellowScore || ''}
                          onChange={e => updateField('nextYellowScore', Number(e.target.value))}
                          style={{
                            width: 80, textAlign: 'center', padding: '6px 8px',
                            border: '1.5px solid #FCD34D', borderRadius: 6,
                            fontSize: 13, fontWeight: 700, color: '#D97706',
                            background: '#FFF', fontFamily: "'DM Sans', sans-serif",
                          }}
                        />
                        <span style={{ fontSize: 10, color: 'var(--t3)', marginLeft: 4 }}>%</span>
                      </td>
                      <td style={{ padding: '8px 14px', borderBottom: 'none', textAlign: 'center', background: '#F0FDF488' }}>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={form.nextGreenScore || ''}
                          onChange={e => updateField('nextGreenScore', Number(e.target.value))}
                          style={{
                            width: 80, textAlign: 'center', padding: '6px 8px',
                            border: '1.5px solid #86EFAC', borderRadius: 6,
                            fontSize: 13, fontWeight: 700, color: '#15803D',
                            background: '#FFF', fontFamily: "'DM Sans', sans-serif",
                          }}
                        />
                        <span style={{ fontSize: 10, color: 'var(--t3)', marginLeft: 4 }}>%</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Visual Score Bar */}
              <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--bg)', borderRadius: 'var(--r-sm)' }}>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--t3)', marginBottom: 8 }}>
                  Actual Performance Distribution
                </div>
                <div style={{ display: 'flex', height: 24, borderRadius: 6, overflow: 'hidden', background: 'var(--b1)' }}>
                  {(() => {
                    const total = form.actualRedScore + form.actualYellowScore + form.actualGreenScore
                    if (total === 0) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--t4)' }}>Enter actual scores above</div>
                    const rPct = (form.actualRedScore / total) * 100
                    const yPct = (form.actualYellowScore / total) * 100
                    const gPct = (form.actualGreenScore / total) * 100
                    return (
                      <>
                        {rPct > 0 && <div style={{ width: `${rPct}%`, background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{rPct >= 10 ? `${rPct.toFixed(1)}%` : ''}</div>}
                        {yPct > 0 && <div style={{ width: `${yPct}%`, background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{yPct >= 10 ? `${yPct.toFixed(1)}%` : ''}</div>}
                        {gPct > 0 && <div style={{ width: `${gPct}%`, background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{gPct >= 10 ? `${gPct.toFixed(1)}%` : ''}</div>}
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* Commitments for Next Week */}
              <div style={{ marginTop: 14 }}>
                <label style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--t3)', marginBottom: 6, display: 'block' }}>
                  🎯 Commitments for Next Week
                </label>
                <textarea
                  className="fi"
                  value={form.commitments}
                  onChange={e => updateField('commitments', e.target.value)}
                  placeholder="Enter commitments for next week..."
                  rows={3}
                  style={{ resize: 'vertical', minHeight: 70 }}
                />
              </div>

              {/* Notes */}
              <div style={{ marginTop: 10 }}>
                <label style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--t3)', marginBottom: 6, display: 'block' }}>
                  📝 Notes / Remarks
                </label>
                <textarea
                  className="fi"
                  value={form.notes}
                  onChange={e => updateField('notes', e.target.value)}
                  placeholder="Any additional notes..."
                  rows={2}
                  style={{ resize: 'vertical', minHeight: 50 }}
                />
              </div>

              {/* Save Button + Warning */}
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <button
                  className="btn btn-gold"
                  style={{ padding: '12px 48px', fontSize: 14, fontWeight: 800 }}
                  onClick={() => saveMutation.mutate()}
                  disabled={saving || !selectedUserId}
                >
                  {saving ? '⏳ Saving...' : '💾 Save Scorecard'}
                </button>
                <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  ⚠ Don&apos;t press the save button twice
                </div>
              </div>
            </div>
          </div>

          {/* Past Week Performance History */}
          <div className="g2">
            <div className="lcard">
              <div className="ch">
                <div className="ct">📊 Past Week Performance</div>
                <span className="badge b-blue">{pastWeeks.length} weeks</span>
              </div>
              <div className="cb">
                {pastWeeks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 30, color: 'var(--t3)', fontSize: 12 }}>
                    No past scorecard data for {selectedUser?.name}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {pastWeeks.map((sc: ScorecardData) => {
                      const total = sc.actualRedScore + sc.actualYellowScore + sc.actualGreenScore
                      const rPct = total > 0 ? (sc.actualRedScore / total) * 100 : 0
                      const yPct = total > 0 ? (sc.actualYellowScore / total) * 100 : 0
                      const gPct = total > 0 ? (sc.actualGreenScore / total) * 100 : 0
                      return (
                        <div key={sc.id} style={{
                          padding: '10px 14px',
                          background: 'var(--bg)',
                          borderRadius: 'var(--r-sm)',
                          border: '1px solid var(--b1)',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>Week {sc.weekNumber}</span>
                              <span style={{ fontSize: 11, color: 'var(--t3)', marginLeft: 8 }}>
                                {formatDate(new Date(sc.weekStartDate))} — {formatDate(new Date(sc.weekEndDate))}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <span style={{
                                fontSize: 12, fontWeight: 800,
                                color: sc.prScore >= 70 ? 'var(--green)' : sc.prScore >= 40 ? 'var(--amber)' : 'var(--red)',
                              }}>
                                PR: {sc.prScore || '—'}
                              </span>
                              <button
                                className="btn btn-xs btn-ghost"
                                onClick={() => deleteMutation.mutate(sc.id)}
                                style={{ padding: '2px 6px', fontSize: 10, color: 'var(--red)' }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          {/* Mini bar */}
                          {total > 0 && (
                            <div style={{ display: 'flex', height: 14, borderRadius: 4, overflow: 'hidden' }}>
                              {rPct > 0 && <div style={{ width: `${rPct}%`, background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff' }}>{rPct >= 15 ? `${rPct.toFixed(0)}%` : ''}</div>}
                              {yPct > 0 && <div style={{ width: `${yPct}%`, background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff' }}>{yPct >= 15 ? `${yPct.toFixed(0)}%` : ''}</div>}
                              {gPct > 0 && <div style={{ width: `${gPct}%`, background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff' }}>{gPct >= 15 ? `${gPct.toFixed(0)}%` : ''}</div>}
                            </div>
                          )}
                          {/* Score details */}
                          <div style={{ display: 'flex', gap: 12, marginTop: 5, fontSize: 10, color: 'var(--t3)' }}>
                            <span style={{ color: '#EF4444', fontWeight: 700 }}>🔴 {sc.actualRedScore}%</span>
                            <span style={{ color: '#F59E0B', fontWeight: 700 }}>🟡 {sc.actualYellowScore}%</span>
                            <span style={{ color: '#22C55E', fontWeight: 700 }}>🟢 {sc.actualGreenScore}%</span>
                          </div>
                          {/* Commitments preview */}
                          {sc.commitments && (
                            <div style={{ marginTop: 5, fontSize: 11, color: 'var(--t2)', fontStyle: 'italic' }}>
                              🎯 {sc.commitments.length > 80 ? sc.commitments.slice(0, 80) + '...' : sc.commitments}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* All Team Members Quick View */}
            <div className="lcard">
              <div className="ch">
                <div className="ct">👥 Team Overview</div>
                <span className="badge b-gold">{doers.length} members</span>
              </div>
              <div className="cb" style={{ padding: 0 }}>
                <table className="ltable">
                  <thead>
                    <tr>
                      <th>Doer Name</th>
                      <th>Department</th>
                      <th>PR</th>
                      <th>Weeks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doers.map((u: any) => {
                      // Find if this user has scorecards in the loaded data
                      const userScorecards = scorecards.filter((s: ScorecardData) => s.userId === u.id)
                      // We need to fetch per-user data on demand; for now show basic info
                      const latestSC = userScorecards.length > 0 ? userScorecards[0] : null
                      const isSelected = u.id === selectedUserId
                      return (
                        <tr
                          key={u.id}
                          onClick={() => setSelectedUserId(u.id)}
                          style={{
                            cursor: 'pointer',
                            background: isSelected ? 'rgba(59,130,246,.06)' : undefined,
                          }}
                        >
                          <td style={{ fontWeight: 700 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: '50%',
                                background: isSelected ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'linear-gradient(135deg,var(--g1),var(--g3))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, fontWeight: 800, color: '#fff',
                              }}>
                                {u.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                              <div>
                                <div style={{ fontSize: 12.5 }}>{u.name}</div>
                                <div style={{ fontSize: 10, color: 'var(--t3)' }}>{u.phone || ''}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="badge b-gray" style={{ fontSize: 9 }}>{u.department || '—'}</span>
                          </td>
                          <td style={{ fontWeight: 800, color: latestSC ? (latestSC.prScore >= 70 ? 'var(--green)' : latestSC.prScore >= 40 ? 'var(--amber)' : 'var(--red)') : 'var(--t4)' }}>
                            {latestSC ? latestSC.prScore : '—'}
                          </td>
                          <td style={{ color: 'var(--t3)', fontSize: 11 }}>
                            {userScorecards.length > 0 ? `${userScorecards.length} saved` : 'No data'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

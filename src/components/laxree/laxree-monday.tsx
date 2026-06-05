'use client'

import { useWorkflowStore } from '@/stores/workflow-store'
import { useState } from 'react'

const MEMBERS = [
  'Sandeep', 'Khushboo Manglani', 'Aditya Sharma', 'Ronak Jain', 'Aakash',
  'Anamika', 'Radhika', 'Saurabh', 'Ruchi', 'Arti Sharma',
  'Tanuja Tigaya', 'Aayush', 'Kamlesh', 'Hitesh Tak',
]

const METRICS = [
  { key: 'tasks', label: 'Tasks Completion', target: 90 },
  { key: 'ontime', label: 'On-Time Delivery', target: 85 },
  { key: 'quality', label: 'Quality Score', target: 95 },
  { key: 'comm', label: 'Communication', target: 80 },
  { key: 'initiative', label: 'Initiative', target: 75 },
]

const WEEKS = ['Week 1', 'Week 2', 'Week 3', 'Week 4']

function getScore(actual: number, target: number): number {
  if (actual >= target) return 10
  if (actual >= target * 0.9) return 8
  if (actual >= target * 0.75) return 6
  if (actual >= target * 0.5) return 4
  return 2
}

interface ScorecardData {
  member: string
  week: string
  scores: Record<string, { target: number; actual: number; score: number }>
  commitment: string
  savedAt: string
}

function loadScorecards(): ScorecardData[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem('laxree-scorecards') || '[]') } catch { return [] }
}

function saveScorecards(data: ScorecardData[]) {
  localStorage.setItem('laxree-scorecards', JSON.stringify(data))
}

export function LaxreeMonday() {
  const { addToast } = useWorkflowStore()
  const [member, setMember] = useState(MEMBERS[0])
  const [week, setWeek] = useState('Week 1')
  const [actuals, setActuals] = useState<Record<string, number>>({})
  const [commitment, setCommitment] = useState('')
  const [history, setHistory] = useState<ScorecardData[]>([])

  useState(() => {
    setHistory(loadScorecards())
  })

  const handleSave = () => {
    const scores: Record<string, { target: number; actual: number; score: number }> = {}
    METRICS.forEach(m => {
      const actual = actuals[m.key] || 0
      scores[m.key] = { target: m.target, actual, score: getScore(actual, m.target) }
    })
    const newEntry: ScorecardData = { member, week, scores, commitment, savedAt: new Date().toISOString() }
    const updated = [...loadScorecards().filter(s => !(s.member === member && s.week === week)), newEntry]
    saveScorecards(updated)
    setHistory(updated)
    addToast('ok', `Scorecard saved for ${member} — ${week}`)
  }

  const totalScore = METRICS.reduce((sum, m) => sum + getScore(actuals[m.key] || 0, m.target), 0)
  const maxScore = METRICS.length * 10

  return (
    <div>
      <div className="ph">
        <div className="ph-left">
          <h2>Monday Meeting Scorecard</h2>
          <p>Weekly performance tracking and commitment review</p>
        </div>
      </div>

      {/* Full-page scorecard */}
      <div className="g2">
        {/* Left: Scorecard Input */}
        <div className="card">
          <div className="ch"><span className="ct">📝 Scorecard Entry</span></div>
          <div className="cb">
            <div className="form-row fr-2">
              <div className="fg">
                <label>Team Member</label>
                <select className="fi" value={member} onChange={e => setMember(e.target.value)}>
                  {MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="fg">
                <label>Week</label>
                <select className="fi" value={week} onChange={e => setWeek(e.target.value)}>
                  {WEEKS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
            </div>

            {/* Scorecard Table */}
            <div className="mm-scorecard" style={{ marginBottom: 14 }}>
              <div className="mm-sc-row">
                <div className="mm-sc-head">Metric</div>
                <div className="mm-sc-head">Target</div>
                <div className="mm-sc-head">Actual</div>
                <div className="mm-sc-head">Score</div>
              </div>
              {METRICS.map(m => {
                const actual = actuals[m.key] || 0
                const score = getScore(actual, m.target)
                const cellClass = score >= 8 ? 'green-cell' : score >= 5 ? 'yellow-cell' : 'red-cell'
                return (
                  <div className="mm-sc-row" key={m.key}>
                    <div className="mm-sc-metric">{m.label}</div>
                    <div className="mm-sc-cell">{m.target}%</div>
                    <div className="mm-sc-cell">
                      <input
                        type="number" min={0} max={100}
                        value={actual || ''}
                        onChange={e => setActuals(prev => ({ ...prev, [m.key]: Number(e.target.value) }))}
                        style={{ width: 50, background: 'var(--card)', border: '1px solid var(--b2)', borderRadius: 4, padding: '4px 6px', fontSize: 12, textAlign: 'center', color: 'var(--t1)', fontFamily: 'DM Sans, sans-serif' }}
                      />
                    </div>
                    <div className={`mm-sc-cell ${cellClass}`}>{score}/10</div>
                  </div>
                )
              })}
            </div>

            {/* Total */}
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: totalScore >= 35 ? 'var(--green)' : totalScore >= 20 ? 'var(--amber)' : 'var(--red)' }}>{totalScore}</span>
              <span style={{ fontSize: 14, color: 'var(--t3)' }}>/{maxScore}</span>
            </div>

            {/* Commitment */}
            <div className="fg">
              <label>Commitment for Next Week</label>
              <textarea className="fi" placeholder="Enter your commitments..." value={commitment} onChange={e => setCommitment(e.target.value)} />
            </div>

            <button className="btn btn-gold" style={{ width: '100%', marginTop: 10 }} onClick={handleSave}>💾 Save Scorecard</button>
          </div>
        </div>

        {/* Right: History */}
        <div className="card">
          <div className="ch"><span className="ct">📊 Scorecard History</span></div>
          <div className="cb">
            {history.filter(h => h.member === member).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--t3)', fontSize: 12 }}>
                No scorecards saved for {member}
              </div>
            ) : (
              history.filter(h => h.member === member).slice(-10).reverse().map((h, i) => {
                const total = Object.values(h.scores).reduce((s, v) => s + v.score, 0)
                return (
                  <div key={i} className="mm-history-item" style={{ marginBottom: 8 }}>
                    <span className="mm-hist-week">{h.week}</span>
                    <div className="mm-hist-scores">
                      {Object.values(h.scores).map((v, j) => (
                        <div key={j} className="mm-hist-dot" style={{ background: v.score >= 8 ? 'var(--green)' : v.score >= 5 ? 'var(--amber)' : 'var(--red)' }}>{v.score}</div>
                      ))}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, marginLeft: 'auto', color: 'var(--g2)' }}>{total}/{maxScore}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

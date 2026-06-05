'use client'

import { useWorkflowStore } from '@/stores/workflow-store'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

export function LaxreeMondayScorecard() {
  const { mmPanelOpen, toggleMmPanel } = useWorkflowStore()
  const [selectedWeek, setSelectedWeek] = useState(0)
  const [selectedPerson, setSelectedPerson] = useState('')

  const { data: users = [] } = useQuery({
    queryKey: ['users-mm'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
  })

  const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4']
  const metrics = [
    { name: 'Task Completion', target: 90, actual: 0, score: 0 },
    { name: 'On-Time Delivery', target: 85, actual: 0, score: 0 },
    { name: 'Quality Score', target: 80, actual: 0, score: 0 },
  ]

  const scoreCellClass = (score: number) =>
    score >= 80 ? 'green-cell' : score >= 55 ? 'yellow-cell' : 'red-cell'

  if (!mmPanelOpen) return (
    <button className="mm-toggle" onClick={toggleMmPanel}>SCORECARD</button>
  )

  return (
    <>
      <button className="mm-toggle" onClick={toggleMmPanel} style={{ display: mmPanelOpen ? 'none' : undefined }}>SCORECARD</button>
      <div className="mm-panel open">
        <div className="mm-header">
          <div className="mm-title">
            <span>🗓</span> Monday Meeting Scorecard
          </div>
          <button className="mm-close-btn" onClick={toggleMmPanel}>✕</button>
        </div>
        <div className="mm-body">
          {/* Person selector */}
          <div className="mm-section">
            <div className="mm-section-label">Team Member</div>
            <select className="mm-sel" value={selectedPerson} onChange={e => setSelectedPerson(e.target.value)}>
              <option value="">Select person…</option>
              {users.filter((u: any) => u.role !== 'DIRECTOR').map((u: any) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Week selector */}
          <div className="mm-section">
            <div className="mm-section-label">Week</div>
            <div className="mm-week-grid">
              {weeks.map((w, idx) => (
                <button key={w} className={`mm-week-btn${selectedWeek === idx ? ' active' : ''}`}
                  onClick={() => setSelectedWeek(idx)}>{w}</button>
              ))}
            </div>
          </div>

          {/* Scorecard table */}
          <div className="mm-section">
            <div className="mm-section-label">Scorecard</div>
            <div className="mm-scorecard">
              <div className="mm-sc-row">
                <div className="mm-sc-head">Metric</div>
                <div className="mm-sc-head">Target</div>
                <div className="mm-sc-head">Actual</div>
                <div className="mm-sc-head">Score</div>
              </div>
              {metrics.map(m => (
                <div className="mm-sc-row" key={m.name}>
                  <div className="mm-sc-metric">{m.name}</div>
                  <div className="mm-sc-cell">{m.target}%</div>
                  <div className="mm-sc-cell">—</div>
                  <div className={`mm-sc-cell ${scoreCellClass(m.score)}`}>—</div>
                </div>
              ))}
            </div>
          </div>

          {/* Commitment */}
          <div className="mm-section">
            <div className="mm-commit-box">
              <div className="mm-commit-title">Weekly Commitment</div>
              <div className="mm-commit-row">
                <div className="mm-commit-label">Tasks</div>
                <input className="mm-commit-input" type="number" placeholder="0" />
                <div className="mm-commit-pct">100%</div>
              </div>
              <div className="mm-commit-row">
                <div className="mm-commit-label">On-Time</div>
                <input className="mm-commit-input" type="number" placeholder="0" />
                <div className="mm-commit-pct">0%</div>
              </div>
              <div className="mm-total-bar">
                <div className="mm-total-fill" style={{ width: '0%', background: 'var(--g2)' }} />
              </div>
            </div>
          </div>

          <button className="mm-save-btn">💾 Save Scorecard</button>

          {/* No data message */}
          <div className="mm-no-data" style={{ marginTop: 16 }}>
            Select a team member and week to view or create a scorecard
          </div>
        </div>
      </div>
    </>
  )
}

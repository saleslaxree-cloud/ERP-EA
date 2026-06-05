'use client'

import { useEffect, useState } from 'react'
import { useWorkflowStore } from '@/stores/workflow-store'

export function LaxreeTopbar() {
  const { currentUser, isDark, toggleDark, toggleNotifPanel, notifPanelOpen, setCmdPaletteOpen, setSidebarOpen, sidebarOpen } = useWorkflowStore()
  const [time, setTime] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
        + ' · ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [])

  return (
    <header className="topbar">
      <div className="tb-brand">
        <button id="sidebarToggle" onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--t2)', marginRight: 6 }}
          title="Menu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif", fontSize: 19, fontWeight: 700,
          letterSpacing: 3, textTransform: 'uppercase', color: 'var(--g2)',
        }}>LAXREE</div>
      </div>
      <div className="tb-center">
        <div className="tb-search" onClick={() => setCmdPaletteOpen(true)} style={{ cursor: 'pointer' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--t4)' }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input type="text" placeholder="Search tasks, people, modules… (⌘K)" readOnly style={{ cursor: 'pointer' }} />
        </div>
        <span style={{ fontSize: '11.5px', color: 'var(--t3)', whiteSpace: 'nowrap' }}>{time}</span>
      </div>
      <div className="tb-right">
        <div className="tb-icon-btn" onClick={toggleNotifPanel} title="Notifications">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
        <button className={`dark-toggle${isDark ? ' on' : ''}`} onClick={toggleDark} title="Toggle dark mode" />
        <div style={{
          fontSize: '11.5px', fontWeight: 700, color: 'var(--g2)',
          padding: '6px 12px', background: 'var(--g5)',
          border: '1px solid var(--gbr)', borderRadius: 20,
        }}>{currentUser?.name || '—'}</div>
      </div>
    </header>
  )
}

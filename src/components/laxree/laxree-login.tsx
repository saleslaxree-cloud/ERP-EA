'use client'

import { useState } from 'react'
import { useWorkflowStore } from '@/stores/workflow-store'

export function LaxreeLogin() {
  const { login } = useWorkflowStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)

  const handleLogin = () => {
    if (attempts >= 5) {
      setError('Too many failed attempts. Please refresh the page.')
      return
    }
    const success = login(username, password)
    if (!success) {
      const remaining = 5 - attempts - 1
      setAttempts(a => a + 1)
      setError(remaining > 0 ? `Invalid credentials. ${remaining} attempt(s) remaining.` : 'Account locked — please refresh.')
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(160deg, #fffcf2 0%, #fdf6d8 60%, #fff9ee 100%)',
      zIndex: 8000, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div className="lc">
        <div className="lc-brand">
          <div style={{
            width: 72, height: 72, margin: '0 auto 10px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8B6914, #D4AA50)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700,
            color: '#fff', letterSpacing: 2,
          }}>L</div>
          <span className="lc-brand-name">LAXREE</span>
          <span className="lc-brand-sub">Enterprise Operating System</span>
        </div>
        <div className="lf-g">
          <label className="lf-l">Username</label>
          <input className="lf-i" type="text" placeholder="Enter your username"
            value={username} onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>
        <div className="lf-g">
          <label className="lf-l">Password</label>
          <input className="lf-i" type="password" placeholder="Enter your password"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>
        <button className="lf-btn" onClick={handleLogin}>Sign In to LOS</button>
        {error && (
          <div style={{
            background: 'var(--red-l)', border: '1px solid rgba(200,21,26,.3)',
            color: 'var(--red)', padding: '10px 14px', borderRadius: 'var(--r-sm)',
            fontSize: 12, marginTop: 10,
          }}>{error}</div>
        )}

        {/* Credentials Reference */}
        <div style={{ marginTop: 14, fontSize: 9.5, color: 'var(--t4)', lineHeight: 1.8 }}>
          <div style={{ fontWeight: 800, marginBottom: 4, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Admin & EA</div>
          <div><b>admin</b> / Laxree@2025 &nbsp;·&nbsp; <b>ea</b> / EA@Laxree</div>

          <div style={{ fontWeight: 800, marginTop: 8, marginBottom: 4, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Directors</div>
          <div><b>ashish</b> / Ashish@2025 &nbsp;·&nbsp; <b>samarth</b> / Samarth@2025</div>

          <div style={{ fontWeight: 800, marginTop: 8, marginBottom: 4, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Employees</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px' }}>
            <div><b>aditya</b> / Aditya@2025</div>
            <div><b>aakash</b> / Aakash@2025</div>
            <div><b>anamika</b> / Anamika@2025</div>
            <div><b>saurabh</b> / Saurabh@2025</div>
            <div><b>ruchi</b> / Ruchi@2025</div>
            <div><b>aayush</b> / Aayush@2025</div>
            <div><b>kamlesh</b> / Kamlesh@2025</div>
            <div><b>hitesh</b> / Hitesh@2025</div>
          </div>

          <div style={{ fontWeight: 800, marginTop: 8, marginBottom: 4, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Managers</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px' }}>
            <div><b>khushboo</b> / Khushboo@2025</div>
            <div><b>radhika</b> / Radhika@2025</div>
            <div><b>tanuja</b> / Tanuja@2025</div>
          </div>
        </div>
      </div>
    </div>
  )
}

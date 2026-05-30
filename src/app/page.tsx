'use client'

import { useWorkflowStore } from '@/stores/workflow-store'
import { AppSidebar } from '@/components/app-sidebar'
import { AppHeader } from '@/components/app-header'
import { WorkflowDashboard } from '@/components/workflow-dashboard'
import { WorkflowList } from '@/components/workflow-list'
import { ApprovalList } from '@/components/approval-list'
import { TaskList } from '@/components/task-list'
import { NotificationList } from '@/components/notification-list'
import { useEffect } from 'react'

function ActiveView() {
  const { activeView } = useWorkflowStore()

  switch (activeView) {
    case 'dashboard':
      return <WorkflowDashboard />
    case 'workflows':
      return <WorkflowList />
    case 'approvals':
      return <ApprovalList />
    case 'tasks':
    case 'cancelled':
      return <TaskList />
    case 'notifications':
      return <NotificationList />
    case 'executive':
      return <ExecutiveView />
    case 'analytics':
      return <AnalyticsView />
    case 'performance':
      return <PerformanceView />
    case 'departments':
    case 'team':
    case 'director-dependency':
    case 'categories':
    case 'holidays':
    case 'escalations':
      return <PlaceholderView view={activeView} />
    default:
      return <WorkflowDashboard />
  }
}

function ExecutiveView() {
  return (
    <div>
      <div className="ph">
        <div className="ph-left">
          <h2>Executive Command Center</h2>
          <p>C-Suite operational intelligence · Real-time business health overview</p>
        </div>
        <div className="ph-right">
          <span className="badge b-green">● Live Feed</span>
        </div>
      </div>
      <div className="page-accent" />
      <div className="g2">
        <div className="lcard">
          <div className="ch"><div className="ct">🏆 Business Health Score</div></div>
          <div className="cb" style={{ textAlign: 'center', padding: 30 }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 52, fontWeight: 700, color: 'var(--green)' }}>87</div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)' }}>Overall Score</div>
            <div className="badge b-green" style={{ marginTop: 8 }}>Healthy</div>
          </div>
        </div>
        <div className="ai-widget">
          <div className="ai-label"><div className="ai-pulse" />CEO AI Briefing</div>
          <div className="ai-item">
            <div className="ai-bullet" style={{ background: 'var(--green)' }} />
            <div className="ai-text"><strong>Operations stable.</strong> All departments within SLA thresholds.</div>
          </div>
          <div className="ai-item">
            <div className="ai-bullet" style={{ background: 'var(--amber)' }} />
            <div className="ai-text"><strong>2 approvals pending</strong> from EA review stage.</div>
          </div>
          <div className="ai-item">
            <div className="ai-bullet" style={{ background: 'var(--blue)' }} />
            <div className="ai-text"><strong>Team velocity up 12%</strong> compared to last week.</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AnalyticsView() {
  return (
    <div>
      <div className="ph">
        <div className="ph-left">
          <h2>Analytics &amp; Reports</h2>
          <p>Business intelligence &amp; operational reporting hub</p>
        </div>
      </div>
      <div className="page-accent" />
      <div className="stat-grid sg-4" style={{ marginBottom: 16 }}>
        <div className="sc"><div className="sc-accent" style={{ background: 'var(--g2)' }} /><div className="sc-label">Total Tasks</div><div className="sc-val c-gold">—</div></div>
        <div className="sc"><div className="sc-accent" style={{ background: 'var(--green)' }} /><div className="sc-label">Completed</div><div className="sc-val c-green">—</div></div>
        <div className="sc"><div className="sc-accent" style={{ background: 'var(--amber)' }} /><div className="sc-label">In Progress</div><div className="sc-val c-amber">—</div></div>
        <div className="sc"><div className="sc-accent" style={{ background: 'var(--red)' }} /><div className="sc-label">Overdue</div><div className="sc-val c-red">—</div></div>
      </div>
      <div className="lcard">
        <div className="ch"><div className="ct">📊 Performance Report</div><span className="badge b-gold f10">Live</span></div>
        <div className="cb" style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>
          Detailed analytics will populate as your team creates and completes tasks.
        </div>
      </div>
    </div>
  )
}

function PerformanceView() {
  return (
    <div>
      <div className="ph">
        <div className="ph-left">
          <h2>Performance Intelligence</h2>
          <p>Deep-dive employee analytics &amp; comparison engine</p>
        </div>
      </div>
      <div className="page-accent" />
      <div className="lcard">
        <div className="ch"><div className="ct">🔍 Performance Overview</div><span className="badge b-gold f10">This Week</span></div>
        <div className="cb" style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>
          Performance data will appear as team members complete tasks and approvals.
        </div>
      </div>
    </div>
  )
}

function PlaceholderView({ view }: { view: string }) {
  const titles: Record<string, string> = {
    'departments': 'Departments',
    'team': 'Team Members',
    'director-dependency': 'Director Dependency Center',
    'categories': 'Categories',
    'holidays': 'Holidays',
    'escalations': 'Escalation Logs',
  }
  const descriptions: Record<string, string> = {
    'departments': 'Department structure and productivity analysis',
    'team': 'Team member management and performance tracking',
    'director-dependency': 'Approval routing and director dependency management',
    'categories': 'Task and workflow category management',
    'holidays': 'Holiday calendar and scheduling',
    'escalations': 'Escalation history and resolution tracking',
  }

  return (
    <div>
      <div className="ph">
        <div className="ph-left">
          <h2>{titles[view] || view}</h2>
          <p>{descriptions[view] || 'Manage your enterprise operations'}</p>
        </div>
      </div>
      <div className="page-accent" />
      <div className="lcard">
        <div className="cb" style={{ textAlign: 'center', padding: 60, color: 'var(--t3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚧</div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--t2)', marginBottom: 6 }}>{titles[view] || view}</h3>
          <p style={{ fontSize: 12.5 }}>This module is available. Data will populate as workflows and tasks are created.</p>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { darkMode } = useWorkflowStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', transition: 'background .3s' }}>
      <AppHeader />
      <AppSidebar />
      <main className="main-area">
        <ActiveView />
      </main>
      <div id="toastArea" />
    </div>
  )
}

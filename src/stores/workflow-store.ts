import { create } from 'zustand'

type ActiveView = 'dashboard' | 'workflows' | 'approvals' | 'tasks' | 'notifications' | 'executive' | 'analytics' | 'performance' | 'departments' | 'team' | 'escalations' | 'cancelled' | 'categories' | 'holidays' | 'director-dependency' | 'employees' | 'projects' | 'reports' | 'scorecards' | 'settings'

type UserRole = 'ADMIN' | 'DIRECTOR' | 'EA' | 'MANAGER' | 'EMPLOYEE'

interface Toast {
  id: string
  type: 'ok' | 'err' | 'info'
  message: string
}

interface WorkflowStore {
  activeView: ActiveView
  currentUserId: string
  currentUserName: string
  currentRole: UserRole
  sidebarOpen: boolean
  selectedWorkflowId: string | null
  darkMode: boolean
  searchQuery: string
  notifPanelOpen: boolean
  // Task creation modal
  createTaskOpen: boolean
  setCreateTaskOpen: (open: boolean) => void
  // Task detail/selection
  selectedTaskId: string | null
  setSelectedTaskId: (id: string | null) => void
  // Task tab
  taskTab: string
  setTaskTab: (tab: string) => void
  // Current user object (for components that need it)
  currentUser: { username: string; role: string; name: string } | null
  // Toast notifications
  toasts: Toast[]
  addToast: (type: 'ok' | 'err' | 'info', message: string) => void
  removeToast: (id: string) => void
  // Standard setters
  setActiveView: (view: ActiveView) => void
  setCurrentUserId: (id: string) => void
  setCurrentUserName: (name: string) => void
  setCurrentRole: (role: UserRole) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSelectedWorkflowId: (id: string | null) => void
  setDarkMode: (dark: boolean) => void
  toggleDarkMode: () => void
  setSearchQuery: (q: string) => void
  setNotifPanelOpen: (open: boolean) => void
  toggleNotifPanel: () => void
}

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  activeView: 'dashboard',
  currentUserId: 'user-admin',
  currentUserName: 'Arti Sharma',
  currentRole: 'ADMIN',
  sidebarOpen: false,
  selectedWorkflowId: null,
  darkMode: false,
  searchQuery: '',
  notifPanelOpen: false,
  createTaskOpen: false,
  selectedTaskId: null,
  taskTab: 'all',
  currentUser: { username: 'admin', role: 'admin', name: 'Arti Sharma' },
  toasts: [],
  setCreateTaskOpen: (open) => set({ createTaskOpen: open }),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  setTaskTab: (tab) => set({ taskTab: tab }),
  addToast: (type, message) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2)
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }))
    }, 4000)
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) })),
  setActiveView: (view) => set({ activeView: view, selectedWorkflowId: null }),
  setCurrentUserId: (id) => set({ currentUserId: id }),
  setCurrentUserName: (name) => set({ currentUserName: name }),
  setCurrentRole: (role) => set({ currentRole: role }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSelectedWorkflowId: (id) => set({ selectedWorkflowId: id }),
  setDarkMode: (dark) => set({ darkMode: dark }),
  toggleDarkMode: () => set((state) => {
    const newDark = !state.darkMode
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', newDark)
    }
    return { darkMode: newDark }
  }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setNotifPanelOpen: (open) => set({ notifPanelOpen: open }),
  toggleNotifPanel: () => set((state) => ({ notifPanelOpen: !state.notifPanelOpen })),
}))

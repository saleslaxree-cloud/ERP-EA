import { create } from 'zustand'

type ActiveView = 'dashboard' | 'workflows' | 'approvals' | 'tasks' | 'notifications' | 'executive' | 'analytics' | 'performance' | 'departments' | 'team' | 'escalations' | 'cancelled' | 'categories' | 'holidays' | 'director-dependency' | 'employees' | 'projects' | 'reports' | 'scorecards' | 'settings' | 'monday' | 'dirDep' | 'exthold'

type UserRole = 'ADMIN' | 'DIRECTOR' | 'EA' | 'MANAGER' | 'EMPLOYEE'

interface Toast {
  id: string
  type: 'ok' | 'err' | 'info'
  message: string
}

interface WorkflowStore {
  // Navigation
  activeView: ActiveView
  activePage: string
  // User
  currentUserId: string
  currentUserName: string
  currentRole: UserRole
  currentUser: { username: string; role: string; name: string } | null
  // UI State
  sidebarOpen: boolean
  darkMode: boolean
  isDark: boolean
  searchQuery: string
  notifPanelOpen: boolean
  cmdPaletteOpen: boolean
  // Task creation modal
  createTaskOpen: boolean
  // Task detail/selection
  selectedTaskId: string | null
  selectedWorkflowId: string | null
  // Task tab
  taskTab: string
  // Toast notifications
  toasts: Toast[]
  // Setters
  setActiveView: (view: ActiveView) => void
  setActivePage: (page: string) => void
  setCurrentUserId: (id: string) => void
  setCurrentUserName: (name: string) => void
  setCurrentRole: (role: UserRole) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSelectedWorkflowId: (id: string | null) => void
  setDarkMode: (dark: boolean) => void
  toggleDarkMode: () => void
  toggleDark: () => void
  setSearchQuery: (q: string) => void
  setNotifPanelOpen: (open: boolean) => void
  toggleNotifPanel: () => void
  setCmdPaletteOpen: (open: boolean) => void
  setCreateTaskOpen: (open: boolean) => void
  setSelectedTaskId: (id: string | null) => void
  setTaskTab: (tab: string) => void
  addToast: (type: 'ok' | 'err' | 'info', message: string) => void
  removeToast: (id: string) => void
  logout: () => void
}

const initialState = {
  activeView: 'dashboard' as ActiveView,
  activePage: 'dashboard',
  currentUserId: 'user-admin',
  currentUserName: 'Arti Sharma',
  currentRole: 'ADMIN' as UserRole,
  currentUser: { username: 'admin', role: 'admin', name: 'Arti Sharma' },
  sidebarOpen: false,
  darkMode: false,
  isDark: false,
  searchQuery: '',
  notifPanelOpen: false,
  cmdPaletteOpen: false,
  createTaskOpen: false,
  selectedTaskId: null as string | null,
  selectedWorkflowId: null as string | null,
  taskTab: 'all',
  toasts: [] as Toast[],
}

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  ...initialState,

  setActiveView: (view) => set({ activeView: view, activePage: view, selectedWorkflowId: null }),
  setActivePage: (page) => set({ activePage: page, activeView: page as ActiveView, selectedWorkflowId: null }),
  setCurrentUserId: (id) => set({ currentUserId: id }),
  setCurrentUserName: (name) => set({ currentUserName: name }),
  setCurrentRole: (role) => set({ currentRole: role }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSelectedWorkflowId: (id) => set({ selectedWorkflowId: id }),
  setDarkMode: (dark) => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', dark)
    }
    set({ darkMode: dark, isDark: dark })
  },
  toggleDarkMode: () => set((state) => {
    const newDark = !state.darkMode
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', newDark)
    }
    return { darkMode: newDark, isDark: newDark }
  }),
  toggleDark: () => set((state) => {
    const newDark = !state.isDark
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', newDark)
    }
    return { isDark: newDark, darkMode: newDark }
  }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setNotifPanelOpen: (open) => set({ notifPanelOpen: open }),
  toggleNotifPanel: () => set((state) => ({ notifPanelOpen: !state.notifPanelOpen })),
  setCmdPaletteOpen: (open) => set({ cmdPaletteOpen: open }),
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
  logout: () => set({
    ...initialState,
  }),
}))

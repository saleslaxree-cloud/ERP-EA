import { create } from 'zustand'

type ActiveView = 'dashboard' | 'workflows' | 'tasks' | 'notifications' | 'executive' | 'analytics' | 'performance' | 'departments' | 'team' | 'escalations' | 'cancelled' | 'categories' | 'holidays' | 'director-dependency' | 'employees' | 'projects' | 'reports' | 'scorecards' | 'settings' | 'monday' | 'dirDep' | 'exthold'

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
  // Monday meeting panel
  mmPanelOpen: boolean
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
  toggleMmPanel: () => void
  setSelectedTaskId: (id: string | null) => void
  setTaskTab: (tab: string) => void
  addToast: (type: 'ok' | 'err' | 'info', message: string) => void
  removeToast: (id: string) => void
  login: (username: string, password: string) => boolean
  logout: () => void
}

const initialState = {
  activeView: 'dashboard' as ActiveView,
  activePage: 'dashboard',
  currentUserId: '',
  currentUserName: '',
  currentRole: 'EMPLOYEE' as UserRole,
  currentUser: null as { username: string; role: string; name: string } | null,
  sidebarOpen: false,
  darkMode: false,
  isDark: false,
  searchQuery: '',
  notifPanelOpen: false,
  cmdPaletteOpen: false,
  createTaskOpen: false,
  mmPanelOpen: false,
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
  toggleMmPanel: () => set((state) => ({ mmPanelOpen: !state.mmPanelOpen })),
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
  login: (username: string, password: string) => {
    const users: Record<string, { password: string; role: UserRole; name: string; userId: string }> = {
      admin: { password: 'Laxree@2025', role: 'ADMIN', name: 'Arti Sharma', userId: 'user-admin' },
      ea: { password: 'EA@Laxree', role: 'EA', name: 'Arti Sharma', userId: 'user-ea1' },
      ashish: { password: 'Ashish@2025', role: 'DIRECTOR', name: 'Ashish Sir', userId: 'user-dir3' },
      samarth: { password: 'Samarth@2025', role: 'DIRECTOR', name: 'Samarth Sir', userId: 'user-dir4' },
    }
    const user = users[username]
    if (user && user.password === password) {
      set({
        currentUserId: user.userId,
        currentUserName: user.name,
        currentRole: user.role,
        currentUser: { username, role: user.role, name: user.name },
      })
      return true
    }
    return false
  },
  logout: () => set({
    ...initialState,
  }),
}))

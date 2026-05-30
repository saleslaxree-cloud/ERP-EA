import { create } from 'zustand'

type ActiveView = 'dashboard' | 'workflows' | 'approvals' | 'tasks' | 'notifications' | 'executive' | 'analytics' | 'performance' | 'departments' | 'team' | 'escalations' | 'cancelled' | 'categories' | 'holidays' | 'director-dependency'

interface WorkflowStore {
  activeView: ActiveView
  currentUserId: string
  currentUserName: string
  sidebarOpen: boolean
  selectedWorkflowId: string | null
  darkMode: boolean
  searchQuery: string
  notifPanelOpen: boolean
  setActiveView: (view: ActiveView) => void
  setCurrentUserId: (id: string) => void
  setCurrentUserName: (name: string) => void
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
  currentUserName: 'Admin',
  sidebarOpen: false,
  selectedWorkflowId: null,
  darkMode: false,
  searchQuery: '',
  notifPanelOpen: false,
  setActiveView: (view) => set({ activeView: view, selectedWorkflowId: null }),
  setCurrentUserId: (id) => set({ currentUserId: id }),
  setCurrentUserName: (name) => set({ currentUserName: name }),
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

import { create } from 'zustand'

type ActiveView = 'dashboard' | 'workflows' | 'approvals' | 'tasks' | 'notifications'

interface WorkflowStore {
  activeView: ActiveView
  currentUserId: string
  sidebarOpen: boolean
  selectedWorkflowId: string | null
  setActiveView: (view: ActiveView) => void
  setCurrentUserId: (id: string) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSelectedWorkflowId: (id: string | null) => void
}

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  activeView: 'dashboard',
  currentUserId: 'user-admin',
  sidebarOpen: false,
  selectedWorkflowId: null,
  setActiveView: (view) => set({ activeView: view, selectedWorkflowId: null }),
  setCurrentUserId: (id) => set({ currentUserId: id }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSelectedWorkflowId: (id) => set({ selectedWorkflowId: id }),
}))

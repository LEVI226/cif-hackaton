import { create } from 'zustand'

export type ViewName =
  | 'dashboard'
  | 'clients'
  | 'transactions'
  | 'alertes'
  | 'screening'
  | 'rapports'
  | 'regles'
  | 'audit'
  | 'calendrier'

interface AppState {
  view: ViewName
  selectedClientId: string | null
  selectedTransactionId: string | null
  selectedAlerteId: string | null
  sidebarCollapsed: boolean
  setView: (v: ViewName) => void
  setClientId: (id: string | null) => void
  setTransactionId: (id: string | null) => void
  setAlerteId: (id: string | null) => void
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>((set) => ({
  view: 'dashboard',
  selectedClientId: null,
  selectedTransactionId: null,
  selectedAlerteId: null,
  sidebarCollapsed: false,
  setView: (v) => set({ view: v, selectedClientId: null }),
  setClientId: (id) => set({ selectedClientId: id }),
  setTransactionId: (id) => set({ selectedTransactionId: id }),
  setAlerteId: (id) => set({ selectedAlerteId: id }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}))

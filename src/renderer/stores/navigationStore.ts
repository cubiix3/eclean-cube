import { create } from 'zustand'

export type ModuleId = 'dashboard' | 'optimizer' | 'cleaner' | 'hardware' | 'booster' | 'uninstaller'

interface NavigationState {
  activeModule: ModuleId
  setActiveModule: (module: ModuleId) => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeModule: 'dashboard',
  setActiveModule: (module) => set({ activeModule: module })
}))

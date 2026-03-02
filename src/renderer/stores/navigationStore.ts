import { create } from 'zustand'

export type ModuleId = 'dashboard' | 'optimizer' | 'cleaner' | 'hardware' | 'booster' | 'uninstaller' | 'process' | 'benchmark' | 'settings' | 'registry' | 'disk' | 'monitor' | 'logs' | 'treemap' | 'speedtest' | 'contextmenu' | 'restore' | 'drivers' | 'hosts' | 'power' | 'rename' | 'updates' | 'startupanalyzer'

interface NavigationState {
  activeModule: ModuleId
  setActiveModule: (module: ModuleId) => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeModule: 'dashboard',
  setActiveModule: (module) => set({ activeModule: module })
}))

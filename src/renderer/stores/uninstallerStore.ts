import { create } from 'zustand'
import { useToastStore } from './toastStore'

export type UninstallerTab = 'desktop' | 'uwp' | 'extensions' | 'leftovers'

interface UninstallerState {
  activeTab: UninstallerTab

  // Desktop Apps
  apps: UninstallerInstalledApp[]
  isLoadingApps: boolean
  selectedApps: string[]
  searchQuery: string
  sortBy: 'name' | 'size' | 'date'
  sortDir: 'asc' | 'desc'
  isUninstalling: boolean

  // UWP Apps
  uwpApps: UninstallerUwpApp[]
  isLoadingUwp: boolean
  uwpSearch: string
  isRemovingUwp: boolean

  // Browser Extensions
  extensions: UninstallerBrowserExtension[]
  isLoadingExtensions: boolean

  // Leftovers
  leftovers: UninstallerLeftoverItem[]
  isScanning: boolean
  leftoverAppName: string
  selectedLeftovers: string[]
  isCleaning: boolean

  // History
  history: UninstallerHistoryEntry[]

  // Actions
  setActiveTab: (tab: UninstallerTab) => void

  // Desktop Apps Actions
  fetchApps: () => Promise<void>
  toggleAppSelection: (displayName: string) => void
  selectAllApps: () => void
  deselectAllApps: () => void
  setSearchQuery: (query: string) => void
  setSortBy: (sort: 'name' | 'size' | 'date') => void
  toggleSortDir: () => void
  uninstallApp: (uninstallString: string, appName: string) => Promise<UninstallerResult>
  batchUninstall: () => Promise<void>

  // UWP Apps Actions
  fetchUwpApps: () => Promise<void>
  setUwpSearch: (query: string) => void
  removeUwpApp: (packageFullName: string, appName: string) => Promise<UninstallerResult>

  // Browser Extensions Actions
  fetchExtensions: () => Promise<void>
  openExtensionsPage: (browser: string) => Promise<void>

  // Leftovers Actions
  setLeftoverAppName: (name: string) => void
  scanLeftovers: () => Promise<void>
  toggleLeftoverSelection: (path: string) => void
  selectAllLeftovers: () => void
  deselectAllLeftovers: () => void
  cleanSelectedLeftovers: () => Promise<void>

  // History Actions
  fetchHistory: () => Promise<void>
}

export const useUninstallerStore = create<UninstallerState>((set, get) => ({
  activeTab: 'desktop',

  // Desktop Apps
  apps: [],
  isLoadingApps: false,
  selectedApps: [],
  searchQuery: '',
  sortBy: 'name',
  sortDir: 'asc',
  isUninstalling: false,

  // UWP Apps
  uwpApps: [],
  isLoadingUwp: false,
  uwpSearch: '',
  isRemovingUwp: false,

  // Browser Extensions
  extensions: [],
  isLoadingExtensions: false,

  // Leftovers
  leftovers: [],
  isScanning: false,
  leftoverAppName: '',
  selectedLeftovers: [],
  isCleaning: false,

  // History
  history: [],

  setActiveTab: (tab) => set({ activeTab: tab }),

  // ── Desktop Apps ──
  fetchApps: async () => {
    set({ isLoadingApps: true })
    try {
      const apps = await window.api.uninstaller.getApps()
      set({ apps })
    } catch {
      set({ apps: [] })
    }
    set({ isLoadingApps: false })
  },

  toggleAppSelection: (displayName) =>
    set((state) => ({
      selectedApps: state.selectedApps.includes(displayName)
        ? state.selectedApps.filter((n) => n !== displayName)
        : [...state.selectedApps, displayName]
    })),

  selectAllApps: () =>
    set((state) => ({
      selectedApps: state.apps.map((a) => a.DisplayName)
    })),

  deselectAllApps: () => set({ selectedApps: [] }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSortBy: (sort) =>
    set((state) => ({
      sortBy: sort,
      sortDir: state.sortBy === sort ? (state.sortDir === 'asc' ? 'desc' : 'asc') : 'asc'
    })),

  toggleSortDir: () =>
    set((state) => ({ sortDir: state.sortDir === 'asc' ? 'desc' : 'asc' })),

  uninstallApp: async (uninstallString, appName) => {
    set({ isUninstalling: true })
    try {
      const result = await window.api.uninstaller.uninstall(uninstallString, appName)
      if (result.success) {
        // Remove from list
        set((state) => ({
          apps: state.apps.filter((a) => a.DisplayName !== appName),
          selectedApps: state.selectedApps.filter((n) => n !== appName)
        }))
        // Refresh history
        get().fetchHistory()
        useToastStore.getState().addToast({
          type: 'success',
          title: 'App removed successfully',
          message: appName
        })

        // Auto-scan for leftovers after successful uninstall
        setTimeout(async () => {
          set({ leftoverAppName: appName, activeTab: 'leftovers' })
          try {
            set({ isScanning: true, leftovers: [], selectedLeftovers: [] })
            const leftovers = await window.api.uninstaller.scanLeftovers(appName)
            const highConfidence = leftovers
              .filter((l: any) => l.confidence === 'high')
              .map((l: any) => l.path)
            set({ leftovers, selectedLeftovers: highConfidence, isScanning: false })
            if (leftovers.length > 0) {
              useToastStore.getState().addToast({
                type: 'warning',
                title: `Found ${leftovers.length} leftover files`,
                message: `Leftovers detected for ${appName}. Review and clean them.`
              })
            }
          } catch {
            set({ isScanning: false })
          }
        }, 1000)
      } else {
        useToastStore.getState().addToast({
          type: 'error',
          title: 'Uninstall failed',
          message: result.error || appName
        })
      }
      set({ isUninstalling: false })
      return result
    } catch (err: any) {
      set({ isUninstalling: false })
      useToastStore.getState().addToast({
        type: 'error',
        title: 'Uninstall failed',
        message: err?.message || 'Unknown error'
      })
      return { success: false, error: err?.message || 'Unknown error' }
    }
  },

  batchUninstall: async () => {
    const { selectedApps, apps } = get()
    set({ isUninstalling: true })

    for (const appName of selectedApps) {
      const app = apps.find((a) => a.DisplayName === appName)
      if (app?.UninstallString) {
        await get().uninstallApp(app.UninstallString, appName)
      }
    }

    set({ isUninstalling: false, selectedApps: [] })
  },

  // ── UWP Apps ──
  fetchUwpApps: async () => {
    set({ isLoadingUwp: true })
    try {
      const uwpApps = await window.api.uninstaller.getUwpApps()
      set({ uwpApps })
    } catch {
      set({ uwpApps: [] })
    }
    set({ isLoadingUwp: false })
  },

  setUwpSearch: (query) => set({ uwpSearch: query }),

  removeUwpApp: async (packageFullName, appName) => {
    set({ isRemovingUwp: true })
    try {
      const result = await window.api.uninstaller.removeUwp(packageFullName, appName)
      if (result.success) {
        set((state) => ({
          uwpApps: state.uwpApps.filter((a) => a.PackageFullName !== packageFullName)
        }))
        get().fetchHistory()
        useToastStore.getState().addToast({
          type: 'success',
          title: 'App removed successfully',
          message: appName
        })
      } else {
        useToastStore.getState().addToast({
          type: 'error',
          title: 'Remove failed',
          message: result.error || appName
        })
      }
      set({ isRemovingUwp: false })
      return result
    } catch (err: any) {
      set({ isRemovingUwp: false })
      useToastStore.getState().addToast({
        type: 'error',
        title: 'Remove failed',
        message: err?.message || 'Unknown error'
      })
      return { success: false, error: err?.message || 'Unknown error' }
    }
  },

  // ── Browser Extensions ──
  fetchExtensions: async () => {
    set({ isLoadingExtensions: true })
    try {
      const extensions = await window.api.uninstaller.getExtensions()
      set({ extensions })
    } catch {
      set({ extensions: [] })
    }
    set({ isLoadingExtensions: false })
  },

  openExtensionsPage: async (browser) => {
    await window.api.uninstaller.openExtensionsPage(browser)
  },

  // ── Leftovers ──
  setLeftoverAppName: (name) => set({ leftoverAppName: name }),

  scanLeftovers: async () => {
    const { leftoverAppName } = get()
    if (!leftoverAppName.trim()) return

    set({ isScanning: true, leftovers: [], selectedLeftovers: [] })
    try {
      const leftovers = await window.api.uninstaller.scanLeftovers(leftoverAppName)
      // Pre-select high confidence items
      const highConfidence = leftovers
        .filter((l) => l.confidence === 'high')
        .map((l) => l.path)

      set({ leftovers, selectedLeftovers: highConfidence })
    } catch {
      set({ leftovers: [] })
    }
    set({ isScanning: false })
  },

  toggleLeftoverSelection: (path) =>
    set((state) => ({
      selectedLeftovers: state.selectedLeftovers.includes(path)
        ? state.selectedLeftovers.filter((p) => p !== path)
        : [...state.selectedLeftovers, path]
    })),

  selectAllLeftovers: () =>
    set((state) => ({
      selectedLeftovers: state.leftovers.map((l) => l.path)
    })),

  deselectAllLeftovers: () => set({ selectedLeftovers: [] }),

  cleanSelectedLeftovers: async () => {
    const { selectedLeftovers, leftovers } = get()
    if (selectedLeftovers.length === 0) return

    set({ isCleaning: true })
    try {
      const items = leftovers
        .filter((l) => selectedLeftovers.includes(l.path))
        .map((l) => ({ path: l.path, type: l.type }))

      const result = await window.api.uninstaller.cleanLeftovers(items)

      // Remove successfully cleaned items from the list
      set((state) => ({
        leftovers: state.leftovers.filter((l) => !result.success.includes(l.path)),
        selectedLeftovers: state.selectedLeftovers.filter((p) => !result.success.includes(p))
      }))
    } catch {
      // ignore
    }
    set({ isCleaning: false })
  },

  // ── History ──
  fetchHistory: async () => {
    try {
      const history = await window.api.uninstaller.getHistory()
      set({ history })
    } catch {
      set({ history: [] })
    }
  }
}))

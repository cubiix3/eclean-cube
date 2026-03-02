import { create } from 'zustand'
import { useToastStore } from './toastStore'

export type ProcessTab = 'processes' | 'ram'
export type ProcessSortBy = 'name' | 'cpu' | 'ram'

interface ProcessInfo {
  pid: number
  name: string
  cpu: number
  ram: number
  status: string
}

interface RAMDetails {
  totalMB: number
  usedMB: number
  availableMB: number
  cachedMB: number
  percentUsed: number
  topProcesses: { name: string; pid: number; ramMB: number }[]
}

interface RAMOptimizeResult {
  freedMB: number
  beforeMB: number
  afterMB: number
}

interface ProcessState {
  // Tab
  activeTab: ProcessTab
  setActiveTab: (tab: ProcessTab) => void

  // Process list
  processes: ProcessInfo[]
  isLoading: boolean
  searchQuery: string
  sortBy: ProcessSortBy
  sortDir: 'asc' | 'desc'
  autoRefresh: boolean
  processCount: number

  // RAM
  ramDetails: RAMDetails | null
  isLoadingRAM: boolean
  isOptimizing: boolean
  optimizeResult: RAMOptimizeResult | null

  // Process actions
  fetchProcesses: () => Promise<void>
  killProcess: (pid: number, name: string) => Promise<void>
  setSearchQuery: (query: string) => void
  setSortBy: (sort: ProcessSortBy) => void
  toggleAutoRefresh: () => void

  // RAM actions
  fetchRAMDetails: () => Promise<void>
  optimizeRAM: () => Promise<void>
  clearOptimizeResult: () => void
}

export const useProcessStore = create<ProcessState>((set, get) => ({
  // Tab
  activeTab: 'processes',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Process list
  processes: [],
  isLoading: false,
  searchQuery: '',
  sortBy: 'ram',
  sortDir: 'desc',
  autoRefresh: false,
  processCount: 0,

  // RAM
  ramDetails: null,
  isLoadingRAM: false,
  isOptimizing: false,
  optimizeResult: null,

  // ── Process Actions ──
  fetchProcesses: async () => {
    set({ isLoading: true })
    try {
      const [processes, processCount] = await Promise.all([
        window.api.process.getAll(),
        window.api.process.getCount()
      ])
      set({ processes, processCount })
    } catch {
      set({ processes: [], processCount: 0 })
    }
    set({ isLoading: false })
  },

  killProcess: async (pid, name) => {
    try {
      const result = await window.api.process.kill(pid)
      if (result.success) {
        set((state) => ({
          processes: state.processes.filter((p) => p.pid !== pid)
        }))
        useToastStore.getState().addToast({
          type: 'success',
          title: 'Process terminated',
          message: `${name} (PID: ${pid}) has been killed`
        })
      } else {
        useToastStore.getState().addToast({
          type: 'error',
          title: 'Failed to kill process',
          message: result.error || `Could not terminate ${name}`
        })
      }
    } catch (err: any) {
      useToastStore.getState().addToast({
        type: 'error',
        title: 'Failed to kill process',
        message: err?.message || 'Unknown error'
      })
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSortBy: (sort) =>
    set((state) => ({
      sortBy: sort,
      sortDir: state.sortBy === sort ? (state.sortDir === 'asc' ? 'desc' : 'asc') : 'desc'
    })),

  toggleAutoRefresh: () => set((state) => ({ autoRefresh: !state.autoRefresh })),

  // ── RAM Actions ──
  fetchRAMDetails: async () => {
    set({ isLoadingRAM: true })
    try {
      const ramDetails = await window.api.process.getRAMDetails()
      set({ ramDetails })
    } catch {
      set({ ramDetails: null })
    }
    set({ isLoadingRAM: false })
  },

  optimizeRAM: async () => {
    set({ isOptimizing: true, optimizeResult: null })
    try {
      const result = await window.api.process.optimizeRAM()
      set({ optimizeResult: result })
      useToastStore.getState().addToast({
        type: 'success',
        title: 'RAM Optimized',
        message: result.freedMB > 0
          ? `Freed ${result.freedMB} MB of RAM`
          : 'Memory is already optimized'
      })
      // Refresh RAM details after optimization
      get().fetchRAMDetails()
    } catch (err: any) {
      useToastStore.getState().addToast({
        type: 'error',
        title: 'Optimization failed',
        message: err?.message || 'Could not optimize RAM'
      })
    }
    set({ isOptimizing: false })
  },

  clearOptimizeResult: () => set({ optimizeResult: null })
}))

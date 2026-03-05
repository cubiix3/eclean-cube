import { create } from 'zustand'

interface CPUResult {
  score: number
  timeMs: number
}

interface RAMResult {
  score: number
  timeMs: number
}

interface DiskResult {
  score: number
  writeMs: number
  readMs: number
  writeMBs: number
  readMBs: number
}

interface FullResult {
  cpu: CPUResult
  ram: RAMResult
  disk: DiskResult
  totalScore: number
  timestamp: number
}

interface BenchmarkState {
  cpuResult: CPUResult | null
  ramResult: RAMResult | null
  diskResult: DiskResult | null
  totalScore: number | null
  history: FullResult[]
  runningCPU: boolean
  runningRAM: boolean
  runningDisk: boolean
  runningAll: boolean

  runCPU: () => Promise<void>
  runRAM: () => Promise<void>
  runDisk: () => Promise<void>
  runAll: () => Promise<void>
  fetchHistory: () => Promise<void>
}

export const useBenchmarkStore = create<BenchmarkState>((set, get) => ({
  cpuResult: null,
  ramResult: null,
  diskResult: null,
  totalScore: null,
  history: [],
  runningCPU: false,
  runningRAM: false,
  runningDisk: false,
  runningAll: false,

  runCPU: async () => {
    set({ runningCPU: true })
    try {
      const result = await window.api.benchmark.cpu()
      set({ cpuResult: result })
    } finally {
      set({ runningCPU: false })
    }
  },

  runRAM: async () => {
    set({ runningRAM: true })
    try {
      const result = await window.api.benchmark.ram()
      set({ ramResult: result })
    } finally {
      set({ runningRAM: false })
    }
  },

  runDisk: async () => {
    set({ runningDisk: true })
    try {
      const result = await window.api.benchmark.disk()
      set({ diskResult: result })
    } finally {
      set({ runningDisk: false })
    }
  },

  runAll: async () => {
    set({ runningAll: true, runningCPU: true, runningRAM: true, runningDisk: true })
    try {
      const result = await window.api.benchmark.full()
      set({
        cpuResult: result.cpu,
        ramResult: result.ram,
        diskResult: result.disk,
        totalScore: result.totalScore
      })
      // Refresh history
      await get().fetchHistory()
    } finally {
      set({ runningAll: false, runningCPU: false, runningRAM: false, runningDisk: false })
    }
  },

  fetchHistory: async () => {
    try {
      const history = await window.api.benchmark.history()
      set({ history })
    } catch {
      set({ history: [] })
    }
  }
}))

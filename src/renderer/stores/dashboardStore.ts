import { create } from 'zustand'

interface SystemOverview {
  cpu: { name: string; usage: number; temp: number | null }
  ram: { total: number; used: number; percent: number }
  gpu: { name: string; usage: number | null; temp: number | null }
  disk: { total: number; used: number; percent: number }
}

interface SensorDataPoint {
  timestamp: number
  cpu: number
  ram: number
}

interface DashboardState {
  overview: SystemOverview | null
  sensorHistory: SensorDataPoint[]
  healthScore: number
  isLoading: boolean

  fetchOverview: () => Promise<void>
  addSensorData: (data: SensorDataPoint) => void
  calculateHealthScore: () => void
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  overview: null,
  sensorHistory: [],
  healthScore: -1,
  isLoading: true,

  fetchOverview: async () => {
    set({ isLoading: true })
    const overview = await window.api.system.getOverview()
    set({ overview, isLoading: false })
    get().calculateHealthScore()
  },

  addSensorData: (data) => {
    set((state) => {
      const history = [...state.sensorHistory, data]
      if (history.length > 60) history.shift()
      return { sensorHistory: history }
    })
  },

  calculateHealthScore: () => {
    const { overview } = get()
    if (!overview) return

    let score = 100
    if (overview.disk.percent > 90) score -= 30
    else if (overview.disk.percent > 75) score -= 15
    if (overview.ram.percent > 85) score -= 20
    else if (overview.ram.percent > 70) score -= 10
    if (overview.cpu.usage > 80) score -= 15
    else if (overview.cpu.usage > 60) score -= 8

    set({ healthScore: Math.max(0, Math.min(100, score)) })
  }
}))

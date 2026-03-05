import { create } from 'zustand'

interface HardwareState {
  hardwareInfo: HardwareInfo | null
  sensorHistory: DetailedSensors[]
  activeTab: 'info' | 'sensors' | 'network' | 'diskHealth'
  isLoading: boolean

  fetchHardwareInfo: () => Promise<void>
  addSensorData: (data: DetailedSensors) => void
  setActiveTab: (tab: 'info' | 'sensors' | 'network' | 'diskHealth') => void
}

export const useHardwareStore = create<HardwareState>((set) => ({
  hardwareInfo: null,
  sensorHistory: [],
  activeTab: 'info',
  isLoading: true,

  fetchHardwareInfo: async () => {
    set({ isLoading: true })
    try {
      const info = await window.api.hardware.getInfo()
      set({ hardwareInfo: info, isLoading: false })
    } catch (err) {
      console.error('Failed to fetch hardware info:', err)
      set({ isLoading: false })
    }
  },

  addSensorData: (data) => {
    set((state) => {
      const history = [...state.sensorHistory, data]
      if (history.length > 30) history.shift()
      return { sensorHistory: history }
    })
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab })
  }
}))

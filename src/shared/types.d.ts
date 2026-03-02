interface WindowAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  onMaximizeChange: (callback: (maximized: boolean) => void) => void
}

interface SystemAPI {
  getOverview: () => Promise<SystemOverview>
  startSensorStream: () => void
  stopSensorStream: () => void
  onSensorData: (callback: (data: SensorData) => void) => void
}

interface SystemOverview {
  cpu: { name: string; usage: number; temp: number | null }
  ram: { total: number; used: number; percent: number }
  gpu: { name: string; usage: number | null; temp: number | null }
  disk: { total: number; used: number; percent: number }
}

interface SensorData {
  timestamp: number
  cpu: number
  ram: number
}

interface ElectronAPI {
  window: WindowAPI
  system: SystemAPI
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}

export {}

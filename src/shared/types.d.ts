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

interface HardwareCpuInfo {
  name: string
  cores: number
  threads: number
  baseClockMHz: number
  maxClockMHz: number
  l2CacheKB: number
  l3CacheKB: number
}

interface HardwareGpuInfo {
  name: string
  vramBytes: number
  driverVersion: string
}

interface HardwareRamModule {
  capacityGB: number
  speedMHz: number
  slot: string
  manufacturer: string
}

interface HardwareRamInfo {
  totalGB: number
  modules: HardwareRamModule[]
}

interface HardwareStorageInfo {
  model: string
  sizeGB: number
  mediaType: string
  interface: string
}

interface HardwareNetworkInfo {
  name: string
  mac: string
  ip: string[]
  dhcp: boolean
}

interface HardwareMotherboardInfo {
  manufacturer: string
  model: string
  biosVersion: string
}

interface HardwareOsInfo {
  name: string
  version: string
  build: string
  arch: string
}

interface HardwareInfo {
  cpu: HardwareCpuInfo
  gpu: HardwareGpuInfo[]
  ram: HardwareRamInfo
  storage: HardwareStorageInfo[]
  network: HardwareNetworkInfo[]
  motherboard: HardwareMotherboardInfo
  os: HardwareOsInfo
}

interface DetailedSensors {
  timestamp: number
  cpuCores: { name: string; usage: number }[]
  cpuFreqMHz: number
  ramUsedGB: number
  ramAvailGB: number
  netAdapters: { name: string; recvBytesPerSec: number; sentBytesPerSec: number }[]
  diskIO: { name: string; readBytesPerSec: number; writeBytesPerSec: number }[]
}

interface HardwareAPI {
  getInfo: () => Promise<HardwareInfo>
  startSensors: () => void
  stopSensors: () => void
  onSensorData: (callback: (data: DetailedSensors) => void) => void
}

interface ElectronAPI {
  window: WindowAPI
  system: SystemAPI
  hardware: HardwareAPI
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}

export {}

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

interface CleanerJunkItem {
  path: string
  name: string
  size: number
  selected: boolean
}

interface CleanerJunkCategory {
  id: string
  name: string
  items: CleanerJunkItem[]
  totalSize: number
}

interface CleanerLargeFile {
  path: string
  name: string
  size: number
  modified: string
}

interface CleanerCleanResult {
  cleaned: number
  errors: string[]
}

interface CleanerShredResult {
  success: string[]
  errors: string[]
}

interface CleanerAPI {
  scanCategory: (categoryId: string) => Promise<CleanerJunkCategory>
  scanAll: () => Promise<CleanerJunkCategory[]>
  clean: (paths: string[]) => Promise<CleanerCleanResult>
  findLargeFiles: (drive: string, minSize: number) => Promise<CleanerLargeFile[]>
  getDrives: () => Promise<string[]>
  getRecycleBinSize: () => Promise<number>
  emptyRecycleBin: () => Promise<void>
  shredFiles: (filePaths: string[]) => Promise<CleanerShredResult>
  openFolder: (filePath: string) => void
  deleteFile: (filePath: string) => Promise<void>
  openFileDialog: () => Promise<string[]>
}

// ──────────────────────────────────────────────
// Booster Types
// ──────────────────────────────────────────────

interface BoosterStartupApp {
  name: string
  command: string
  location: string
  user: string
  enabled: boolean
  publisher: string
  impact: 'High' | 'Medium' | 'Low'
}

interface BoosterWindowsService {
  name: string
  displayName: string
  status: string
  startType: string
  safeToDisable: boolean
}

interface BoosterDNSConfig {
  interfaceAlias: string
  interfaceIndex: number
  serverAddresses: string[]
}

interface BoosterScheduledTask {
  taskName: string
  taskPath: string
  state: string
  description: string
}

interface BoosterAPI {
  getStartupApps: () => Promise<BoosterStartupApp[]>
  setStartupEnabled: (name: string, command: string, location: string, enabled: boolean) => Promise<void>
  getServices: () => Promise<BoosterWindowsService[]>
  setServiceStartType: (name: string, startType: string) => Promise<void>
  getCurrentDNS: () => Promise<BoosterDNSConfig[]>
  setDNS: (interfaceIndex: number, primary: string, secondary: string) => Promise<void>
  pingDNS: (server: string) => Promise<number>
  getScheduledTasks: () => Promise<BoosterScheduledTask[]>
  setTaskEnabled: (taskName: string, taskPath: string, enabled: boolean) => Promise<void>
}

interface ElectronAPI {
  window: WindowAPI
  system: SystemAPI
  hardware: HardwareAPI
  cleaner: CleanerAPI
  booster: BoosterAPI
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}

export {}

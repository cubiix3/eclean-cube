interface WindowAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  onMaximizeChange: (callback: (maximized: boolean) => void) => void
}

interface SystemAPI {
  getOverview: () => Promise<SystemOverview>
  isAdmin: () => Promise<boolean>
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

interface DiskHealthInfo {
  name: string
  healthStatus: 'Healthy' | 'Warning' | 'Unhealthy' | 'Unknown'
  size: number
  mediaType: string
  operationalStatus: string
  predictFailure: boolean
}

interface HardwareAPI {
  getInfo: () => Promise<HardwareInfo>
  startSensors: () => void
  stopSensors: () => void
  onSensorData: (callback: (data: DetailedSensors) => void) => void
  getDiskHealth: () => Promise<DiskHealthInfo[]>
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

interface BoosterBootTimeEntry {
  date: string
  bootDurationSeconds: number
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
  getBootTimes: () => Promise<BoosterBootTimeEntry[]>
}

// ──────────────────────────────────────────────
// Optimizer Types
// ──────────────────────────────────────────────

interface OptimizerTweakDefinition {
  id: string
  name: string
  description: string
  category: string
  riskLevel: 'safe' | 'moderate' | 'advanced'
  checkCommand: string
  applyCommand: string
  revertCommand: string
}

interface OptimizerCategoryDefinition {
  id: string
  name: string
  description: string
  icon: string
}

interface OptimizerBackupEntry {
  originalValue: string
  appliedAt: number
}

type OptimizerBackupData = Record<string, OptimizerBackupEntry>

interface OptimizerApplyResult {
  success: boolean
  error?: string
}

interface OptimizerAPI {
  getTweaks: () => Promise<OptimizerTweakDefinition[]>
  getCategories: () => Promise<OptimizerCategoryDefinition[]>
  checkCategory: (categoryId: string) => Promise<Record<string, boolean>>
  checkAll: () => Promise<Record<string, boolean>>
  applyTweak: (tweakId: string) => Promise<OptimizerApplyResult>
  applyTweaks: (tweakIds: string[]) => Promise<Record<string, OptimizerApplyResult>>
  revertTweak: (tweakId: string) => Promise<OptimizerApplyResult>
  revertAll: () => Promise<Record<string, OptimizerApplyResult>>
  getBackup: () => Promise<OptimizerBackupData>
}

// ──────────────────────────────────────────────
// Uninstaller Types
// ──────────────────────────────────────────────

interface UninstallerInstalledApp {
  DisplayName: string
  DisplayVersion: string | null
  Publisher: string | null
  InstallDate: string | null
  EstimatedSize: number | null
  UninstallString: string | null
  InstallLocation: string | null
}

interface UninstallerUwpApp {
  Name: string
  PackageFullName: string
  Version: string
  Publisher: string
  InstallLocation: string | null
}

interface UninstallerBrowserExtension {
  id: string
  name: string
  version: string
  description: string
  browser: string
}

interface UninstallerLeftoverItem {
  path: string
  type: 'file' | 'registry'
  confidence: 'high' | 'medium' | 'low'
  size?: number
}

interface UninstallerHistoryEntry {
  appName: string
  timestamp: number
  type: 'win32' | 'uwp'
}

interface UninstallerCleanResult {
  success: string[]
  errors: string[]
}

interface UninstallerResult {
  success: boolean
  error?: string
}

interface ExtensionSecurityInfo {
  id: string
  name: string
  browser: string
  version: string
  permissions: string[]
  riskScore: number
  riskLevel: 'safe' | 'moderate' | 'dangerous'
  warnings: string[]
}

interface UninstallerAPI {
  getApps: () => Promise<UninstallerInstalledApp[]>
  uninstall: (uninstallString: string, appName: string) => Promise<UninstallerResult>
  getUwpApps: () => Promise<UninstallerUwpApp[]>
  removeUwp: (packageFullName: string, appName: string) => Promise<UninstallerResult>
  getExtensions: () => Promise<UninstallerBrowserExtension[]>
  openExtensionsPage: (browser: string) => Promise<void>
  scanLeftovers: (appName: string) => Promise<UninstallerLeftoverItem[]>
  cleanLeftovers: (items: { path: string; type: 'file' | 'registry' }[]) => Promise<UninstallerCleanResult>
  getHistory: () => Promise<UninstallerHistoryEntry[]>
  scanExtensionSecurity: () => Promise<ExtensionSecurityInfo[]>
}

// ──────────────────────────────────────────────
// Process Manager Types
// ──────────────────────────────────────────────

interface ProcessInfo {
  pid: number
  name: string
  cpu: number
  ram: number
  status: string
}

interface ProcessKillResult {
  success: boolean
  error?: string
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

interface ProcessAPI {
  getAll: () => Promise<ProcessInfo[]>
  kill: (pid: number) => Promise<ProcessKillResult>
  getCount: () => Promise<number>
  getRAMDetails: () => Promise<RAMDetails>
  optimizeRAM: () => Promise<RAMOptimizeResult>
  setAffinity: (pid: number, coreMask: number) => Promise<{ success: boolean; error?: string }>
  setPriority: (pid: number, priority: string) => Promise<{ success: boolean; error?: string }>
  getCoreCount: () => Promise<number>
}

// ──────────────────────────────────────────────
// Duplicate Finder Types
// ──────────────────────────────────────────────

interface DuplicateFile {
  path: string
  modified: string
}

interface DuplicateGroup {
  name: string
  size: number
  files: DuplicateFile[]
}

interface DuplicateDeleteResult {
  deleted: number
  errors: string[]
}

interface DuplicateAPI {
  find: (directory: string, minSizeMB: number) => Promise<DuplicateGroup[]>
  delete: (paths: string[]) => Promise<DuplicateDeleteResult>
  getDrives: () => Promise<string[]>
  browseDirectory: () => Promise<string | null>
}

// ──────────────────────────────────────────────
// Network Monitor Types
// ──────────────────────────────────────────────

interface NetworkAdapterStats {
  name: string
  bytesReceivedPerSec: number
  bytesSentPerSec: number
  currentBandwidth: number
}

interface NetworkConnectionInfo {
  connections: number
  publicIP: string
}

interface NetworkAPI {
  getStats: () => Promise<NetworkAdapterStats[]>
  getConnectionInfo: () => Promise<NetworkConnectionInfo>
  startMonitor: () => void
  stopMonitor: () => void
  onStats: (callback: (data: NetworkAdapterStats[]) => void) => void
}

// ──────────────────────────────────────────────
// Benchmark Types
// ──────────────────────────────────────────────

interface BenchmarkCPUResult {
  score: number
  timeMs: number
}

interface BenchmarkRAMResult {
  score: number
  timeMs: number
}

interface BenchmarkDiskResult {
  score: number
  writeMs: number
  readMs: number
  writeMBs: number
  readMBs: number
}

interface BenchmarkFullResult {
  cpu: BenchmarkCPUResult
  ram: BenchmarkRAMResult
  disk: BenchmarkDiskResult
  totalScore: number
  timestamp: number
}

interface BenchmarkAPI {
  cpu: () => Promise<BenchmarkCPUResult>
  ram: () => Promise<BenchmarkRAMResult>
  disk: () => Promise<BenchmarkDiskResult>
  full: () => Promise<BenchmarkFullResult>
  history: () => Promise<BenchmarkFullResult[]>
}

// ──────────────────────────────────────────────
// Gaming Mode Types
// ──────────────────────────────────────────────

interface GamingModeResult {
  killedProcesses: number
  freedRAM: number
  powerPlan: string
}

interface GamingDeactivateResult {
  restored: boolean
}

interface GamingAPI {
  activate: () => Promise<GamingModeResult>
  deactivate: () => Promise<GamingDeactivateResult>
  isActive: () => Promise<boolean>
}

// ──────────────────────────────────────────────
// Settings Types
// ──────────────────────────────────────────────

interface AppSettings {
  general: {
    launchAtStartup: boolean
    minimizeToTray: boolean
    showNotifications: boolean
    autoCleanOnStart: boolean
    autoOptimizeOnStart: boolean
  }
  appearance: {
    accentColor: string
    theme: 'dark' | 'light'
    animations: boolean
    compactMode: boolean
  }
  cleaner: {
    autoScan: boolean
    safeDeleteOnly: boolean
  }
  advanced: {
    confirmDangerousActions: boolean
    keepBackupDays: number
  }
  monitoring: {
    tempAlertsEnabled: boolean
    cpuThreshold: number
    gpuThreshold: number
  }
}

// ──────────────────────────────────────────────
// Temperature Alert Types
// ──────────────────────────────────────────────

interface TempWarning {
  type: 'cpu' | 'gpu'
  temp: number
  threshold: number
  message: string
}

interface AlertsAPI {
  startMonitoring: (cpuThreshold: number, gpuThreshold: number) => Promise<void>
  stopMonitoring: () => Promise<void>
  setThresholds: (cpu: number, gpu: number) => Promise<void>
  onTempWarning: (callback: (data: TempWarning) => void) => void
  removeTempWarningListener: () => void
}

interface SettingsAPI {
  get: () => Promise<AppSettings>
  update: (partial: Partial<AppSettings>) => Promise<AppSettings>
  reset: () => Promise<AppSettings>
}

// ──────────────────────────────────────────────
// Tray Types
// ──────────────────────────────────────────────

interface TrayAPI {
  updateHealthScore: (score: number) => void
  onQuickClean: (callback: () => void) => void
}

// ──────────────────────────────────────────────
// Widget Types
// ──────────────────────────────────────────────

interface WidgetAPI {
  open: () => Promise<void>
  close: () => Promise<void>
  isOpen: () => Promise<boolean>
}

// ──────────────────────────────────────────────
// Scheduler Types
// ──────────────────────────────────────────────

interface Schedule {
  id: string
  name: string
  type: 'cleanup' | 'optimize'
  frequency: 'daily' | 'weekly' | 'monthly'
  enabled: boolean
  lastRun: number | null
  nextRun: number
}

interface SchedulerAPI {
  getAll: () => Promise<Schedule[]>
  add: (schedule: Omit<Schedule, 'id' | 'lastRun' | 'nextRun'>) => Promise<Schedule>
  remove: (id: string) => Promise<void>
  update: (id: string, updates: Partial<Schedule>) => Promise<Schedule>
  runNow: (id: string) => Promise<{ success: boolean; message: string }>
}

// ──────────────────────────────────────────────
// Privacy Eraser Types
// ──────────────────────────────────────────────

interface BrowserDataInfo {
  name: string
  profilePath: string
  hasHistory: boolean
  hasCookies: boolean
  hasCache: boolean
  hasSessions: boolean
  hasPasswords: boolean
  dataSize: number
}

interface PrivacyAPI {
  getBrowserData: () => Promise<BrowserDataInfo[]>
  erase: (browsers: string[], types: string[]) => Promise<{ cleaned: number; errors: string[] }>
}

// ──────────────────────────────────────────────
// Report Types
// ──────────────────────────────────────────────

interface ReportAPI {
  generate: () => Promise<{ path: string; success: boolean }>
  generateAndOpen: () => Promise<{ path: string; success: boolean }>
}

// ──────────────────────────────────────────────
// Auto Startup Types
// ──────────────────────────────────────────────

interface AutoAPI {
  onCleanResult: (callback: (data: { cleaned: number; errors: string[] }) => void) => void
  onOptimizeResult: (callback: (data: { applied: number; errors: string[] }) => void) => void
}

// ──────────────────────────────────────────────
// Registry Cleaner Types
// ──────────────────────────────────────────────

interface RegistryIssue {
  path: string
  name: string
  type: string
  description: string
  severity: 'safe' | 'moderate' | 'risky'
}

interface RegistryScanResult {
  issues: RegistryIssue[]
  scannedKeys: number
  scanTimeMs: number
}

interface RegistryAPI {
  scan: () => Promise<RegistryScanResult>
  fix: (issues: { path: string; type: string }[]) => Promise<{ fixed: number; errors: string[] }>
}

// ──────────────────────────────────────────────
// Disk Maintenance Types
// ──────────────────────────────────────────────

interface DiskDriveInfo {
  letter: string
  label: string
  mediaType: string
  sizeGB: number
  freeGB: number
  lastOptimized: string | null
}

interface DefragResult {
  drive: string
  success: boolean
  type: 'trim' | 'defrag'
  message: string
}

interface DiskMaintenanceAPI {
  getDrives: () => Promise<DiskDriveInfo[]>
  optimize: (driveLetter: string) => Promise<DefragResult>
  analyze: (driveLetter: string) => Promise<{ fragmentPercent: number; status: string }>
}

// ──────────────────────────────────────────────
// File Monitor Types
// ──────────────────────────────────────────────

interface FileChangeEvent {
  type: 'rename' | 'change'
  path: string
  filename: string
  timestamp: number
  sizeBytes?: number
}

interface FileMonitorAPI {
  start: (directory: string) => Promise<{ success: boolean; error?: string }>
  stop: (directory: string) => Promise<void>
  stopAll: () => Promise<void>
  getWatched: () => Promise<string[]>
  getChanges: () => Promise<FileChangeEvent[]>
  clear: () => Promise<void>
  browseDirectory: () => Promise<string | null>
  onChange: (callback: (data: FileChangeEvent) => void) => void
}

// ──────────────────────────────────────────────
// Logs Types
// ──────────────────────────────────────────────

interface LogEntry {
  timestamp: number
  level: 'info' | 'warn' | 'error' | 'success'
  category: string
  message: string
  details?: string
}

interface LogsAPI {
  get: (limit?: number, category?: string) => Promise<LogEntry[]>
  getFiles: () => Promise<{ name: string; size: number; date: string }[]>
  getByDate: (date: string) => Promise<LogEntry[]>
  clear: () => Promise<void>
  export: (date?: string) => Promise<string>
}

// ──────────────────────────────────────────────
// Health Fix Types
// ──────────────────────────────────────────────

interface HealthFixResult {
  junkCleaned: number
  junkErrors: number
  tweaksApplied: number
  tweakErrors: number
  ramFreedMB: number
}

interface UpdaterAPI {
  check: () => Promise<void>
  download: () => Promise<void>
  install: () => void
  onStatus: (callback: (data: any) => void) => void
}

interface HealthFixAPI {
  run: () => Promise<HealthFixResult>
  onProgress: (callback: (data: { step: string; progress: number }) => void) => void
}

// ──────────────────────────────────────────────
// Recommendation Types
// ──────────────────────────────────────────────

interface Recommendation {
  id: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  category: 'cleanup' | 'performance' | 'security' | 'startup'
  action: string
  actionLabel: string
}

interface RecommendationsAPI {
  get: () => Promise<Recommendation[]>
}

interface ElectronAPI {
  window: WindowAPI
  system: SystemAPI
  hardware: HardwareAPI
  cleaner: CleanerAPI
  booster: BoosterAPI
  optimizer: OptimizerAPI
  uninstaller: UninstallerAPI
  process: ProcessAPI
  gaming: GamingAPI
  benchmark: BenchmarkAPI
  settings: SettingsAPI
  duplicate: DuplicateAPI
  network: NetworkAPI
  alerts: AlertsAPI
  widget: WidgetAPI
  tray: TrayAPI
  scheduler: SchedulerAPI
  privacy: PrivacyAPI
  report: ReportAPI
  registry: RegistryAPI
  disk: DiskMaintenanceAPI
  fileMonitor: FileMonitorAPI
  updater: UpdaterAPI
  healthFix: HealthFixAPI
  logs: LogsAPI
  recommendations: RecommendationsAPI
  auto: AutoAPI
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}

export {}

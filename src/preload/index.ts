import { contextBridge, ipcRenderer } from 'electron'

const api = {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximizeChange: (callback: (maximized: boolean) => void) => {
      ipcRenderer.removeAllListeners('window:maximized')
      ipcRenderer.removeAllListeners('window:unmaximized')
      ipcRenderer.on('window:maximized', () => callback(true))
      ipcRenderer.on('window:unmaximized', () => callback(false))
    }
  },
  system: {
    getOverview: () => ipcRenderer.invoke('system:getOverview'),
    isAdmin: () => ipcRenderer.invoke('system:isAdmin'),
    startSensorStream: () => ipcRenderer.send('system:startSensorStream'),
    stopSensorStream: () => ipcRenderer.send('system:stopSensorStream'),
    onSensorData: (callback: (data: { timestamp: number; cpu: number; ram: number }) => void) => {
      ipcRenderer.on('system:sensorData', (_event, data) => callback(data))
    },
    removeSensorListener: () => {
      ipcRenderer.removeAllListeners('system:sensorData')
    }
  },
  hardware: {
    getInfo: () => ipcRenderer.invoke('hardware:getInfo'),
    startSensors: () => ipcRenderer.send('hardware:startSensors'),
    stopSensors: () => ipcRenderer.send('hardware:stopSensors'),
    onSensorData: (callback: (data: DetailedSensors) => void) => {
      ipcRenderer.on('hardware:sensorData', (_event, data) => callback(data))
    },
    removeSensorListener: () => {
      ipcRenderer.removeAllListeners('hardware:sensorData')
    },
    getDiskHealth: () => ipcRenderer.invoke('hardware:getDiskHealth')
  },
  cleaner: {
    scanCategory: (categoryId: string) => ipcRenderer.invoke('cleaner:scanCategory', categoryId),
    scanAll: () => ipcRenderer.invoke('cleaner:scanAll'),
    clean: (paths: string[]) => ipcRenderer.invoke('cleaner:clean', paths),
    findLargeFiles: (drive: string, minSize: number) =>
      ipcRenderer.invoke('cleaner:findLargeFiles', drive, minSize),
    getDrives: () => ipcRenderer.invoke('cleaner:getDrives'),
    getRecycleBinSize: () => ipcRenderer.invoke('cleaner:getRecycleBinSize'),
    emptyRecycleBin: () => ipcRenderer.invoke('cleaner:emptyRecycleBin'),
    shredFiles: (filePaths: string[]) => ipcRenderer.invoke('cleaner:shredFiles', filePaths),
    openFolder: (filePath: string) => ipcRenderer.send('cleaner:openFolder', filePath),
    deleteFile: (filePath: string) => ipcRenderer.invoke('cleaner:deleteFile', filePath),
    openFileDialog: () => ipcRenderer.invoke('cleaner:openFileDialog')
  },
  booster: {
    getStartupApps: () => ipcRenderer.invoke('booster:getStartupApps'),
    setStartupEnabled: (name: string, command: string, location: string, enabled: boolean) =>
      ipcRenderer.invoke('booster:setStartupEnabled', name, command, location, enabled),
    getServices: () => ipcRenderer.invoke('booster:getServices'),
    setServiceStartType: (name: string, startType: string) =>
      ipcRenderer.invoke('booster:setServiceStartType', name, startType),
    getCurrentDNS: () => ipcRenderer.invoke('booster:getCurrentDNS'),
    setDNS: (interfaceIndex: number, primary: string, secondary: string) =>
      ipcRenderer.invoke('booster:setDNS', interfaceIndex, primary, secondary),
    pingDNS: (server: string) => ipcRenderer.invoke('booster:pingDNS', server),
    getScheduledTasks: () => ipcRenderer.invoke('booster:getScheduledTasks'),
    setTaskEnabled: (taskName: string, taskPath: string, enabled: boolean) =>
      ipcRenderer.invoke('booster:setTaskEnabled', taskName, taskPath, enabled),
    getBootTimes: () => ipcRenderer.invoke('booster:getBootTimes')
  },
  optimizer: {
    getTweaks: () => ipcRenderer.invoke('optimizer:getTweaks'),
    getCategories: () => ipcRenderer.invoke('optimizer:getCategories'),
    checkCategory: (categoryId: string) => ipcRenderer.invoke('optimizer:checkCategory', categoryId),
    checkAll: () => ipcRenderer.invoke('optimizer:checkAll'),
    applyTweak: (tweakId: string) => ipcRenderer.invoke('optimizer:applyTweak', tweakId),
    applyTweaks: (tweakIds: string[]) => ipcRenderer.invoke('optimizer:applyTweaks', tweakIds),
    revertTweak: (tweakId: string) => ipcRenderer.invoke('optimizer:revertTweak', tweakId),
    revertAll: () => ipcRenderer.invoke('optimizer:revertAll'),
    getBackup: () => ipcRenderer.invoke('optimizer:getBackup')
  },
  uninstaller: {
    getApps: () => ipcRenderer.invoke('uninstaller:getApps'),
    uninstall: (uninstallString: string, appName: string) =>
      ipcRenderer.invoke('uninstaller:uninstall', uninstallString, appName),
    getUwpApps: () => ipcRenderer.invoke('uninstaller:getUwpApps'),
    removeUwp: (packageFullName: string, appName: string) =>
      ipcRenderer.invoke('uninstaller:removeUwp', packageFullName, appName),
    getExtensions: () => ipcRenderer.invoke('uninstaller:getExtensions'),
    openExtensionsPage: (browser: string) => ipcRenderer.invoke('uninstaller:openExtensionsPage', browser),
    scanLeftovers: (appName: string) => ipcRenderer.invoke('uninstaller:scanLeftovers', appName),
    cleanLeftovers: (items: { path: string; type: 'file' | 'registry' }[]) =>
      ipcRenderer.invoke('uninstaller:cleanLeftovers', items),
    getHistory: () => ipcRenderer.invoke('uninstaller:getHistory'),
    scanExtensionSecurity: () => ipcRenderer.invoke('uninstaller:scanExtensionSecurity')
  },
  process: {
    getAll: () => ipcRenderer.invoke('process:getAll'),
    kill: (pid: number) => ipcRenderer.invoke('process:kill', pid),
    getCount: () => ipcRenderer.invoke('process:getCount'),
    getRAMDetails: () => ipcRenderer.invoke('process:getRAMDetails'),
    optimizeRAM: () => ipcRenderer.invoke('process:optimizeRAM'),
    setAffinity: (pid: number, coreMask: number) => ipcRenderer.invoke('process:setAffinity', pid, coreMask),
    setPriority: (pid: number, priority: string) => ipcRenderer.invoke('process:setPriority', pid, priority),
    getCoreCount: () => ipcRenderer.invoke('process:getCoreCount')
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (partial: any) => ipcRenderer.invoke('settings:update', partial),
    reset: () => ipcRenderer.invoke('settings:reset')
  },
  duplicate: {
    find: (directory: string, minSizeMB: number) =>
      ipcRenderer.invoke('duplicate:find', directory, minSizeMB),
    delete: (paths: string[]) => ipcRenderer.invoke('duplicate:delete', paths),
    getDrives: () => ipcRenderer.invoke('duplicate:getDrives'),
    browseDirectory: () => ipcRenderer.invoke('duplicate:browseDirectory')
  },
  network: {
    getStats: () => ipcRenderer.invoke('network:getStats'),
    getConnectionInfo: () => ipcRenderer.invoke('network:getConnectionInfo'),
    startMonitor: () => ipcRenderer.send('network:startMonitor'),
    stopMonitor: () => ipcRenderer.send('network:stopMonitor'),
    onStats: (callback: (data: any) => void) => {
      ipcRenderer.on('network:stats', (_event, data) => callback(data))
    },
    removeStatsListener: () => {
      ipcRenderer.removeAllListeners('network:stats')
    }
  },
  gaming: {
    activate: () => ipcRenderer.invoke('gaming:activate'),
    deactivate: () => ipcRenderer.invoke('gaming:deactivate'),
    isActive: () => ipcRenderer.invoke('gaming:isActive')
  },
  benchmark: {
    cpu: () => ipcRenderer.invoke('benchmark:cpu'),
    ram: () => ipcRenderer.invoke('benchmark:ram'),
    disk: () => ipcRenderer.invoke('benchmark:disk'),
    full: () => ipcRenderer.invoke('benchmark:full'),
    history: () => ipcRenderer.invoke('benchmark:history')
  },
  widget: {
    open: () => ipcRenderer.invoke('widget:open'),
    close: () => ipcRenderer.invoke('widget:close'),
    isOpen: () => ipcRenderer.invoke('widget:isOpen')
  },
  alerts: {
    startMonitoring: (cpuThreshold: number, gpuThreshold: number) =>
      ipcRenderer.invoke('alerts:startMonitoring', cpuThreshold, gpuThreshold),
    stopMonitoring: () => ipcRenderer.invoke('alerts:stopMonitoring'),
    setThresholds: (cpu: number, gpu: number) =>
      ipcRenderer.invoke('alerts:setThresholds', cpu, gpu),
    onTempWarning: (callback: (data: any) => void) => {
      ipcRenderer.on('alerts:tempWarning', (_event, data) => callback(data))
    },
    removeTempWarningListener: () => {
      ipcRenderer.removeAllListeners('alerts:tempWarning')
    }
  },
  tray: {
    updateHealthScore: (score: number) => ipcRenderer.send('tray:updateHealthScore', score),
    onQuickClean: (callback: () => void) => {
      ipcRenderer.removeAllListeners('tray:quickClean')
      ipcRenderer.on('tray:quickClean', () => callback())
    }
  },
  scheduler: {
    getAll: () => ipcRenderer.invoke('scheduler:getAll'),
    add: (schedule: any) => ipcRenderer.invoke('scheduler:add', schedule),
    remove: (id: string) => ipcRenderer.invoke('scheduler:remove', id),
    update: (id: string, updates: any) => ipcRenderer.invoke('scheduler:update', id, updates),
    runNow: (id: string) => ipcRenderer.invoke('scheduler:runNow', id)
  },
  privacy: {
    getBrowserData: () => ipcRenderer.invoke('privacy:getBrowserData'),
    erase: (browsers: string[], types: string[]) =>
      ipcRenderer.invoke('privacy:erase', browsers, types)
  },
  report: {
    generate: () => ipcRenderer.invoke('report:generate'),
    generateAndOpen: () => ipcRenderer.invoke('report:generateAndOpen')
  },
  registry: {
    scan: () => ipcRenderer.invoke('registry:scan'),
    fix: (issues: { path: string; type: string }[]) => ipcRenderer.invoke('registry:fix', issues)
  },
  disk: {
    getDrives: () => ipcRenderer.invoke('disk:getDrives'),
    optimize: (driveLetter: string) => ipcRenderer.invoke('disk:optimize', driveLetter),
    analyze: (driveLetter: string) => ipcRenderer.invoke('disk:analyze', driveLetter)
  },
  fileMonitor: {
    start: (directory: string) => ipcRenderer.invoke('fileMonitor:start', directory),
    stop: (directory: string) => ipcRenderer.invoke('fileMonitor:stop', directory),
    stopAll: () => ipcRenderer.invoke('fileMonitor:stopAll'),
    getWatched: () => ipcRenderer.invoke('fileMonitor:getWatched'),
    getChanges: () => ipcRenderer.invoke('fileMonitor:getChanges'),
    clear: () => ipcRenderer.invoke('fileMonitor:clear'),
    browseDirectory: () => ipcRenderer.invoke('fileMonitor:browseDirectory'),
    onChange: (callback: (data: any) => void) => {
      ipcRenderer.on('fileMonitor:change', (_event, data) => callback(data))
    },
    removeChangeListener: () => {
      ipcRenderer.removeAllListeners('fileMonitor:change')
    }
  },
  healthFix: {
    run: () => ipcRenderer.invoke('healthFix:run'),
    onProgress: (callback: (data: { step: string; progress: number }) => void) => {
      ipcRenderer.on('healthFix:progress', (_event, data) => callback(data))
    },
    removeProgressListener: () => {
      ipcRenderer.removeAllListeners('healthFix:progress')
    }
  },
  logs: {
    get: (limit?: number, category?: string) => ipcRenderer.invoke('logs:get', limit, category),
    getFiles: () => ipcRenderer.invoke('logs:getFiles'),
    getByDate: (date: string) => ipcRenderer.invoke('logs:getByDate', date),
    clear: () => ipcRenderer.invoke('logs:clear'),
    export: (date?: string) => ipcRenderer.invoke('logs:export', date)
  },
  diskTree: {
    scan: (rootPath: string) => ipcRenderer.invoke('diskTree:scan', rootPath),
    getDrives: () => ipcRenderer.invoke('diskTree:getDrives')
  },
  speedTest: {
    run: () => ipcRenderer.invoke('speedTest:run')
  },
  contextMenu: {
    getEntries: () => ipcRenderer.invoke('contextMenu:getEntries'),
    remove: (keyPath: string) => ipcRenderer.invoke('contextMenu:remove', keyPath)
  },
  restore: {
    getPoints: () => ipcRenderer.invoke('restore:getPoints'),
    create: (description: string) => ipcRenderer.invoke('restore:create', description),
    remove: (seqNumber: number) => ipcRenderer.invoke('restore:remove', seqNumber)
  },
  drivers: {
    scan: () => ipcRenderer.invoke('drivers:scan')
  },
  hosts: {
    getEntries: () => ipcRenderer.invoke('hosts:getEntries'),
    getRaw: () => ipcRenderer.invoke('hosts:getRaw'),
    add: (ip: string, hostname: string) => ipcRenderer.invoke('hosts:add', ip, hostname),
    remove: (lineIndex: number) => ipcRenderer.invoke('hosts:remove', lineIndex),
    toggle: (lineIndex: number) => ipcRenderer.invoke('hosts:toggle', lineIndex)
  },
  power: {
    getPlans: () => ipcRenderer.invoke('power:getPlans'),
    setActive: (guid: string) => ipcRenderer.invoke('power:setActive', guid),
    create: (name: string, sourceGuid: string) => ipcRenderer.invoke('power:create', name, sourceGuid),
    delete: (guid: string) => ipcRenderer.invoke('power:delete', guid)
  },
  rename: {
    preview: (dir: string, pattern: string, replacement: string, useRegex: boolean) =>
      ipcRenderer.invoke('rename:preview', dir, pattern, replacement, useRegex),
    execute: (dir: string, renames: { original: string; renamed: string }[]) =>
      ipcRenderer.invoke('rename:execute', dir, renames),
    browse: () => ipcRenderer.invoke('rename:browse')
  },
  winUpdate: {
    check: () => ipcRenderer.invoke('updates:check'),
    lastDate: () => ipcRenderer.invoke('updates:lastDate'),
    installed: () => ipcRenderer.invoke('updates:installed')
  },
  startupAnalyzer: {
    analyze: () => ipcRenderer.invoke('startup:analyze')
  },
  settingsIO: {
    exportJson: () => ipcRenderer.invoke('settings:export'),
    importJson: (json: string) => ipcRenderer.invoke('settings:import', json),
    exportDialog: () => ipcRenderer.invoke('settings:exportDialog'),
    importDialog: () => ipcRenderer.invoke('settings:importDialog')
  },
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install: () => ipcRenderer.invoke('updater:install'),
    onStatus: (callback: (data: any) => void) => {
      ipcRenderer.removeAllListeners('updater:status')
      ipcRenderer.on('updater:status', (_event, data) => callback(data))
    }
  },
  recommendations: {
    get: (): Promise<any[]> => ipcRenderer.invoke('recommendations:get'),
  },
  auto: {
    onCleanResult: (callback: (data: any) => void) => {
      ipcRenderer.removeAllListeners('auto:cleanResult')
      ipcRenderer.on('auto:cleanResult', (_event, data) => callback(data))
    },
    onOptimizeResult: (callback: (data: any) => void) => {
      ipcRenderer.removeAllListeners('auto:optimizeResult')
      ipcRenderer.on('auto:optimizeResult', (_event, data) => callback(data))
    }
  }
}

contextBridge.exposeInMainWorld('api', api)

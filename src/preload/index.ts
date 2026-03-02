import { contextBridge, ipcRenderer } from 'electron'

const api = {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximizeChange: (callback: (maximized: boolean) => void) => {
      ipcRenderer.on('window:maximized', () => callback(true))
      ipcRenderer.on('window:unmaximized', () => callback(false))
    }
  },
  system: {
    getOverview: () => ipcRenderer.invoke('system:getOverview'),
    startSensorStream: () => ipcRenderer.send('system:startSensorStream'),
    stopSensorStream: () => ipcRenderer.send('system:stopSensorStream'),
    onSensorData: (callback: (data: any) => void) => {
      ipcRenderer.on('system:sensorData', (_event, data) => callback(data))
    }
  },
  hardware: {
    getInfo: () => ipcRenderer.invoke('hardware:getInfo'),
    startSensors: () => ipcRenderer.send('hardware:startSensors'),
    stopSensors: () => ipcRenderer.send('hardware:stopSensors'),
    onSensorData: (callback: (data: any) => void) => {
      ipcRenderer.on('hardware:sensorData', (_event, data) => callback(data))
    }
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
    getHistory: () => ipcRenderer.invoke('uninstaller:getHistory')
  },
  process: {
    getAll: () => ipcRenderer.invoke('process:getAll'),
    kill: (pid: number) => ipcRenderer.invoke('process:kill', pid),
    getCount: () => ipcRenderer.invoke('process:getCount'),
    getRAMDetails: () => ipcRenderer.invoke('process:getRAMDetails'),
    optimizeRAM: () => ipcRenderer.invoke('process:optimizeRAM')
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
    }
  },
  tray: {
    updateHealthScore: (score: number) => ipcRenderer.send('tray:updateHealthScore', score),
    onQuickClean: (callback: () => void) => {
      ipcRenderer.on('tray:quickClean', () => callback())
    }
  }
}

contextBridge.exposeInMainWorld('api', api)

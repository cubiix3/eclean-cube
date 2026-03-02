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
  }
}

contextBridge.exposeInMainWorld('api', api)

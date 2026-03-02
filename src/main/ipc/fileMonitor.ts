import { ipcMain, dialog } from 'electron'
import { startWatching, stopWatching, stopAllWatchers, getWatchedDirectories, getRecentChanges, clearChanges } from '../services/fileMonitorService'
import { log } from '../services/logService'

export function registerFileMonitorIPC(): void {
  ipcMain.handle('fileMonitor:start', async (_event, directory: string) => {
    log('info', 'fileMonitor', `Starting watch on ${directory}`)
    return startWatching(directory)
  })

  ipcMain.handle('fileMonitor:stop', async (_event, directory: string) => {
    stopWatching(directory)
    log('info', 'fileMonitor', `Stopped watching ${directory}`)
  })

  ipcMain.handle('fileMonitor:stopAll', async () => {
    stopAllWatchers()
  })

  ipcMain.handle('fileMonitor:getWatched', async () => {
    return getWatchedDirectories()
  })

  ipcMain.handle('fileMonitor:getChanges', async () => {
    return getRecentChanges()
  })

  ipcMain.handle('fileMonitor:clear', async () => {
    clearChanges()
  })

  ipcMain.handle('fileMonitor:browseDirectory', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })
}

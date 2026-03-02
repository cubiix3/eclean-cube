import { ipcMain, BrowserWindow } from 'electron'
import { getNetworkStats, getConnectionInfo } from '../services/networkService'

let networkMonitorInterval: ReturnType<typeof setInterval> | null = null

export function registerNetworkIPC(): void {
  ipcMain.handle('network:getStats', async () => {
    return await getNetworkStats()
  })

  ipcMain.handle('network:getConnectionInfo', async () => {
    return await getConnectionInfo()
  })

  ipcMain.on('network:startMonitor', (event) => {
    if (networkMonitorInterval) clearInterval(networkMonitorInterval)
    networkMonitorInterval = setInterval(async () => {
      try {
        const stats = await getNetworkStats()
        const win = BrowserWindow.fromWebContents(event.sender)
        if (win && !win.isDestroyed()) {
          event.sender.send('network:stats', stats)
        }
      } catch {
        // Silently handle if window closed
      }
    }, 1000)
  })

  ipcMain.on('network:stopMonitor', () => {
    if (networkMonitorInterval) {
      clearInterval(networkMonitorInterval)
      networkMonitorInterval = null
    }
  })
}

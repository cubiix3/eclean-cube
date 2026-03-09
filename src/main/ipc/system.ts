import { ipcMain, BrowserWindow } from 'electron'
import { getSystemOverview, getCpuUsage, getRamUsage } from '../services/systemInfo'
import { isRunningAsAdmin } from '../services/powershell'

let sensorInterval: ReturnType<typeof setInterval> | null = null

export function registerSystemIPC(): void {
  ipcMain.handle('system:getOverview', async () => {
    try {
      return await getSystemOverview()
    } catch (err) {
      console.error('[IPC] system:getOverview failed:', err)
      return null
    }
  })

  ipcMain.on('system:startSensorStream', (event) => {
    if (sensorInterval) clearInterval(sensorInterval)

    sensorInterval = setInterval(async () => {
      try {
        const win = BrowserWindow.fromWebContents(event.sender)
        if (!win || win.isDestroyed()) {
          // Window is gone, stop the interval
          if (sensorInterval) {
            clearInterval(sensorInterval)
            sensorInterval = null
          }
          return
        }
        const [cpu, ram] = await Promise.all([getCpuUsage(), getRamUsage()])
        if (!event.sender.isDestroyed()) {
          event.sender.send('system:sensorData', {
            timestamp: Date.now(),
            cpu,
            ram
          })
        }
      } catch {
        // Silently handle if window closed
      }
    }, 2000)
  })

  ipcMain.on('system:stopSensorStream', () => {
    if (sensorInterval) {
      clearInterval(sensorInterval)
      sensorInterval = null
    }
  })

  ipcMain.handle('system:isAdmin', async () => {
    return await isRunningAsAdmin()
  })
}

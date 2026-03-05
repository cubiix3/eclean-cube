import { ipcMain, BrowserWindow } from 'electron'
import { getHardwareInfo, getDetailedSensors, getDiskHealth } from '../services/hardwareInfo'

let hwSensorInterval: ReturnType<typeof setInterval> | null = null

export function registerHardwareIPC(): void {
  ipcMain.handle('hardware:getInfo', async () => {
    try {
      return await getHardwareInfo()
    } catch (err) {
      console.error('[IPC] hardware:getInfo failed:', err)
      return null
    }
  })

  ipcMain.on('hardware:startSensors', (event) => {
    if (hwSensorInterval) clearInterval(hwSensorInterval)
    hwSensorInterval = setInterval(async () => {
      try {
        const data = await getDetailedSensors()
        const win = BrowserWindow.fromWebContents(event.sender)
        if (win && !win.isDestroyed()) {
          event.sender.send('hardware:sensorData', data)
        }
      } catch {
        // Silently handle if window closed
      }
    }, 2000)
  })

  ipcMain.on('hardware:stopSensors', () => {
    if (hwSensorInterval) {
      clearInterval(hwSensorInterval)
      hwSensorInterval = null
    }
  })

  ipcMain.handle('hardware:getDiskHealth', async () => {
    try {
      return await getDiskHealth()
    } catch (err) {
      console.error('[IPC] hardware:getDiskHealth failed:', err)
      return []
    }
  })
}

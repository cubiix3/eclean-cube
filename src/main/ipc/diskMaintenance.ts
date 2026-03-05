import { ipcMain } from 'electron'
import { getDrivesForMaintenance, optimizeDrive, analyzeDrive } from '../services/diskMaintenanceService'
import { log } from '../services/logService'

export function registerDiskMaintenanceIPC(): void {
  ipcMain.handle('disk:getDrives', async () => {
    try { return getDrivesForMaintenance() } catch (err) {
      console.error('[IPC] disk:getDrives failed:', err)
      return []
    }
  })

  ipcMain.handle('disk:optimize', async (_event, driveLetter: string) => {
    try {
      log('info', 'disk', `Optimizing drive ${driveLetter}:`)
      const result = await optimizeDrive(driveLetter)
      log(result.success ? 'success' : 'error', 'disk', result.message)
      return result
    } catch (err) {
      console.error('[IPC] disk:optimize failed:', err)
      return { success: false, message: 'Optimization failed' }
    }
  })

  ipcMain.handle('disk:analyze', async (_event, driveLetter: string) => {
    try { return analyzeDrive(driveLetter) } catch (err) {
      console.error('[IPC] disk:analyze failed:', err)
      return { fragmentation: 0, status: 'Error' }
    }
  })
}

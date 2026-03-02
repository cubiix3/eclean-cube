import { ipcMain } from 'electron'
import { getDrivesForMaintenance, optimizeDrive, analyzeDrive } from '../services/diskMaintenanceService'
import { log } from '../services/logService'

export function registerDiskMaintenanceIPC(): void {
  ipcMain.handle('disk:getDrives', async () => {
    return getDrivesForMaintenance()
  })

  ipcMain.handle('disk:optimize', async (_event, driveLetter: string) => {
    log('info', 'disk', `Optimizing drive ${driveLetter}:`)
    const result = await optimizeDrive(driveLetter)
    log(result.success ? 'success' : 'error', 'disk', result.message)
    return result
  })

  ipcMain.handle('disk:analyze', async (_event, driveLetter: string) => {
    return analyzeDrive(driveLetter)
  })
}

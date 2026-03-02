import { ipcMain } from 'electron'
import { activateGamingMode, deactivateGamingMode, isGamingModeActive } from '../services/gamingService'

export function registerGamingIPC(): void {
  ipcMain.handle('gaming:activate', async () => {
    return await activateGamingMode()
  })

  ipcMain.handle('gaming:deactivate', async () => {
    return await deactivateGamingMode()
  })

  ipcMain.handle('gaming:isActive', () => {
    return isGamingModeActive()
  })
}

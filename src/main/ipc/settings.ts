import { ipcMain } from 'electron'
import { getSettings, updateSettings, resetSettings, type AppSettings } from '../services/settingsService'

export function registerSettingsIPC(): void {
  ipcMain.handle('settings:get', async () => {
    return getSettings()
  })

  ipcMain.handle('settings:update', async (_event, partial: Partial<AppSettings>) => {
    return updateSettings(partial)
  })

  ipcMain.handle('settings:reset', async () => {
    return resetSettings()
  })
}

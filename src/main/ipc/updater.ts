import { ipcMain } from 'electron'
import { checkForUpdates, downloadUpdate, installUpdate, initAutoUpdater } from '../services/updaterService'

export function registerUpdaterIPC(): void {
  initAutoUpdater()

  // Auto-check for updates 10 seconds after launch
  setTimeout(() => {
    checkForUpdates()
  }, 10_000)

  ipcMain.handle('updater:check', async () => {
    await checkForUpdates()
  })

  ipcMain.handle('updater:download', async () => {
    await downloadUpdate()
  })

  ipcMain.handle('updater:install', () => {
    installUpdate()
  })
}

import { ipcMain } from 'electron'
import { getBrowserData, eraseBrowserData } from '../services/privacyService'

export function registerPrivacyIPC(): void {
  ipcMain.handle('privacy:getBrowserData', async () => {
    try { return getBrowserData() } catch (err) {
      console.error('[IPC] privacy:getBrowserData failed:', err)
      return []
    }
  })

  ipcMain.handle('privacy:erase', async (_event, browsers: string[], types: string[]) => {
    try { return await eraseBrowserData(browsers, types) } catch (err) {
      console.error('[IPC] privacy:erase failed:', err)
      return { success: false, error: 'Erase failed' }
    }
  })
}

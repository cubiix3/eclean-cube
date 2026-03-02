import { ipcMain } from 'electron'
import { getBrowserData, eraseBrowserData } from '../services/privacyService'

export function registerPrivacyIPC(): void {
  ipcMain.handle('privacy:getBrowserData', async () => {
    return getBrowserData()
  })

  ipcMain.handle('privacy:erase', async (_event, browsers: string[], types: string[]) => {
    return await eraseBrowserData(browsers, types)
  })
}

import { ipcMain, dialog } from 'electron'
import { findDuplicates, deleteDuplicates } from '../services/duplicateService'
import { getAvailableDrives } from '../services/cleanerService'

export function registerDuplicateIPC(): void {
  ipcMain.handle(
    'duplicate:find',
    async (_event, directory: string, minSizeMB: number) => {
      return await findDuplicates(directory, minSizeMB)
    }
  )

  ipcMain.handle('duplicate:delete', async (_event, paths: string[]) => {
    return await deleteDuplicates(paths)
  })

  ipcMain.handle('duplicate:getDrives', async () => {
    return await getAvailableDrives()
  })

  ipcMain.handle('duplicate:browseDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select directory to scan for duplicates'
    })
    return result.filePaths[0] || null
  })
}

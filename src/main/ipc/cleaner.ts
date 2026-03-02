import { ipcMain, shell, dialog } from 'electron'
import { handleWithValidation, validators } from './validate'
import {
  scanJunkCategory,
  cleanJunkItems,
  findLargeFiles,
  getRecycleBinSize,
  emptyRecycleBin,
  shredFiles,
  getAvailableDrives,
  deleteFile
} from '../services/cleanerService'

export function registerCleanerIPC(): void {
  ipcMain.handle('cleaner:scanCategory', async (_event, categoryId: string) => {
    return await scanJunkCategory(categoryId)
  })

  ipcMain.handle('cleaner:scanAll', async () => {
    const categories = await Promise.all([
      scanJunkCategory('browsers'),
      scanJunkCategory('system'),
      scanJunkCategory('apps'),
      scanJunkCategory('games')
    ])
    return categories
  })

  // Validated: paths must be string array
  handleWithValidation(
    'cleaner:clean',
    validators.stringArray,
    async (paths: string[]) => {
      return await cleanJunkItems(paths)
    }
  )

  ipcMain.handle(
    'cleaner:findLargeFiles',
    async (_event, drive: string, minSize: number) => {
      return await findLargeFiles(drive, minSize)
    }
  )

  ipcMain.handle('cleaner:getDrives', async () => {
    return await getAvailableDrives()
  })

  ipcMain.handle('cleaner:getRecycleBinSize', async () => {
    return await getRecycleBinSize()
  })

  ipcMain.handle('cleaner:emptyRecycleBin', async () => {
    await emptyRecycleBin()
  })

  // Validated: filePaths must be string array
  handleWithValidation(
    'cleaner:shredFiles',
    validators.stringArray,
    async (filePaths: string[]) => {
      return await shredFiles(filePaths)
    }
  )

  ipcMain.on('cleaner:openFolder', (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  // Validated: filePath must be string
  handleWithValidation(
    'cleaner:deleteFile',
    validators.string,
    async (filePath: string) => {
      await deleteFile(filePath)
    }
  )

  ipcMain.handle('cleaner:openFileDialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      title: 'Select files to shred'
    })
    return result.filePaths
  })
}

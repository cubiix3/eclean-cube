import { ipcMain } from 'electron'
import {
  getAllTweaks,
  getCategories,
  checkCategoryStatus,
  checkAllStatus,
  applyTweak,
  applyTweaks,
  revertTweak,
  revertAll,
  getBackupData
} from '../services/optimizerService'

export function registerOptimizerIPC(): void {
  ipcMain.handle('optimizer:getTweaks', async () => {
    return getAllTweaks()
  })

  ipcMain.handle('optimizer:getCategories', async () => {
    return getCategories()
  })

  ipcMain.handle('optimizer:checkCategory', async (_event, categoryId: string) => {
    return await checkCategoryStatus(categoryId)
  })

  ipcMain.handle('optimizer:checkAll', async () => {
    return await checkAllStatus()
  })

  ipcMain.handle('optimizer:applyTweak', async (_event, tweakId: string) => {
    return await applyTweak(tweakId)
  })

  ipcMain.handle('optimizer:applyTweaks', async (_event, tweakIds: string[]) => {
    return await applyTweaks(tweakIds)
  })

  ipcMain.handle('optimizer:revertTweak', async (_event, tweakId: string) => {
    return await revertTweak(tweakId)
  })

  ipcMain.handle('optimizer:revertAll', async () => {
    return await revertAll()
  })

  ipcMain.handle('optimizer:getBackup', async () => {
    return getBackupData()
  })
}

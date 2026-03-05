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
    try { return getAllTweaks() } catch { return [] }
  })

  ipcMain.handle('optimizer:getCategories', async () => {
    try { return getCategories() } catch { return [] }
  })

  ipcMain.handle('optimizer:checkCategory', async (_event, categoryId: string) => {
    try { return await checkCategoryStatus(categoryId) } catch (err) {
      console.error('[IPC] optimizer:checkCategory failed:', err)
      return {}
    }
  })

  ipcMain.handle('optimizer:checkAll', async () => {
    try { return await checkAllStatus() } catch (err) {
      console.error('[IPC] optimizer:checkAll failed:', err)
      return {}
    }
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
    try { return getBackupData() } catch { return {} }
  })
}

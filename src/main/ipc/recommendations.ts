import { ipcMain } from 'electron'
import { getRecommendations } from '../services/recommendationService'

export function registerRecommendationsIPC(): void {
  ipcMain.handle('recommendations:get', async () => {
    return await getRecommendations()
  })
}

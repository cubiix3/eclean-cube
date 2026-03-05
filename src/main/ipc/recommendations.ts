import { ipcMain } from 'electron'
import { getRecommendations } from '../services/recommendationService'

export function registerRecommendationsIPC(): void {
  ipcMain.handle('recommendations:get', async () => {
    try {
      return await getRecommendations()
    } catch (err) {
      console.error('Recommendations IPC error:', err)
      return []
    }
  })
}

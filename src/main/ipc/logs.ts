import { ipcMain } from 'electron'
import { getLogs, getLogFiles, getLogsByDate, clearLogs, exportLogs } from '../services/logService'

export function registerLogsIPC(): void {
  ipcMain.handle('logs:get', async (_event, limit?: number, category?: string) => {
    return getLogs(limit, category)
  })

  ipcMain.handle('logs:getFiles', async () => {
    return getLogFiles()
  })

  ipcMain.handle('logs:getByDate', async (_event, date: string) => {
    return getLogsByDate(date)
  })

  ipcMain.handle('logs:clear', async () => {
    clearLogs()
  })

  ipcMain.handle('logs:export', async (_event, date?: string) => {
    return exportLogs(date)
  })
}

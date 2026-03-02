import { ipcMain } from 'electron'
import { generateReport, generateAndOpenReport } from '../services/reportService'

export function registerReportIPC(): void {
  ipcMain.handle('report:generate', async () => {
    return await generateReport()
  })

  ipcMain.handle('report:generateAndOpen', async () => {
    return await generateAndOpenReport()
  })
}

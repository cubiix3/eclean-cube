import { ipcMain } from 'electron'
import {
  getProcesses,
  killProcess,
  getProcessCount,
  getRAMDetails,
  optimizeRAM
} from '../services/processService'

export function registerProcessIPC(): void {
  ipcMain.handle('process:getAll', async () => {
    return await getProcesses()
  })

  ipcMain.handle('process:kill', async (_event, pid: number) => {
    return await killProcess(pid)
  })

  ipcMain.handle('process:getCount', async () => {
    return await getProcessCount()
  })

  ipcMain.handle('process:getRAMDetails', async () => {
    return await getRAMDetails()
  })

  ipcMain.handle('process:optimizeRAM', async () => {
    return await optimizeRAM()
  })
}

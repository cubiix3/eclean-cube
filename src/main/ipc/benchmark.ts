import { ipcMain } from 'electron'
import {
  benchmarkCPU,
  benchmarkRAM,
  benchmarkDisk,
  runFullBenchmark,
  getBenchmarkHistory
} from '../services/benchmarkService'

export function registerBenchmarkIPC(): void {
  ipcMain.handle('benchmark:cpu', async () => {
    return await benchmarkCPU()
  })

  ipcMain.handle('benchmark:ram', async () => {
    return await benchmarkRAM()
  })

  ipcMain.handle('benchmark:disk', async () => {
    return await benchmarkDisk()
  })

  ipcMain.handle('benchmark:full', async () => {
    return await runFullBenchmark()
  })

  ipcMain.handle('benchmark:history', async () => {
    return await getBenchmarkHistory()
  })
}

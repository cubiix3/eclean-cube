import { ipcMain } from 'electron'
import { startTempMonitoring, stopTempMonitoring, setThresholds } from '../services/alertService'

export function registerAlertsIPC(): void {
  ipcMain.handle('alerts:startMonitoring', async (_event, cpuThreshold: number, gpuThreshold: number) => {
    startTempMonitoring(cpuThreshold, gpuThreshold)
  })

  ipcMain.handle('alerts:stopMonitoring', async () => {
    stopTempMonitoring()
  })

  ipcMain.handle('alerts:setThresholds', async (_event, cpu: number, gpu: number) => {
    setThresholds(cpu, gpu)
  })
}

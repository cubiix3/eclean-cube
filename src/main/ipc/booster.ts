import { ipcMain } from 'electron'
import {
  getStartupApps,
  setStartupEnabled,
  getServices,
  setServiceStartType,
  getCurrentDNS,
  setDNS,
  pingDNS,
  getScheduledTasks,
  setTaskEnabled,
  getBootTimes
} from '../services/boosterService'

export function registerBoosterIPC(): void {
  // Startup Apps
  ipcMain.handle('booster:getStartupApps', async () => {
    return await getStartupApps()
  })

  ipcMain.handle(
    'booster:setStartupEnabled',
    async (_event, name: string, command: string, location: string, enabled: boolean) => {
      await setStartupEnabled(name, command, location, enabled)
    }
  )

  // Windows Services
  ipcMain.handle('booster:getServices', async () => {
    return await getServices()
  })

  ipcMain.handle(
    'booster:setServiceStartType',
    async (_event, name: string, startType: 'Automatic' | 'Manual' | 'Disabled') => {
      await setServiceStartType(name, startType)
    }
  )

  // DNS Optimizer
  ipcMain.handle('booster:getCurrentDNS', async () => {
    return await getCurrentDNS()
  })

  ipcMain.handle(
    'booster:setDNS',
    async (_event, interfaceIndex: number, primary: string, secondary: string) => {
      await setDNS(interfaceIndex, primary, secondary)
    }
  )

  ipcMain.handle('booster:pingDNS', async (_event, server: string) => {
    return await pingDNS(server)
  })

  // Task Scheduler
  ipcMain.handle('booster:getScheduledTasks', async () => {
    return await getScheduledTasks()
  })

  ipcMain.handle(
    'booster:setTaskEnabled',
    async (_event, taskName: string, taskPath: string, enabled: boolean) => {
      await setTaskEnabled(taskName, taskPath, enabled)
    }
  )

  // Boot Time Tracker
  ipcMain.handle('booster:getBootTimes', async () => {
    return await getBootTimes()
  })
}

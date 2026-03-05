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
    try { return await getStartupApps() } catch (err) {
      console.error('[IPC] booster:getStartupApps failed:', err)
      return []
    }
  })

  ipcMain.handle(
    'booster:setStartupEnabled',
    async (_event, name: string, command: string, location: string, enabled: boolean) => {
      return await setStartupEnabled(name, command, location, enabled)
    }
  )

  // Windows Services
  ipcMain.handle('booster:getServices', async () => {
    try { return await getServices() } catch (err) {
      console.error('[IPC] booster:getServices failed:', err)
      return []
    }
  })

  ipcMain.handle(
    'booster:setServiceStartType',
    async (_event, name: string, startType: 'Automatic' | 'Manual' | 'Disabled') => {
      return await setServiceStartType(name, startType)
    }
  )

  // DNS Optimizer
  ipcMain.handle('booster:getCurrentDNS', async () => {
    try { return await getCurrentDNS() } catch (err) {
      console.error('[IPC] booster:getCurrentDNS failed:', err)
      return null
    }
  })

  ipcMain.handle(
    'booster:setDNS',
    async (_event, interfaceIndex: number, primary: string, secondary: string) => {
      return await setDNS(interfaceIndex, primary, secondary)
    }
  )

  ipcMain.handle('booster:pingDNS', async (_event, server: string) => {
    try { return await pingDNS(server) } catch { return { latency: -1 } }
  })

  // Task Scheduler
  ipcMain.handle('booster:getScheduledTasks', async () => {
    try { return await getScheduledTasks() } catch (err) {
      console.error('[IPC] booster:getScheduledTasks failed:', err)
      return []
    }
  })

  ipcMain.handle(
    'booster:setTaskEnabled',
    async (_event, taskName: string, taskPath: string, enabled: boolean) => {
      return await setTaskEnabled(taskName, taskPath, enabled)
    }
  )

  // Boot Time Tracker
  ipcMain.handle('booster:getBootTimes', async () => {
    try { return await getBootTimes() } catch (err) {
      console.error('[IPC] booster:getBootTimes failed:', err)
      return { current: null, history: [], avgMs: 0 }
    }
  })
}

import { ipcMain, dialog } from 'electron'
import { scanDiskTree } from '../services/diskTreeService'
import { runSpeedTest } from '../services/speedTestService'
import { getContextMenuEntries, removeContextMenuEntry } from '../services/contextMenuService'
import { getRestorePoints, createRestorePoint, removeRestorePoint } from '../services/restorePointService'
import { getDrivers } from '../services/driverService'
import { getHostsEntries, getHostsRaw, addHostEntry, removeHostEntry, toggleHostEntry } from '../services/hostsService'
import { getPowerPlans, setActivePlan, createPlan, deletePlan } from '../services/powerPlanService'
import { previewRename, executeRename } from '../services/batchRenameService'
import { checkForUpdates, getLastUpdateDate, getInstalledUpdates } from '../services/windowsUpdateService'
import { analyzeStartup } from '../services/startupAnalyzerService'
import { getSettings, updateSettings } from '../services/settingsService'
import { log } from '../services/logService'

export function registerToolsIPC(): void {
  // ── Disk Tree ──
  ipcMain.handle('diskTree:scan', async (_event, rootPath: string) => {
    log('info', 'diskTree', `Scanning ${rootPath}`)
    return scanDiskTree(rootPath)
  })
  ipcMain.handle('diskTree:getDrives', async () => {
    try {
      const { runPowerShell } = require('../services/powershell')
      const result = await runPowerShell(`Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | Select-Object -ExpandProperty DeviceID`)
      return result.split('\n').map((d: string) => d.trim()).filter(Boolean)
    } catch { return ['C:'] }
  })

  // ── Speed Test ──
  ipcMain.handle('speedTest:run', async () => {
    try {
      log('info', 'speedTest', 'Starting speed test')
      const result = await runSpeedTest()
      log('success', 'speedTest', `Download: ${result.downloadMbps} Mbps, Upload: ${result.uploadMbps} Mbps`)
      return result
    } catch (err) {
      console.error('[IPC] speedTest:run failed:', err)
      return { downloadMbps: 0, uploadMbps: 0, latencyMs: 0, server: 'failed' }
    }
  })

  // ── Context Menu ──
  ipcMain.handle('contextMenu:getEntries', async () => getContextMenuEntries())
  ipcMain.handle('contextMenu:remove', async (_event, keyPath: string) => {
    log('info', 'contextMenu', `Removing ${keyPath}`)
    return removeContextMenuEntry(keyPath)
  })

  // ── Restore Points ──
  ipcMain.handle('restore:getPoints', async () => getRestorePoints())
  ipcMain.handle('restore:create', async (_event, description: string) => {
    log('info', 'restore', `Creating restore point: ${description}`)
    return createRestorePoint(description)
  })
  ipcMain.handle('restore:remove', async (_event, seqNumber: number) => removeRestorePoint(seqNumber))

  // ── Drivers ──
  ipcMain.handle('drivers:scan', async () => {
    log('info', 'drivers', 'Scanning drivers')
    return getDrivers()
  })

  // ── Hosts File ──
  ipcMain.handle('hosts:getEntries', async () => getHostsEntries())
  ipcMain.handle('hosts:getRaw', async () => getHostsRaw())
  ipcMain.handle('hosts:add', async (_event, ip: string, hostname: string) => addHostEntry(ip, hostname))
  ipcMain.handle('hosts:remove', async (_event, lineIndex: number) => removeHostEntry(lineIndex))
  ipcMain.handle('hosts:toggle', async (_event, lineIndex: number) => toggleHostEntry(lineIndex))

  // ── Power Plans ──
  ipcMain.handle('power:getPlans', async () => getPowerPlans())
  ipcMain.handle('power:setActive', async (_event, guid: string) => setActivePlan(guid))
  ipcMain.handle('power:create', async (_event, name: string, sourceGuid: string) => createPlan(name, sourceGuid))
  ipcMain.handle('power:delete', async (_event, guid: string) => deletePlan(guid))

  // ── Batch Rename ──
  ipcMain.handle('rename:preview', async (_event, directory: string, pattern: string, replacement: string, useRegex: boolean) => {
    return previewRename(directory, pattern, replacement, useRegex)
  })
  ipcMain.handle('rename:execute', async (_event, directory: string, renames: { original: string; renamed: string }[]) => {
    log('info', 'rename', `Renaming ${renames.length} files in ${directory}`)
    return executeRename(directory, renames)
  })
  ipcMain.handle('rename:browse', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  // ── Windows Updates ──
  ipcMain.handle('updates:check', async () => {
    log('info', 'updates', 'Checking for Windows updates')
    return checkForUpdates()
  })
  ipcMain.handle('updates:lastDate', async () => getLastUpdateDate())
  ipcMain.handle('updates:installed', async () => getInstalledUpdates())

  // ── Startup Analyzer ──
  ipcMain.handle('startup:analyze', async () => {
    log('info', 'startup', 'Analyzing startup impact')
    return analyzeStartup()
  })

  // ── Settings Export/Import ──
  ipcMain.handle('settings:export', async () => {
    const settings = getSettings()
    return JSON.stringify(settings, null, 2)
  })
  ipcMain.handle('settings:import', async (_event, json: string) => {
    try {
      const parsed = JSON.parse(json)
      return updateSettings(parsed)
    } catch (e: any) {
      return { error: e.message }
    }
  })
  ipcMain.handle('settings:exportDialog', async () => {
    const result = await dialog.showSaveDialog({
      defaultPath: 'eclean-settings.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return null
    const { writeFileSync } = require('fs')
    const settings = getSettings()
    writeFileSync(result.filePath, JSON.stringify(settings, null, 2), 'utf-8')
    return result.filePath
  })
  ipcMain.handle('settings:importDialog', async () => {
    try {
      const result = await dialog.showOpenDialog({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile']
      })
      if (result.canceled || !result.filePaths[0]) return null
      const { readFileSync } = require('fs')
      const json = readFileSync(result.filePaths[0], 'utf-8')
      const parsed = JSON.parse(json)
      return updateSettings(parsed)
    } catch (e: any) {
      return { error: e.message || 'Import failed' }
    }
  })
}

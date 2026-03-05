import { ipcMain } from 'electron'
import { scanRegistry, fixRegistryIssues } from '../services/registryCleanerService'
import { log } from '../services/logService'

export function registerRegistryCleanerIPC(): void {
  ipcMain.handle('registry:scan', async () => {
    try {
      log('info', 'registry', 'Starting registry scan')
      const result = await scanRegistry()
      log('success', 'registry', `Scan complete: ${result.issues.length} issues found in ${result.scanTimeMs}ms`)
      return result
    } catch (err) {
      console.error('[IPC] registry:scan failed:', err)
      return { issues: [], scanTimeMs: 0 }
    }
  })

  ipcMain.handle('registry:fix', async (_event, issues: { path: string; type: string }[]) => {
    try {
      log('info', 'registry', `Fixing ${issues.length} registry issues`)
      const result = await fixRegistryIssues(issues)
      log('success', 'registry', `Fixed ${result.fixed} issues, ${result.errors.length} errors`)
      return result
    } catch (err) {
      console.error('[IPC] registry:fix failed:', err)
      return { fixed: 0, errors: ['Fix operation failed'] }
    }
  })
}

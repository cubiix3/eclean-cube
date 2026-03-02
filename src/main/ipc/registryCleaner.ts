import { ipcMain } from 'electron'
import { scanRegistry, fixRegistryIssues } from '../services/registryCleanerService'
import { log } from '../services/logService'

export function registerRegistryCleanerIPC(): void {
  ipcMain.handle('registry:scan', async () => {
    log('info', 'registry', 'Starting registry scan')
    const result = await scanRegistry()
    log('success', 'registry', `Scan complete: ${result.issues.length} issues found in ${result.scanTimeMs}ms`)
    return result
  })

  ipcMain.handle('registry:fix', async (_event, issues: { path: string; type: string }[]) => {
    log('info', 'registry', `Fixing ${issues.length} registry issues`)
    const result = await fixRegistryIssues(issues)
    log('success', 'registry', `Fixed ${result.fixed} issues, ${result.errors.length} errors`)
    return result
  })
}

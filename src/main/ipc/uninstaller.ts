import { ipcMain, shell } from 'electron'
import {
  getInstalledApps,
  uninstallApp,
  getUwpApps,
  removeUwpApp,
  getBrowserExtensions,
  scanLeftovers,
  cleanLeftovers,
  getUninstallHistory,
  scanExtensionSecurity
} from '../services/uninstallerService'

export function registerUninstallerIPC(): void {
  // Win32 Desktop Apps
  ipcMain.handle('uninstaller:getApps', async () => {
    return await getInstalledApps()
  })

  ipcMain.handle('uninstaller:uninstall', async (_event, uninstallString: string, appName: string) => {
    return await uninstallApp(uninstallString, appName)
  })

  // UWP / Store Apps
  ipcMain.handle('uninstaller:getUwpApps', async () => {
    return await getUwpApps()
  })

  ipcMain.handle('uninstaller:removeUwp', async (_event, packageFullName: string, appName: string) => {
    return await removeUwpApp(packageFullName, appName)
  })

  // Browser Extensions
  ipcMain.handle('uninstaller:getExtensions', async () => {
    return await getBrowserExtensions()
  })

  ipcMain.handle('uninstaller:openExtensionsPage', async (_event, browser: string) => {
    // Use shell.openExternal for browser-specific URLs
    switch (browser.toLowerCase()) {
      case 'chrome':
        shell.openExternal('https://chrome.google.com/webstore/category/extensions')
        break
      case 'edge':
        shell.openExternal('https://microsoftedge.microsoft.com/addons')
        break
      case 'firefox':
        shell.openExternal('https://addons.mozilla.org')
        break
    }
  })

  // Leftover Detection
  ipcMain.handle('uninstaller:scanLeftovers', async (_event, appName: string) => {
    return await scanLeftovers(appName)
  })

  ipcMain.handle('uninstaller:cleanLeftovers', async (_event, items: { path: string; type: 'file' | 'registry' }[]) => {
    return await cleanLeftovers(items)
  })

  // History
  ipcMain.handle('uninstaller:getHistory', async () => {
    return getUninstallHistory()
  })

  // Extension Security Scanner
  ipcMain.handle('uninstaller:scanExtensionSecurity', async () => {
    return scanExtensionSecurity()
  })
}

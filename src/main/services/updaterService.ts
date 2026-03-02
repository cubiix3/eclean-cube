import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'
import { log } from './logService'

let isCheckingForUpdates = false

function sendToRenderer(channel: string, data: any): void {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, data)
    }
  }
}

export function initAutoUpdater(): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    log('info', 'updater', 'Checking for updates...')
    sendToRenderer('updater:status', { status: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    log('info', 'updater', `Update available: v${info.version}`)
    sendToRenderer('updater:status', {
      status: 'available',
      version: info.version,
      releaseNotes: info.releaseNotes
    })
  })

  autoUpdater.on('update-not-available', () => {
    log('info', 'updater', 'No updates available')
    sendToRenderer('updater:status', { status: 'up-to-date' })
  })

  autoUpdater.on('download-progress', (progress) => {
    sendToRenderer('updater:status', {
      status: 'downloading',
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    log('success', 'updater', `Update downloaded: v${info.version}`)
    sendToRenderer('updater:status', {
      status: 'ready',
      version: info.version
    })
  })

  autoUpdater.on('error', (err) => {
    log('error', 'updater', `Update error: ${err.message}`)
    sendToRenderer('updater:status', { status: 'error', message: err.message })
    isCheckingForUpdates = false
  })
}

export async function checkForUpdates(): Promise<void> {
  if (isCheckingForUpdates) return
  isCheckingForUpdates = true
  try {
    await autoUpdater.checkForUpdates()
  } catch (e: any) {
    log('error', 'updater', `Check failed: ${e.message}`)
  }
  isCheckingForUpdates = false
}

export async function downloadUpdate(): Promise<void> {
  await autoUpdater.downloadUpdate()
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall()
}

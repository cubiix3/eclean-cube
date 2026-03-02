import { app, BrowserWindow, shell, ipcMain, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { registerSystemIPC } from './ipc/system'
import { registerHardwareIPC } from './ipc/hardware'
import { registerCleanerIPC } from './ipc/cleaner'
import { registerBoosterIPC } from './ipc/booster'
import { registerOptimizerIPC } from './ipc/optimizer'
import { registerUninstallerIPC } from './ipc/uninstaller'
import { registerProcessIPC } from './ipc/process'
import { registerSettingsIPC } from './ipc/settings'
import { registerDuplicateIPC } from './ipc/duplicate'
import { registerNetworkIPC } from './ipc/network'
import { getSettings } from './services/settingsService'
import { closePowerShell } from './services/powershell'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false
let currentHealthScore = 0

function createTrayIcon(): nativeImage {
  // Create a 16x16 tray icon programmatically (blue/cyan gradient circle)
  const size = 16
  const canvas = Buffer.alloc(size * size * 4)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const cx = size / 2
      const cy = size / 2
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      const radius = size / 2 - 1

      if (dist <= radius) {
        // Blue to cyan gradient based on x position
        const t = x / size
        const r = Math.round(59 * (1 - t) + 34 * t)
        const g = Math.round(130 * (1 - t) + 211 * t)
        const b = Math.round(246 * (1 - t) + 153 * t)
        // Anti-aliasing at the edge
        const alpha = dist > radius - 1 ? Math.round((radius - dist) * 255) : 255
        canvas[idx] = r
        canvas[idx + 1] = g
        canvas[idx + 2] = b
        canvas[idx + 3] = Math.max(0, alpha)
      } else {
        canvas[idx] = 0
        canvas[idx + 1] = 0
        canvas[idx + 2] = 0
        canvas[idx + 3] = 0
      }
    }
  }

  return nativeImage.createFromBuffer(canvas, { width: size, height: size })
}

function buildTrayMenu(): Menu {
  return Menu.buildFromTemplate([
    {
      label: 'Open eclean',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      }
    },
    {
      label: 'Quick Clean',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
        mainWindow?.webContents.send('tray:quickClean')
      }
    },
    {
      label: `Health Score: ${currentHealthScore}`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])
}

function createTray(): void {
  const icon = createTrayIcon()
  tray = new Tray(icon)
  tray.setToolTip('eclean - System Optimizer')
  tray.setContextMenu(buildTrayMenu())

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0a0a0f',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized')
  })
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:unmaximized')
  })

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      const settings = getSettings()
      if (settings.general.minimizeToTray) {
        event.preventDefault()
        mainWindow?.hide()
        if (settings.general.showNotifications && tray) {
          tray.displayBalloon({
            title: 'eclean',
            content: 'eclean is still running in the system tray',
            iconType: 'info'
          })
        }
      }
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Window control IPC handlers
ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.on('window:close', () => mainWindow?.close())
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized())

// Tray IPC handlers
ipcMain.on('tray:updateHealthScore', (_event, score: number) => {
  currentHealthScore = score
  if (tray) {
    tray.setContextMenu(buildTrayMenu())
  }
})

app.whenReady().then(() => {
  registerSystemIPC()
  registerHardwareIPC()
  registerCleanerIPC()
  registerBoosterIPC()
  registerOptimizerIPC()
  registerUninstallerIPC()
  registerProcessIPC()
  registerSettingsIPC()
  registerDuplicateIPC()
  registerNetworkIPC()
  createWindow()
  createTray()
})

app.on('before-quit', () => {
  isQuitting = true
  closePowerShell()
})

app.on('window-all-closed', () => {
  closePowerShell()
  app.quit()
})

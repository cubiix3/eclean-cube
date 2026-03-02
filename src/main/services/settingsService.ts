import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

export interface AppSettings {
  general: {
    launchAtStartup: boolean
    minimizeToTray: boolean
    showNotifications: boolean
  }
  appearance: {
    accentColor: string
    animations: boolean
    compactMode: boolean
  }
  cleaner: {
    autoScan: boolean
    safeDeleteOnly: boolean
  }
  advanced: {
    confirmDangerousActions: boolean
    keepBackupDays: number
  }
  monitoring: {
    tempAlertsEnabled: boolean
    cpuThreshold: number
    gpuThreshold: number
  }
}

const DEFAULT_SETTINGS: AppSettings = {
  general: {
    launchAtStartup: false,
    minimizeToTray: true,
    showNotifications: true
  },
  appearance: {
    accentColor: '#3b82f6',
    animations: true,
    compactMode: false
  },
  cleaner: {
    autoScan: false,
    safeDeleteOnly: true
  },
  advanced: {
    confirmDangerousActions: true,
    keepBackupDays: 7
  },
  monitoring: {
    tempAlertsEnabled: false,
    cpuThreshold: 85,
    gpuThreshold: 85
  }
}

function getSettingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

function deepMerge(target: any, source: any): any {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}

export function getSettings(): AppSettings {
  const settingsPath = getSettingsPath()
  try {
    if (existsSync(settingsPath)) {
      const raw = readFileSync(settingsPath, 'utf-8')
      const parsed = JSON.parse(raw)
      return deepMerge(DEFAULT_SETTINGS, parsed)
    }
  } catch {
    // Return defaults on any error
  }
  return { ...DEFAULT_SETTINGS }
}

export function updateSettings(partial: Partial<AppSettings>): AppSettings {
  const current = getSettings()
  const merged = deepMerge(current, partial)
  const settingsPath = getSettingsPath()
  writeFileSync(settingsPath, JSON.stringify(merged, null, 2), 'utf-8')

  // Handle launch at startup
  if (partial.general?.launchAtStartup !== undefined) {
    app.setLoginItemSettings({
      openAtLogin: partial.general.launchAtStartup
    })
  }

  return merged
}

export function resetSettings(): AppSettings {
  const settingsPath = getSettingsPath()
  writeFileSync(settingsPath, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8')

  // Reset launch at startup
  app.setLoginItemSettings({
    openAtLogin: false
  })

  return { ...DEFAULT_SETTINGS }
}

import { create } from 'zustand'
import { useToastStore } from './toastStore'

interface AppSettings {
  general: {
    launchAtStartup: boolean
    minimizeToTray: boolean
    showNotifications: boolean
    autoCleanOnStart: boolean
    autoOptimizeOnStart: boolean
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
    showNotifications: true,
    autoCleanOnStart: false,
    autoOptimizeOnStart: false
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

interface SettingsState {
  settings: AppSettings
  isLoading: boolean
  fetchSettings: () => Promise<void>
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>
  resetSettings: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: false,

  fetchSettings: async () => {
    set({ isLoading: true })
    try {
      const settings = await window.api.settings.get()
      set({ settings })
    } catch {
      set({ settings: DEFAULT_SETTINGS })
    }
    set({ isLoading: false })
  },

  updateSettings: async (partial) => {
    try {
      const updated = await window.api.settings.update(partial)
      set({ settings: updated })
    } catch (err: any) {
      useToastStore.getState().addToast({
        type: 'error',
        title: 'Failed to save settings',
        message: err?.message || 'An unexpected error occurred'
      })
    }
  },

  resetSettings: async () => {
    try {
      const settings = await window.api.settings.reset()
      set({ settings })
      useToastStore.getState().addToast({
        type: 'success',
        title: 'Settings reset to defaults'
      })
    } catch (err: any) {
      useToastStore.getState().addToast({
        type: 'error',
        title: 'Failed to reset settings',
        message: err?.message || 'An unexpected error occurred'
      })
    }
  }
}))

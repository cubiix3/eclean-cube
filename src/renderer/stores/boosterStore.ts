import { create } from 'zustand'

export type BoosterTab = 'startup' | 'services' | 'dns' | 'tasks' | 'boottime'

interface DNSPreset {
  name: string
  primary: string
  secondary: string
  icon: string
}

export const DNS_PRESETS: DNSPreset[] = [
  { name: 'Cloudflare', primary: '1.1.1.1', secondary: '1.0.0.1', icon: 'cloud' },
  { name: 'Google', primary: '8.8.8.8', secondary: '8.8.4.4', icon: 'globe' },
  { name: 'OpenDNS', primary: '208.67.222.222', secondary: '208.67.220.220', icon: 'shield' },
  { name: 'Quad9', primary: '9.9.9.9', secondary: '149.112.112.112', icon: 'lock' }
]

export interface DNSLatencyResult {
  name: string
  server: string
  latency: number
}

interface BoosterState {
  activeTab: BoosterTab

  // Startup Apps
  startupApps: BoosterStartupApp[]
  isLoadingStartup: boolean
  startupSearch: string

  // Services
  services: BoosterWindowsService[]
  isLoadingServices: boolean
  servicesSearch: string
  servicesFilter: 'all' | 'running' | 'stopped'

  // DNS
  dnsConfigs: BoosterDNSConfig[]
  isLoadingDNS: boolean
  isApplyingDNS: boolean
  dnsLatencyResults: DNSLatencyResult[]
  isTestingDNS: boolean
  selectedDNSPreset: string | null

  // Tasks
  scheduledTasks: BoosterScheduledTask[]
  isLoadingTasks: boolean
  tasksSearch: string

  // Actions
  setActiveTab: (tab: BoosterTab) => void

  // Startup Actions
  fetchStartupApps: () => Promise<void>
  toggleStartupApp: (app: BoosterStartupApp) => Promise<void>
  setStartupSearch: (search: string) => void

  // Services Actions
  fetchServices: () => Promise<void>
  changeServiceStartType: (name: string, startType: string) => Promise<void>
  setServicesSearch: (search: string) => void
  setServicesFilter: (filter: 'all' | 'running' | 'stopped') => void

  // DNS Actions
  fetchDNS: () => Promise<void>
  applyDNS: (interfaceIndex: number, primary: string, secondary: string, presetName: string) => Promise<void>
  testAllDNS: () => Promise<void>
  setSelectedDNSPreset: (name: string | null) => void

  // Task Actions
  fetchScheduledTasks: () => Promise<void>
  toggleTask: (task: BoosterScheduledTask) => Promise<void>
  setTasksSearch: (search: string) => void
}

export const useBoosterStore = create<BoosterState>((set, get) => ({
  activeTab: 'startup',

  startupApps: [],
  isLoadingStartup: false,
  startupSearch: '',

  services: [],
  isLoadingServices: false,
  servicesSearch: '',
  servicesFilter: 'all',

  dnsConfigs: [],
  isLoadingDNS: false,
  isApplyingDNS: false,
  dnsLatencyResults: [],
  isTestingDNS: false,
  selectedDNSPreset: null,

  scheduledTasks: [],
  isLoadingTasks: false,
  tasksSearch: '',

  setActiveTab: (tab) => set({ activeTab: tab }),

  // ── Startup Apps ──
  fetchStartupApps: async () => {
    set({ isLoadingStartup: true })
    try {
      const apps = await window.api.booster.getStartupApps()
      set({ startupApps: apps })
    } catch {
      set({ startupApps: [] })
    }
    set({ isLoadingStartup: false })
  },

  toggleStartupApp: async (app) => {
    const newEnabled = !app.enabled
    // Optimistic update
    set((state) => ({
      startupApps: state.startupApps.map((a) =>
        a.name === app.name ? { ...a, enabled: newEnabled } : a
      )
    }))
    try {
      await window.api.booster.setStartupEnabled(app.name, app.command, app.location, newEnabled)
    } catch {
      // Revert on error
      set((state) => ({
        startupApps: state.startupApps.map((a) =>
          a.name === app.name ? { ...a, enabled: app.enabled } : a
        )
      }))
    }
  },

  setStartupSearch: (search) => set({ startupSearch: search }),

  // ── Services ──
  fetchServices: async () => {
    set({ isLoadingServices: true })
    try {
      const services = await window.api.booster.getServices()
      set({ services })
    } catch {
      set({ services: [] })
    }
    set({ isLoadingServices: false })
  },

  changeServiceStartType: async (name, startType) => {
    // Optimistic update
    set((state) => ({
      services: state.services.map((s) =>
        s.name === name ? { ...s, startType } : s
      )
    }))
    try {
      await window.api.booster.setServiceStartType(name, startType)
    } catch {
      // Refresh to get actual state
      get().fetchServices()
    }
  },

  setServicesSearch: (search) => set({ servicesSearch: search }),
  setServicesFilter: (filter) => set({ servicesFilter: filter }),

  // ── DNS ──
  fetchDNS: async () => {
    set({ isLoadingDNS: true })
    try {
      const configs = await window.api.booster.getCurrentDNS()
      set({ dnsConfigs: configs })

      // Detect active preset
      if (configs.length > 0) {
        const current = configs[0].serverAddresses
        const matchedPreset = DNS_PRESETS.find(
          (p) => current.includes(p.primary) && current.includes(p.secondary)
        )
        if (matchedPreset) {
          set({ selectedDNSPreset: matchedPreset.name })
        }
      }
    } catch {
      set({ dnsConfigs: [] })
    }
    set({ isLoadingDNS: false })
  },

  applyDNS: async (interfaceIndex, primary, secondary, presetName) => {
    set({ isApplyingDNS: true })
    try {
      await window.api.booster.setDNS(interfaceIndex, primary, secondary)
      set({ selectedDNSPreset: presetName })
      // Refresh DNS configs
      await get().fetchDNS()
    } catch {
      // ignore
    }
    set({ isApplyingDNS: false })
  },

  testAllDNS: async () => {
    set({ isTestingDNS: true, dnsLatencyResults: [] })
    const results: DNSLatencyResult[] = []

    for (const preset of DNS_PRESETS) {
      try {
        const latency = await window.api.booster.pingDNS(preset.primary)
        results.push({ name: preset.name, server: preset.primary, latency })
        set({ dnsLatencyResults: [...results] })
      } catch {
        results.push({ name: preset.name, server: preset.primary, latency: -1 })
        set({ dnsLatencyResults: [...results] })
      }
    }

    set({ isTestingDNS: false })
  },

  setSelectedDNSPreset: (name) => set({ selectedDNSPreset: name }),

  // ── Tasks ──
  fetchScheduledTasks: async () => {
    set({ isLoadingTasks: true })
    try {
      const tasks = await window.api.booster.getScheduledTasks()
      set({ scheduledTasks: tasks })
    } catch {
      set({ scheduledTasks: [] })
    }
    set({ isLoadingTasks: false })
  },

  toggleTask: async (task) => {
    const newEnabled = task.state === 'Disabled'
    // Optimistic update
    set((state) => ({
      scheduledTasks: state.scheduledTasks.map((t) =>
        t.taskName === task.taskName && t.taskPath === task.taskPath
          ? { ...t, state: newEnabled ? 'Ready' : 'Disabled' }
          : t
      )
    }))
    try {
      await window.api.booster.setTaskEnabled(task.taskName, task.taskPath, newEnabled)
    } catch {
      // Revert on error
      set((state) => ({
        scheduledTasks: state.scheduledTasks.map((t) =>
          t.taskName === task.taskName && t.taskPath === task.taskPath
            ? { ...t, state: task.state }
            : t
        )
      }))
    }
  },

  setTasksSearch: (search) => set({ tasksSearch: search })
}))

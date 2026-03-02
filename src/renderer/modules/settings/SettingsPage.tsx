import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Palette,
  RotateCcw,
  Power,
  BellRing,
  Minimize2,
  Zap,
  LayoutGrid,
  ScanLine,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Keyboard,
  LayoutDashboard,
  Sliders,
  Trash2,
  Cpu,
  Rocket,
  PackageX,
  Activity,
  Gauge,
  Settings,
  Thermometer,
  ThermometerSun,
  Sparkles,
  CalendarClock,
  Plus,
  Play,
  X,
  Timer
} from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import { useToastStore } from '@/stores/toastStore'

const ACCENT_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Red', value: '#ef4444' }
]

function Toggle({
  enabled,
  onChange
}: {
  enabled: boolean
  onChange: (val: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
        enabled
          ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
          : 'bg-white/10'
      }`}
    >
      <motion.div
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
        animate={{ left: enabled ? '22px' : '2px' }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  )
}

function SettingRow({
  icon: Icon,
  label,
  description,
  children
}: {
  icon: any
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
          <Icon className="w-4 h-4 text-white/50" />
        </div>
        <div>
          <p className="text-sm text-white">{label}</p>
          {description && <p className="text-xs text-white/30 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function SectionCard({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">{title}</h3>
      <div className="divide-y divide-white/5">{children}</div>
    </div>
  )
}

function AutomationSection() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'cleanup' | 'optimize'>('cleanup')
  const [newFreq, setNewFreq] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [runningId, setRunningId] = useState<string | null>(null)
  const addToast = useToastStore((s) => s.addToast)

  const fetchSchedules = useCallback(async () => {
    try {
      const data = await window.api.scheduler.getAll()
      setSchedules(data)
    } catch {
      setSchedules([])
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  async function handleAdd() {
    if (!newName.trim()) return
    try {
      await window.api.scheduler.add({ name: newName, type: newType, frequency: newFreq, enabled: true })
      addToast({ type: 'success', title: 'Schedule created' })
      setShowAdd(false)
      setNewName('')
      fetchSchedules()
    } catch {
      addToast({ type: 'error', title: 'Failed to create schedule' })
    }
  }

  async function handleToggle(id: string, enabled: boolean) {
    try {
      await window.api.scheduler.update(id, { enabled })
      fetchSchedules()
    } catch {
      addToast({ type: 'error', title: 'Failed to update schedule' })
    }
  }

  async function handleDelete(id: string) {
    try {
      await window.api.scheduler.remove(id)
      addToast({ type: 'info', title: 'Schedule removed' })
      fetchSchedules()
    } catch {
      addToast({ type: 'error', title: 'Failed to remove schedule' })
    }
  }

  async function handleRunNow(id: string) {
    setRunningId(id)
    try {
      const result = await window.api.scheduler.runNow(id)
      addToast({
        type: result.success ? 'success' : 'error',
        title: result.success ? 'Schedule executed' : 'Execution failed',
        message: result.message
      })
      fetchSchedules()
    } catch {
      addToast({ type: 'error', title: 'Failed to run schedule' })
    }
    setRunningId(null)
  }

  function formatDate(ts: number | null) {
    if (!ts) return 'Never'
    return new Date(ts).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-white/50" />
            <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
              Automation
            </h3>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-xs text-white/60 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Schedule
          </button>
        </div>

        {/* Add Schedule Form */}
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-4 rounded-xl bg-white/[0.03] border border-white/5"
          >
            <div className="grid grid-cols-3 gap-3 mb-3">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Schedule name"
                className="col-span-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20"
              />
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as 'cleanup' | 'optimize')}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none cursor-pointer"
              >
                <option value="cleanup">Cleanup</option>
                <option value="optimize">Optimize</option>
              </select>
              <select
                value={newFreq}
                onChange={(e) => setNewFreq(e.target.value as 'daily' | 'weekly' | 'monthly')}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none cursor-pointer"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <button
                onClick={handleAdd}
                disabled={!newName.trim()}
                className="px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 text-sm text-white font-medium hover:from-blue-600 hover:to-cyan-500 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </motion.div>
        )}

        {/* Schedules List */}
        {isLoading ? (
          <div className="h-16 animate-pulse bg-white/5 rounded-xl" />
        ) : schedules.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-6">
            No schedules configured. Add one to automate cleanup or optimization.
          </p>
        ) : (
          <div className="space-y-2">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    schedule.type === 'cleanup'
                      ? 'bg-green-500/10'
                      : 'bg-blue-500/10'
                  }`}
                >
                  {schedule.type === 'cleanup' ? (
                    <Trash2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-blue-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{schedule.name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-white/30">
                    <span className="capitalize">{schedule.frequency}</span>
                    <span>|</span>
                    <span>Last: {formatDate(schedule.lastRun)}</span>
                    <span>|</span>
                    <span>Next: {formatDate(schedule.nextRun)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRunNow(schedule.id)}
                    disabled={runningId === schedule.id}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                    title="Run now"
                  >
                    <Play className={`w-3.5 h-3.5 text-white/40 ${runningId === schedule.id ? 'animate-pulse' : ''}`} />
                  </button>
                  <Toggle
                    enabled={schedule.enabled}
                    onChange={(val) => handleToggle(schedule.id, val)}
                  />
                  <button
                    onClick={() => handleDelete(schedule.id)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <X className="w-3.5 h-3.5 text-white/40 hover:text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function SettingsPage() {
  const { settings, isLoading, fetchSettings, updateSettings, resetSettings } =
    useSettingsStore()

  useEffect(() => {
    fetchSettings()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-sm text-white/40 mt-1">Configure your preferences</p>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-5 animate-pulse">
              <div className="w-24 h-4 bg-white/10 rounded mb-4" />
              <div className="space-y-4">
                <div className="h-10 bg-white/5 rounded" />
                <div className="h-10 bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-white/40 mt-1">Configure your preferences</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* General */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <SectionCard title="General">
            <SettingRow
              icon={Power}
              label="Launch at startup"
              description="Start eclean when Windows boots"
            >
              <Toggle
                enabled={settings.general.launchAtStartup}
                onChange={(val) =>
                  updateSettings({ general: { ...settings.general, launchAtStartup: val } })
                }
              />
            </SettingRow>
            <SettingRow
              icon={Minimize2}
              label="Minimize to tray"
              description="Close to system tray instead of quitting"
            >
              <Toggle
                enabled={settings.general.minimizeToTray}
                onChange={(val) =>
                  updateSettings({ general: { ...settings.general, minimizeToTray: val } })
                }
              />
            </SettingRow>
            <SettingRow
              icon={BellRing}
              label="Show notifications"
              description="Display system tray notifications"
            >
              <Toggle
                enabled={settings.general.showNotifications}
                onChange={(val) =>
                  updateSettings({ general: { ...settings.general, showNotifications: val } })
                }
              />
            </SettingRow>
            <SettingRow
              icon={Trash2}
              label="Auto-clean on startup"
              description="Run a quick junk cleanup when the app starts"
            >
              <Toggle
                enabled={settings.general.autoCleanOnStart}
                onChange={(val) =>
                  updateSettings({ general: { ...settings.general, autoCleanOnStart: val } })
                }
              />
            </SettingRow>
            <SettingRow
              icon={Sparkles}
              label="Auto-optimize on startup"
              description="Apply safe optimizations when the app starts"
            >
              <Toggle
                enabled={settings.general.autoOptimizeOnStart}
                onChange={(val) =>
                  updateSettings({ general: { ...settings.general, autoOptimizeOnStart: val } })
                }
              />
            </SettingRow>
          </SectionCard>
        </motion.div>

        {/* Appearance */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <SectionCard title="Appearance">
            <SettingRow
              icon={Palette}
              label="Accent color"
              description="Choose your preferred accent color"
            >
              <div className="flex items-center gap-2">
                {ACCENT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() =>
                      updateSettings({
                        appearance: { ...settings.appearance, accentColor: color.value }
                      })
                    }
                    className="relative w-6 h-6 rounded-full cursor-pointer transition-transform hover:scale-110"
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  >
                    {settings.appearance.accentColor === color.value && (
                      <motion.div
                        layoutId="accent-indicator"
                        className="absolute inset-0 rounded-full border-2 border-white"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </SettingRow>
            <SettingRow
              icon={Zap}
              label="Enable animations"
              description="Smooth transitions and effects"
            >
              <Toggle
                enabled={settings.appearance.animations}
                onChange={(val) =>
                  updateSettings({
                    appearance: { ...settings.appearance, animations: val }
                  })
                }
              />
            </SettingRow>
            <SettingRow
              icon={LayoutGrid}
              label="Compact mode"
              description="Reduce padding for more content"
            >
              <Toggle
                enabled={settings.appearance.compactMode}
                onChange={(val) =>
                  updateSettings({
                    appearance: { ...settings.appearance, compactMode: val }
                  })
                }
              />
            </SettingRow>
          </SectionCard>
        </motion.div>

        {/* Cleaner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <SectionCard title="Cleaner">
            <SettingRow
              icon={ScanLine}
              label="Auto-scan on launch"
              description="Automatically scan for junk when the app opens"
            >
              <Toggle
                enabled={settings.cleaner.autoScan}
                onChange={(val) =>
                  updateSettings({ cleaner: { ...settings.cleaner, autoScan: val } })
                }
              />
            </SettingRow>
            <SettingRow
              icon={ShieldCheck}
              label="Safe delete only"
              description="Only delete files that are safe to remove"
            >
              <Toggle
                enabled={settings.cleaner.safeDeleteOnly}
                onChange={(val) =>
                  updateSettings({ cleaner: { ...settings.cleaner, safeDeleteOnly: val } })
                }
              />
            </SettingRow>
          </SectionCard>
        </motion.div>

        {/* Advanced */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <SectionCard title="Advanced">
            <SettingRow
              icon={AlertTriangle}
              label="Confirm dangerous actions"
              description="Ask for confirmation before risky operations"
            >
              <Toggle
                enabled={settings.advanced.confirmDangerousActions}
                onChange={(val) =>
                  updateSettings({
                    advanced: { ...settings.advanced, confirmDangerousActions: val }
                  })
                }
              />
            </SettingRow>
            <SettingRow
              icon={Clock}
              label="Backup retention (days)"
              description="How long to keep backup files"
            >
              <input
                type="number"
                min={1}
                max={90}
                value={settings.advanced.keepBackupDays}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  if (!isNaN(val) && val >= 1 && val <= 90) {
                    updateSettings({
                      advanced: { ...settings.advanced, keepBackupDays: val }
                    })
                  }
                }}
                className="w-20 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white text-center focus:outline-none focus:border-white/20 transition-colors"
              />
            </SettingRow>

            {/* Reset */}
            <div className="pt-4 mt-2">
              <button
                onClick={resetSettings}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Reset all settings
              </button>
            </div>
          </SectionCard>
        </motion.div>
      </div>

      {/* Monitoring */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <SectionCard title="Monitoring">
          <SettingRow
            icon={Thermometer}
            label="Enable temperature alerts"
            description="Get notified when CPU/GPU temperatures exceed thresholds"
          >
            <Toggle
              enabled={settings.monitoring.tempAlertsEnabled}
              onChange={(val) => {
                updateSettings({
                  monitoring: { ...settings.monitoring, tempAlertsEnabled: val }
                })
                if (val) {
                  window.api.alerts.startMonitoring(
                    settings.monitoring.cpuThreshold,
                    settings.monitoring.gpuThreshold
                  )
                  window.api.alerts.onTempWarning((data) => {
                    useToastStore.getState().addToast({
                      type: 'warning',
                      title: `${data.type.toUpperCase()} Temperature Warning`,
                      message: data.message
                    })
                  })
                  useToastStore.getState().addToast({
                    type: 'success',
                    title: 'Temperature monitoring enabled'
                  })
                } else {
                  window.api.alerts.stopMonitoring()
                  window.api.alerts.removeTempWarningListener()
                  useToastStore.getState().addToast({
                    type: 'info',
                    title: 'Temperature monitoring disabled'
                  })
                }
              }}
            />
          </SettingRow>
          <SettingRow
            icon={Cpu}
            label="CPU threshold"
            description={`Alert when CPU exceeds ${settings.monitoring.cpuThreshold}°C`}
          >
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={60}
                max={100}
                value={settings.monitoring.cpuThreshold}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  updateSettings({
                    monitoring: { ...settings.monitoring, cpuThreshold: val }
                  })
                  if (settings.monitoring.tempAlertsEnabled) {
                    window.api.alerts.setThresholds(val, settings.monitoring.gpuThreshold)
                  }
                }}
                className="w-24 accent-blue-500"
              />
              <span className="text-sm text-white/60 w-10 text-right">
                {settings.monitoring.cpuThreshold}°C
              </span>
            </div>
          </SettingRow>
          <SettingRow
            icon={ThermometerSun}
            label="GPU threshold"
            description={`Alert when GPU exceeds ${settings.monitoring.gpuThreshold}°C`}
          >
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={60}
                max={100}
                value={settings.monitoring.gpuThreshold}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  updateSettings({
                    monitoring: { ...settings.monitoring, gpuThreshold: val }
                  })
                  if (settings.monitoring.tempAlertsEnabled) {
                    window.api.alerts.setThresholds(settings.monitoring.cpuThreshold, val)
                  }
                }}
                className="w-24 accent-blue-500"
              />
              <span className="text-sm text-white/60 w-10 text-right">
                {settings.monitoring.gpuThreshold}°C
              </span>
            </div>
          </SettingRow>
        </SectionCard>
      </motion.div>

      {/* Automation */}
      <AutomationSection />

      {/* Keyboard Shortcuts */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Keyboard className="w-4 h-4 text-white/50" />
            <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Keyboard Shortcuts</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'Ctrl+1', label: 'Dashboard', icon: LayoutDashboard },
              { key: 'Ctrl+2', label: 'Optimizer', icon: Sliders },
              { key: 'Ctrl+3', label: 'Cleaner', icon: Trash2 },
              { key: 'Ctrl+4', label: 'Your PC', icon: Cpu },
              { key: 'Ctrl+5', label: 'Booster', icon: Rocket },
              { key: 'Ctrl+6', label: 'Uninstaller', icon: PackageX },
              { key: 'Ctrl+7', label: 'Processes', icon: Activity },
              { key: 'Ctrl+8', label: 'Benchmark', icon: Gauge },
              { key: 'Ctrl+9', label: 'Settings', icon: Settings }
            ].map((shortcut) => {
              const Icon = shortcut.icon
              return (
                <div
                  key={shortcut.key}
                  className="flex items-center gap-3 rounded-lg bg-white/[0.03] p-3"
                >
                  <div className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-white/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/60 truncate">{shortcut.label}</p>
                  </div>
                  <kbd className="shrink-0 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-white/40 font-mono">
                    {shortcut.key}
                  </kbd>
                </div>
              )
            })}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

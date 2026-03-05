import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Loader2 } from 'lucide-react'
import { useHardwareStore } from '@/stores/hardwareStore'
import { useToastStore } from '@/stores/toastStore'
import SystemInfo from './SystemInfo'
import SensorCharts from './SensorCharts'
import NetworkMonitor from './NetworkMonitor'
import DiskHealth from './DiskHealth'

const TABS = [
  { key: 'info' as const, label: 'System Info' },
  { key: 'sensors' as const, label: 'Sensors' },
  { key: 'network' as const, label: 'Network' },
  { key: 'diskHealth' as const, label: 'Disk Health' }
]

export default function HardwarePage() {
  const {
    hardwareInfo,
    sensorHistory,
    activeTab,
    isLoading,
    fetchHardwareInfo,
    addSensorData,
    setActiveTab
  } = useHardwareStore()
  const addToast = useToastStore((s) => s.addToast)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    fetchHardwareInfo()
  }, [])

  async function handleExportReport() {
    setIsExporting(true)
    try {
      const result = await window.api.report.generateAndOpen()
      if (result.success) {
        addToast({
          type: 'success',
          title: 'Report exported',
          message: `Saved to ${result.path}`
        })
      } else {
        addToast({ type: 'error', title: 'Report generation failed' })
      }
    } catch {
      addToast({ type: 'error', title: 'Failed to export report' })
    }
    setIsExporting(false)
  }

  useEffect(() => {
    if (activeTab === 'sensors') {
      window.api.hardware.startSensors()
      window.api.hardware.onSensorData((data) => {
        addSensorData(data)
      })
    }
    return () => {
      window.api.hardware.stopSensors()
      window.api.hardware.removeSensorListener()
    }
  }, [activeTab])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gradient">Your PC</h1>
          <p className="text-sm text-white/40 mt-1">Know your hardware</p>
        </div>
        <button
          onClick={handleExportReport}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-400/10 border border-blue-500/20 text-sm text-blue-400 hover:from-blue-500/20 hover:to-cyan-400/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          Export System Report
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-white/10">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="relative px-5 py-2.5 text-sm transition-colors cursor-pointer"
          >
            <span
              className={
                activeTab === tab.key
                  ? 'text-white font-medium'
                  : 'text-white/40 hover:text-white/60'
              }
            >
              {tab.label}
            </span>
            {activeTab === tab.key && (
              <motion.div
                layoutId="hw-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: `linear-gradient(to right, var(--accent-color), #06b6d4)` }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'info' && (
          <motion.div
            key="info"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {isLoading || !hardwareInfo ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="glass rounded-2xl p-5 h-20 animate-pulse" />
                ))}
              </div>
            ) : (
              <SystemInfo data={hardwareInfo} />
            )}
          </motion.div>
        )}

        {activeTab === 'sensors' && (
          <motion.div
            key="sensors"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <SensorCharts data={sensorHistory} />
          </motion.div>
        )}

        {activeTab === 'network' && (
          <motion.div
            key="network"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <NetworkMonitor />
          </motion.div>
        )}

        {activeTab === 'diskHealth' && (
          <motion.div
            key="diskHealth"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <DiskHealth />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

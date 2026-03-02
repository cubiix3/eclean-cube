import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useHardwareStore } from '@/stores/hardwareStore'
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

  useEffect(() => {
    fetchHardwareInfo()
  }, [])

  useEffect(() => {
    if (activeTab === 'sensors') {
      window.api.hardware.startSensors()
      window.api.hardware.onSensorData((data) => {
        addSensorData(data)
      })
    }
    return () => {
      window.api.hardware.stopSensors()
    }
  }, [activeTab])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Your PC</h1>
        <p className="text-sm text-white/40 mt-1">Know your hardware</p>
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
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-400"
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

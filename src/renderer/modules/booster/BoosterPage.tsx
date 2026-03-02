import { motion, AnimatePresence } from 'framer-motion'
import { useBoosterStore, BoosterTab } from '@/stores/boosterStore'
import StartupApps from './StartupApps'
import ServicesManager from './ServicesManager'
import DnsOptimizer from './DnsOptimizer'
import TaskScheduler from './TaskScheduler'
import BootTracker from './BootTracker'

const TABS: { key: BoosterTab; label: string }[] = [
  { key: 'startup', label: 'Startup Apps' },
  { key: 'services', label: 'Services' },
  { key: 'dns', label: 'DNS Optimizer' },
  { key: 'tasks', label: 'Task Scheduler' },
  { key: 'boottime', label: 'Boot Time' }
]

export default function BoosterPage() {
  const { activeTab, setActiveTab } = useBoosterStore()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Booster</h1>
        <p className="text-sm text-white/40 mt-1">Faster boot, every time</p>
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
                layoutId="booster-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-400"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'startup' && (
          <motion.div
            key="startup"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <StartupApps />
          </motion.div>
        )}

        {activeTab === 'services' && (
          <motion.div
            key="services"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <ServicesManager />
          </motion.div>
        )}

        {activeTab === 'dns' && (
          <motion.div
            key="dns"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <DnsOptimizer />
          </motion.div>
        )}

        {activeTab === 'tasks' && (
          <motion.div
            key="tasks"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <TaskScheduler />
          </motion.div>
        )}

        {activeTab === 'boottime' && (
          <motion.div
            key="boottime"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <BootTracker />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

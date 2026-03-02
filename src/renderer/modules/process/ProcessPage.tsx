import { motion, AnimatePresence } from 'framer-motion'
import { useProcessStore, type ProcessTab } from '@/stores/processStore'
import ProcessManager from './ProcessManager'
import RAMOptimizer from './RAMOptimizer'

const TABS: { key: ProcessTab; label: string }[] = [
  { key: 'processes', label: 'Processes' },
  { key: 'ram', label: 'RAM Optimizer' }
]

export default function ProcessPage() {
  const { activeTab, setActiveTab, processCount } = useProcessStore()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Process Manager</h1>
        <p className="text-sm text-white/40 mt-1">
          Monitor and manage running processes
          {processCount > 0 && (
            <span className="text-white/30"> &middot; {processCount} processes running</span>
          )}
        </p>
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
                layoutId="process-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-400"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'processes' && (
          <motion.div
            key="processes"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <ProcessManager />
          </motion.div>
        )}

        {activeTab === 'ram' && (
          <motion.div
            key="ram"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <RAMOptimizer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

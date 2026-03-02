import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCleanerStore } from '@/stores/cleanerStore'
import JunkCleanup from './JunkCleanup'
import LargeFiles from './LargeFiles'
import FileShredder from './FileShredder'
import DuplicateFinder from './DuplicateFinder'

const TABS = [
  { key: 'junk' as const, label: 'Junk Cleanup' },
  { key: 'large' as const, label: 'Large Files' },
  { key: 'shredder' as const, label: 'File Shredder' },
  { key: 'duplicates' as const, label: 'Duplicates' }
]

export default function CleanerPage() {
  const { activeTab, setActiveTab, fetchDrives } = useCleanerStore()

  useEffect(() => {
    fetchDrives()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Cleaner</h1>
        <p className="text-sm text-white/40 mt-1">Reclaim your disk space</p>
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
                layoutId="cleaner-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-400"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'junk' && (
          <motion.div
            key="junk"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <JunkCleanup />
          </motion.div>
        )}

        {activeTab === 'large' && (
          <motion.div
            key="large"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <LargeFiles />
          </motion.div>
        )}

        {activeTab === 'shredder' && (
          <motion.div
            key="shredder"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <FileShredder />
          </motion.div>
        )}

        {activeTab === 'duplicates' && (
          <motion.div
            key="duplicates"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <DuplicateFinder />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

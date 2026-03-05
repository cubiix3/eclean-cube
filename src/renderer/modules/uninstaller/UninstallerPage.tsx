import { motion, AnimatePresence } from 'framer-motion'
import { useUninstallerStore, UninstallerTab } from '@/stores/uninstallerStore'
import DesktopApps from './DesktopApps'
import StoreApps from './StoreApps'
import BrowserExtensions from './BrowserExtensions'
import LeftoverDetector from './LeftoverDetector'

const TABS: { key: UninstallerTab; label: string }[] = [
  { key: 'desktop', label: 'Desktop Software' },
  { key: 'uwp', label: 'Store Apps' },
  { key: 'extensions', label: 'Browser Extensions' },
  { key: 'leftovers', label: 'Leftover Detection' }
]

export default function UninstallerPage() {
  const { activeTab, setActiveTab } = useUninstallerStore()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gradient">Uninstaller</h1>
        <p className="text-sm text-white/40 mt-1">Complete removal, zero leftovers</p>
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
                layoutId="uninstaller-tab-indicator"
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
        {activeTab === 'desktop' && (
          <motion.div
            key="desktop"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <DesktopApps />
          </motion.div>
        )}

        {activeTab === 'uwp' && (
          <motion.div
            key="uwp"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <StoreApps />
          </motion.div>
        )}

        {activeTab === 'extensions' && (
          <motion.div
            key="extensions"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <BrowserExtensions />
          </motion.div>
        )}

        {activeTab === 'leftovers' && (
          <motion.div
            key="leftovers"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <LeftoverDetector />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

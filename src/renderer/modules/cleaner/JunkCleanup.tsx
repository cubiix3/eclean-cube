import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe,
  Monitor,
  AppWindow,
  Gamepad2,
  ChevronDown,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { useCleanerStore } from '@/stores/cleanerStore'
import { formatSize } from '@/utils/format'

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  browsers: <Globe className="w-5 h-5" />,
  system: <Monitor className="w-5 h-5" />,
  apps: <AppWindow className="w-5 h-5" />,
  games: <Gamepad2 className="w-5 h-5" />
}

const CATEGORY_COLORS: Record<string, string> = {
  browsers: 'from-blue-500 to-cyan-400',
  system: 'from-amber-500 to-orange-400',
  apps: 'from-purple-500 to-pink-400',
  games: 'from-green-500 to-emerald-400'
}

export default function JunkCleanup() {
  const {
    categories,
    isScanning,
    scanProgress,
    isCleaning,
    cleanResult,
    scanAll,
    toggleItem,
    toggleCategory,
    cleanSelected,
    clearCleanResult
  } = useCleanerStore()

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  const toggleExpanded = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const totalSelectedSize = categories.reduce((sum, cat) => {
    return sum + cat.items.filter((item) => item.selected).reduce((s, item) => s + item.size, 0)
  }, 0)

  const totalJunkSize = categories.reduce((sum, cat) => sum + cat.totalSize, 0)
  const hasCategories = categories.length > 0

  return (
    <div className="space-y-4">
      {/* Scan / Clean Actions */}
      <div className="flex items-center justify-between">
        <div>
          {hasCategories && (
            <p className="text-sm text-white/50">
              Found{' '}
              <span className="text-white font-medium">{formatSize(totalJunkSize)}</span> of
              junk files
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={scanAll}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isScanning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {isScanning ? 'Scanning...' : 'Scan All'}
          </button>
          {hasCategories && (
            <button
              onClick={cleanSelected}
              disabled={isCleaning || totalSelectedSize === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-sm text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isCleaning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {isCleaning ? 'Cleaning...' : `Clean Selected (${formatSize(totalSelectedSize)})`}
            </button>
          )}
        </div>
      </div>

      {/* Scan Progress */}
      <AnimatePresence>
        {isScanning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">
                Scanning {scanProgress.current}...
              </span>
              <span className="text-xs text-white/40">
                {scanProgress.done}/{scanProgress.total}
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(scanProgress.done / scanProgress.total) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clean Result */}
      <AnimatePresence>
        {cleanResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              {cleanResult.errors.length === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400" />
              )}
              <span className="text-sm text-white/80">
                Cleaned {cleanResult.cleaned} location
                {cleanResult.cleaned !== 1 ? 's' : ''}
                {cleanResult.errors.length > 0 &&
                  ` with ${cleanResult.errors.length} error${cleanResult.errors.length !== 1 ? 's' : ''}`}
              </span>
            </div>
            <button
              onClick={clearCleanResult}
              className="text-xs text-white/40 hover:text-white/60 transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Cards */}
      {!hasCategories && !isScanning && (
        <div className="glass rounded-2xl p-12 text-center">
          <Search className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-sm">
            Click "Scan All" to find junk files on your system
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {categories.map((cat) => {
            const isExpanded = expandedCategories.has(cat.id)
            const allSelected = cat.items.length > 0 && cat.items.every((i) => i.selected)
            const someSelected = cat.items.some((i) => i.selected)
            const gradient = CATEGORY_COLORS[cat.id] || 'from-gray-500 to-gray-400'

            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass rounded-2xl overflow-hidden"
              >
                {/* Card Header */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => toggleExpanded(cat.id)}
                >
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}
                  >
                    {CATEGORY_ICONS[cat.id]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-white">{cat.name}</h3>
                      <span className="text-sm font-semibold text-white/80">
                        {formatSize(cat.totalSize)}
                      </span>
                    </div>
                    <p className="text-xs text-white/40 mt-0.5">
                      {cat.items.length} item{cat.items.length !== 1 ? 's' : ''} found
                    </p>
                  </div>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4 text-white/30" />
                  </motion.div>
                </div>

                {/* Expanded Items */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3 border-t border-white/5">
                        {/* Toggle All */}
                        <label className="flex items-center gap-2 py-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = someSelected && !allSelected
                            }}
                            onChange={(e) => toggleCategory(cat.id, e.target.checked)}
                            className="w-3.5 h-3.5 rounded accent-cyan-400"
                          />
                          <span className="text-xs text-white/50">Select all</span>
                        </label>

                        {cat.items.map((item) => (
                          <label
                            key={item.path}
                            className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-white/[0.02] rounded px-1 -mx-1 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => toggleItem(cat.id, item.path)}
                              className="w-3.5 h-3.5 rounded accent-cyan-400"
                            />
                            <span className="text-xs text-white/70 flex-1 truncate">
                              {item.name}
                            </span>
                            <span className="text-xs text-white/40 font-mono">
                              {formatSize(item.size)}
                            </span>
                          </label>
                        ))}

                        {cat.items.length === 0 && (
                          <p className="text-xs text-white/30 py-2 text-center">
                            No junk files found
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
      </div>
    </div>
  )
}

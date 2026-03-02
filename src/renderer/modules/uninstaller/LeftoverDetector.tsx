import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Loader2,
  Trash2,
  FolderOpen,
  Database,
  Check,
  ScanSearch,
  Clock,
  AlertCircle
} from 'lucide-react'
import { useUninstallerStore } from '@/stores/uninstallerStore'

const CONFIDENCE_STYLES = {
  high: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    dot: 'bg-emerald-500',
    label: 'High'
  },
  medium: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    dot: 'bg-amber-500',
    label: 'Medium'
  },
  low: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    dot: 'bg-red-500',
    label: 'Low'
  }
}

function formatSize(bytes: number | undefined): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export default function LeftoverDetector() {
  const {
    leftovers,
    isScanning,
    leftoverAppName,
    selectedLeftovers,
    isCleaning,
    history,
    setLeftoverAppName,
    scanLeftovers,
    toggleLeftoverSelection,
    selectAllLeftovers,
    deselectAllLeftovers,
    cleanSelectedLeftovers,
    fetchHistory
  } = useUninstallerStore()

  useEffect(() => {
    fetchHistory()
  }, [])

  const fileLeftovers = leftovers.filter((l) => l.type === 'file')
  const registryLeftovers = leftovers.filter((l) => l.type === 'registry')

  const handleScan = () => {
    if (leftoverAppName.trim()) {
      scanLeftovers()
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="glass rounded-2xl p-5">
        <h3 className="text-white font-medium mb-1">Scan for Leftovers</h3>
        <p className="text-xs text-white/40 mb-4">
          Enter an application name to search for residual files and registry entries
        </p>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Enter application name..."
              value={leftoverAppName}
              onChange={(e) => setLeftoverAppName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>
          <button
            onClick={handleScan}
            disabled={isScanning || !leftoverAppName.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-sm text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
          >
            {isScanning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ScanSearch className="w-4 h-4" />
            )}
            Scan
          </button>
        </div>
      </div>

      {/* Scanning State */}
      {isScanning && (
        <div className="glass rounded-2xl p-8 text-center">
          <Loader2 className="w-8 h-8 text-blue-400 mx-auto mb-3 animate-spin" />
          <p className="text-white/60 text-sm">
            Scanning for leftover files and registry entries...
          </p>
          <p className="text-white/30 text-xs mt-1">
            Searching in Program Files, AppData, and Registry
          </p>
        </div>
      )}

      {/* Results */}
      {!isScanning && leftovers.length > 0 && (
        <div className="space-y-4">
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/60">
              Found <span className="text-white font-medium">{leftovers.length}</span> leftover items
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAllLeftovers}
                className="text-xs text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                Select All
              </button>
              <span className="text-white/10">|</span>
              <button
                onClick={deselectAllLeftovers}
                className="text-xs text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* File Leftovers */}
          {fileLeftovers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-blue-400" />
                <h4 className="text-sm text-white font-medium">Files & Folders</h4>
                <span className="text-xs text-white/30">({fileLeftovers.length})</span>
              </div>
              <div className="glass rounded-2xl overflow-hidden">
                <AnimatePresence>
                  {fileLeftovers.map((item) => {
                    const style = CONFIDENCE_STYLES[item.confidence]
                    const isSelected = selectedLeftovers.includes(item.path)

                    return (
                      <motion.div
                        key={item.path}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.03] hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => toggleLeftoverSelection(item.path)}
                      >
                        {/* Checkbox */}
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all flex-shrink-0 ${
                            isSelected
                              ? 'bg-gradient-to-r from-blue-500 to-cyan-400 border-transparent'
                              : 'border-white/20'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>

                        <FolderOpen className="w-4 h-4 text-white/30 flex-shrink-0" />

                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/80 font-mono truncate">{item.path}</p>
                        </div>

                        {item.size ? (
                          <span className="text-xs text-white/30 flex-shrink-0">
                            {formatSize(item.size)}
                          </span>
                        ) : null}

                        {/* Confidence Badge */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs flex-shrink-0 ${style.bg} ${style.text}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                          {style.label}
                        </span>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Registry Leftovers */}
          {registryLeftovers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-400" />
                <h4 className="text-sm text-white font-medium">Registry Keys</h4>
                <span className="text-xs text-white/30">({registryLeftovers.length})</span>
              </div>
              <div className="glass rounded-2xl overflow-hidden">
                <AnimatePresence>
                  {registryLeftovers.map((item) => {
                    const style = CONFIDENCE_STYLES[item.confidence]
                    const isSelected = selectedLeftovers.includes(item.path)

                    return (
                      <motion.div
                        key={item.path}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.03] hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => toggleLeftoverSelection(item.path)}
                      >
                        {/* Checkbox */}
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all flex-shrink-0 ${
                            isSelected
                              ? 'bg-gradient-to-r from-blue-500 to-cyan-400 border-transparent'
                              : 'border-white/20'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>

                        <Database className="w-4 h-4 text-white/30 flex-shrink-0" />

                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/80 font-mono truncate">{item.path}</p>
                        </div>

                        {/* Confidence Badge */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs flex-shrink-0 ${style.bg} ${style.text}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                          {style.label}
                        </span>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Clean Button */}
          <div className="flex justify-end">
            <button
              onClick={cleanSelectedLeftovers}
              disabled={isCleaning || selectedLeftovers.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-sm text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
            >
              {isCleaning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Clean Selected ({selectedLeftovers.length})
            </button>
          </div>
        </div>
      )}

      {/* No Results */}
      {!isScanning && leftoverAppName.trim() && leftovers.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <AlertCircle className="w-8 h-8 text-white/20 mx-auto mb-3" />
          <p className="text-white/40 text-sm">
            No leftover files or registry entries found for &quot;{leftoverAppName}&quot;.
          </p>
        </div>
      )}

      {/* Uninstall History */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm text-white/60 font-medium">Uninstall History</h3>
          <div className="glass rounded-2xl p-4">
            <div className="space-y-0">
              {history.slice(0, 10).map((entry, idx) => (
                <div
                  key={`${entry.appName}-${entry.timestamp}`}
                  className="flex items-center gap-3 py-2.5 relative"
                >
                  {/* Timeline dot and line */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        entry.type === 'win32' ? 'bg-blue-500' : 'bg-purple-500'
                      }`}
                    />
                    {idx < Math.min(history.length, 10) - 1 && (
                      <div className="w-px h-full bg-white/10 absolute top-5 left-[5px]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{entry.appName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-white/30">
                        {entry.type === 'win32' ? 'Desktop App' : 'Store App'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-white/30 flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatTimeAgo(entry.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

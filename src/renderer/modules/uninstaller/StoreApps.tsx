import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Loader2,
  RefreshCw,
  Trash2,
  Package,
  AlertTriangle
} from 'lucide-react'
import { useUninstallerStore } from '@/stores/uninstallerStore'

function cleanAppName(name: string): string {
  // Remove common publisher prefixes
  return name
    .replace(/^Microsoft\./i, '')
    .replace(/^Windows\./i, '')
    .replace(/^MicrosoftWindows\./i, '')
    .replace(/^Microsoft\.Windows\./i, '')
    .replace(/^Microsoft\.MicrosoftEdge\./i, 'Edge ')
    .replace(/^Microsoft\.Office\./i, 'Office ')
    .replace(/\./g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
}

function cleanPublisher(publisher: string): string {
  // Extract publisher name from CN= format
  const cnMatch = publisher.match(/CN=([^,]+)/)
  if (cnMatch) return cnMatch[1]
  return publisher
}

export default function StoreApps() {
  const {
    uwpApps,
    isLoadingUwp,
    uwpSearch,
    isRemovingUwp,
    fetchUwpApps,
    setUwpSearch,
    removeUwpApp
  } = useUninstallerStore()

  const [confirmRemove, setConfirmRemove] = useState<UninstallerUwpApp | null>(null)

  useEffect(() => {
    fetchUwpApps()
  }, [])

  const filtered = useMemo(() => {
    return uwpApps.filter((app) => {
      const cleaned = cleanAppName(app.Name).toLowerCase()
      const query = uwpSearch.toLowerCase()
      return (
        cleaned.includes(query) ||
        app.Name.toLowerCase().includes(query) ||
        app.Publisher.toLowerCase().includes(query)
      )
    })
  }, [uwpApps, uwpSearch])

  const handleRemove = async (app: UninstallerUwpApp) => {
    setConfirmRemove(null)
    await removeUwpApp(app.PackageFullName, app.Name)
  }

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search store apps..."
              value={uwpSearch}
              onChange={(e) => setUwpSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>
          <span className="text-sm text-white/40 whitespace-nowrap">
            <span className="text-white font-medium">{uwpApps.length}</span> apps found
          </span>
        </div>
        <button
          onClick={fetchUwpApps}
          disabled={isLoadingUwp}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40 cursor-pointer"
        >
          {isLoadingUwp ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Refresh
        </button>
      </div>

      {/* Loading Skeleton */}
      {isLoadingUwp && uwpApps.length === 0 && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-white/10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="w-48 h-4 bg-white/10 rounded" />
                  <div className="w-32 h-3 bg-white/5 rounded" />
                </div>
                <div className="w-20 h-8 bg-white/10 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoadingUwp && uwpApps.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <Package className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-sm">
            No Store apps found. Click &quot;Refresh&quot; to scan again.
          </p>
        </div>
      )}

      {/* App List */}
      {filtered.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_120px_1fr_80px] gap-4 px-4 py-3 border-b border-white/5 text-xs text-white/30 uppercase tracking-wider">
            <span>App Name</span>
            <span>Version</span>
            <span>Publisher</span>
            <span className="text-right">Action</span>
          </div>

          {/* Rows */}
          <AnimatePresence>
            {filtered.map((app) => (
              <motion.div
                key={app.PackageFullName}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-[1fr_120px_1fr_80px] gap-4 px-4 py-3 items-center border-b border-white/[0.03] hover:bg-white/5 transition-colors"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{cleanAppName(app.Name)}</p>
                    <p className="text-xs text-white/25 truncate font-mono">{app.Name}</p>
                  </div>
                </div>
                <span className="text-xs text-white/40">{app.Version}</span>
                <span className="text-xs text-white/40 truncate">{cleanPublisher(app.Publisher)}</span>
                <div className="flex justify-end">
                  <button
                    onClick={() => setConfirmRemove(app)}
                    disabled={isRemovingUwp}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* No Results */}
      {!isLoadingUwp && uwpApps.length > 0 && filtered.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-white/40 text-sm">No store apps match your search.</p>
        </div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmRemove && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmRemove(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="glass rounded-2xl p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Remove App</h3>
                  <p className="text-xs text-white/40">This will remove the app package</p>
                </div>
              </div>
              <p className="text-sm text-white/60 mb-6">
                Are you sure you want to remove{' '}
                <span className="text-white font-medium">
                  {cleanAppName(confirmRemove.Name)}
                </span>
                ?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmRemove(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRemove(confirmRemove)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-sm text-white font-medium hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Confirm Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

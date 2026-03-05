import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Loader2,
  RefreshCw,
  Trash2,
  Check,
  ArrowUpDown,
  Monitor,
  X,
  AlertTriangle
} from 'lucide-react'
import { useUninstallerStore } from '@/stores/uninstallerStore'

function getLetterColor(name: string): string {
  const colors = [
    'from-blue-500 to-cyan-400',
    'from-purple-500 to-pink-400',
    'from-emerald-500 to-teal-400',
    'from-amber-500 to-orange-400',
    'from-red-500 to-rose-400',
    'from-indigo-500 to-violet-400',
    'from-cyan-500 to-blue-400',
    'from-pink-500 to-fuchsia-400'
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function formatSize(sizeKB: number | null): string {
  if (!sizeKB) return 'Unknown'
  if (sizeKB < 1024) return `${sizeKB} KB`
  const sizeMB = sizeKB / 1024
  if (sizeMB < 1024) return `${sizeMB.toFixed(1)} MB`
  return `${(sizeMB / 1024).toFixed(2)} GB`
}

function getSizeColor(sizeKB: number | null): string {
  if (!sizeKB) return 'bg-white/20'
  const sizeMB = sizeKB / 1024
  if (sizeMB < 100) return 'bg-emerald-500'
  if (sizeMB < 1024) return 'bg-amber-500'
  return 'bg-red-500'
}

function getSizeTextColor(sizeKB: number | null): string {
  if (!sizeKB) return 'text-white/40'
  const sizeMB = sizeKB / 1024
  if (sizeMB < 100) return 'text-emerald-400'
  if (sizeMB < 1024) return 'text-amber-400'
  return 'text-red-400'
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Unknown'
  // InstallDate comes as YYYYMMDD
  if (dateStr.length === 8) {
    const y = dateStr.slice(0, 4)
    const m = dateStr.slice(4, 6)
    const d = dateStr.slice(6, 8)
    return `${d}.${m}.${y}`
  }
  return dateStr
}

export default function DesktopApps() {
  const {
    apps,
    isLoadingApps,
    selectedApps,
    searchQuery,
    sortBy,
    sortDir,
    isUninstalling,
    fetchApps,
    toggleAppSelection,
    selectAllApps,
    deselectAllApps,
    setSearchQuery,
    setSortBy,
    uninstallApp
  } = useUninstallerStore()

  const [confirmUninstall, setConfirmUninstall] = useState<string | null>(null)

  useEffect(() => {
    fetchApps()
  }, [])

  const filteredAndSorted = useMemo(() => {
    let filtered = apps.filter(
      (app) =>
        app.DisplayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.Publisher || '').toLowerCase().includes(searchQuery.toLowerCase())
    )

    filtered.sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'name':
          cmp = a.DisplayName.localeCompare(b.DisplayName)
          break
        case 'size':
          cmp = (a.EstimatedSize || 0) - (b.EstimatedSize || 0)
          break
        case 'date':
          cmp = (a.InstallDate || '').localeCompare(b.InstallDate || '')
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return filtered
  }, [apps, searchQuery, sortBy, sortDir])

  const totalSelectedSize = useMemo(() => {
    return apps
      .filter((a) => selectedApps.includes(a.DisplayName))
      .reduce((sum, a) => sum + (a.EstimatedSize || 0), 0)
  }, [apps, selectedApps])

  const handleUninstall = async (app: UninstallerInstalledApp) => {
    if (!app.UninstallString) return
    setConfirmUninstall(null)
    await uninstallApp(app.UninstallString, app.DisplayName)
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
              placeholder="Search applications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>
          <span className="text-sm text-white/40 whitespace-nowrap">
            <span className="text-white font-medium">{apps.length}</span> apps installed
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort Buttons */}
          {(['name', 'size', 'date'] as const).map((sort) => (
            <button
              key={sort}
              onClick={() => setSortBy(sort)}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                sortBy === sort
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 hover:text-white/60'
              }`}
            >
              <ArrowUpDown className="w-3 h-3" />
              {sort.charAt(0).toUpperCase() + sort.slice(1)}
            </button>
          ))}

          <button
            onClick={fetchApps}
            disabled={isLoadingApps}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40 cursor-pointer"
          >
            {isLoadingApps ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoadingApps && apps.length === 0 && (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="glass rounded-xl p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="w-3/4 h-4 bg-white/10 rounded" />
                  <div className="w-1/2 h-3 bg-white/5 rounded" />
                  <div className="w-1/3 h-3 bg-white/5 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoadingApps && apps.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <Monitor className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-sm">
            No applications found. Click &quot;Refresh&quot; to scan again.
          </p>
        </div>
      )}

      {/* App Grid */}
      {filteredAndSorted.length > 0 && (
        <div className="grid grid-cols-3 gap-3 pb-20">
          <AnimatePresence>
            {filteredAndSorted.map((app) => {
              const isSelected = selectedApps.includes(app.DisplayName)
              const letter = app.DisplayName.charAt(0).toUpperCase()
              const colorGradient = getLetterColor(app.DisplayName)

              return (
                <motion.div
                  key={app.DisplayName}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className={`glass rounded-xl p-4 relative group transition-all cursor-pointer ${
                    isSelected ? 'ring-1 ring-blue-500/50 bg-blue-500/5' : 'hover:bg-white/[0.03]'
                  }`}
                  onClick={() => toggleAppSelection(app.DisplayName)}
                >
                  {/* Checkbox */}
                  <div
                    className={`absolute top-3 right-3 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-400 border-transparent'
                        : 'border-white/20 group-hover:border-white/40'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>

                  <div className="flex items-start gap-3">
                    {/* Letter Avatar */}
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorGradient} flex items-center justify-center flex-shrink-0`}
                    >
                      <span className="text-white font-bold text-sm">{letter}</span>
                    </div>

                    <div className="flex-1 min-w-0 pr-6">
                      <p className="text-sm text-white font-medium truncate">{app.DisplayName}</p>
                      <p className="text-xs text-white/40 truncate mt-0.5">
                        {app.Publisher || 'Unknown Publisher'}
                      </p>
                      <p className="text-xs text-white/30 mt-0.5">
                        v{app.DisplayVersion || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Size & Date */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${getSizeTextColor(app.EstimatedSize)}`}>
                        {formatSize(app.EstimatedSize)}
                      </span>
                      <div className="w-12 h-1 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getSizeColor(app.EstimatedSize)}`}
                          style={{
                            width: `${Math.min(100, Math.max(2, Math.log10(Math.max(1, (app.EstimatedSize || 0) / 1024)) * 25))}%`
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-white/30">{formatDate(app.InstallDate)}</span>
                  </div>

                  {/* Uninstall Button */}
                  {app.UninstallString && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmUninstall(app.DisplayName)
                      }}
                      disabled={isUninstalling}
                      className="mt-3 w-full py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-40 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3 inline-block mr-1" />
                      Uninstall
                    </button>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* No Results */}
      {!isLoadingApps && apps.length > 0 && filteredAndSorted.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-white/40 text-sm">No applications match your search.</p>
        </div>
      )}

      {/* Batch Action Bar */}
      <AnimatePresence>
        {selectedApps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="glass rounded-2xl px-6 py-3 flex items-center gap-4 shadow-2xl border border-white/10">
              <span className="text-sm text-white">
                <span className="font-bold text-blue-400">{selectedApps.length}</span> selected
              </span>
              <span className="text-xs text-white/30">
                {formatSize(totalSelectedSize)} total
              </span>
              <div className="w-px h-6 bg-white/10" />
              <button
                onClick={deselectAllApps}
                className="text-xs text-white/50 hover:text-white transition-colors cursor-pointer"
              >
                Clear
              </button>
              <button
                onClick={() => setConfirmUninstall('__batch__')}
                disabled={isUninstalling}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
              >
                {isUninstalling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Batch Uninstall
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmUninstall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmUninstall(null)}
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
                  <h3 className="text-white font-semibold">Confirm Uninstall</h3>
                  <p className="text-xs text-white/40">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-white/60 mb-6">
                {confirmUninstall === '__batch__' ? (
                  <>
                    Are you sure you want to uninstall{' '}
                    <span className="text-white font-medium">{selectedApps.length} applications</span>?
                  </>
                ) : (
                  <>
                    Are you sure you want to uninstall{' '}
                    <span className="text-white font-medium">{confirmUninstall}</span>?
                  </>
                )}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmUninstall(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (confirmUninstall === '__batch__') {
                      const { batchUninstall } = useUninstallerStore.getState()
                      batchUninstall()
                    } else {
                      const app = apps.find((a) => a.DisplayName === confirmUninstall)
                      if (app) handleUninstall(app)
                    }
                    setConfirmUninstall(null)
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-sm text-white font-medium hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Confirm Uninstall
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

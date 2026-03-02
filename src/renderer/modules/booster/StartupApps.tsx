import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader2, Zap, RefreshCw } from 'lucide-react'
import { useBoosterStore } from '@/stores/boosterStore'

const IMPACT_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  High: { dot: 'bg-red-500', bg: 'bg-red-500/10', text: 'text-red-400' },
  Medium: { dot: 'bg-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  Low: { dot: 'bg-green-500', bg: 'bg-green-500/10', text: 'text-green-400' }
}

export default function StartupApps() {
  const {
    startupApps,
    isLoadingStartup,
    startupSearch,
    fetchStartupApps,
    toggleStartupApp,
    setStartupSearch
  } = useBoosterStore()

  useEffect(() => {
    fetchStartupApps()
  }, [])

  const filtered = startupApps.filter(
    (app) =>
      app.name.toLowerCase().includes(startupSearch.toLowerCase()) ||
      app.command.toLowerCase().includes(startupSearch.toLowerCase()) ||
      app.publisher.toLowerCase().includes(startupSearch.toLowerCase())
  )

  const enabledCount = startupApps.filter((a) => a.enabled).length

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search startup apps..."
              value={startupSearch}
              onChange={(e) => setStartupSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>
          <span className="text-sm text-white/40 whitespace-nowrap">
            Enabled: <span className="text-white font-medium">{enabledCount}</span> of{' '}
            <span className="text-white font-medium">{startupApps.length}</span>
          </span>
        </div>
        <button
          onClick={fetchStartupApps}
          disabled={isLoadingStartup}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40 cursor-pointer"
        >
          {isLoadingStartup ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Refresh
        </button>
      </div>

      {/* Loading Skeleton */}
      {isLoadingStartup && startupApps.length === 0 && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-32 h-4 bg-white/10 rounded" />
                <div className="flex-1 h-4 bg-white/5 rounded" />
                <div className="w-16 h-6 bg-white/10 rounded-full" />
                <div className="w-10 h-5 bg-white/10 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoadingStartup && startupApps.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <Zap className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-sm">
            No startup applications found. Click "Refresh" to scan again.
          </p>
        </div>
      )}

      {/* App List */}
      {filtered.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_1fr_100px_80px_60px] gap-4 px-4 py-3 border-b border-white/5 text-xs text-white/30 uppercase tracking-wider">
            <span>Name</span>
            <span>Command</span>
            <span>Impact</span>
            <span>User</span>
            <span className="text-right">Status</span>
          </div>

          {/* Table Rows */}
          <AnimatePresence>
            {filtered.map((app) => {
              const impact = IMPACT_COLORS[app.impact] || IMPACT_COLORS.Low
              return (
                <motion.div
                  key={app.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-[1fr_1fr_100px_80px_60px] gap-4 px-4 py-3 items-center border-b border-white/[0.03] hover:bg-white/5 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{app.name}</p>
                    <p className="text-xs text-white/30 truncate">{app.publisher}</p>
                  </div>
                  <p className="text-xs text-white/40 truncate font-mono" title={app.command}>
                    {app.command}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${impact.bg} ${impact.text}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${impact.dot}`} />
                      {app.impact}
                    </span>
                  </div>
                  <span className="text-xs text-white/40">{app.user === 'All Users' ? 'System' : 'User'}</span>
                  <div className="flex justify-end">
                    <button
                      onClick={() => toggleStartupApp(app)}
                      className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                        app.enabled
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
                          : 'bg-white/10'
                      }`}
                    >
                      <motion.div
                        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                        animate={{ left: app.enabled ? '22px' : '2px' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* No Results */}
      {!isLoadingStartup && startupApps.length > 0 && filtered.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-white/40 text-sm">No startup apps match your search.</p>
        </div>
      )}
    </div>
  )
}

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader2, RefreshCw, Server, ShieldCheck } from 'lucide-react'
import { useBoosterStore } from '@/stores/boosterStore'

const STATUS_FILTERS = [
  { key: 'all' as const, label: 'All' },
  { key: 'running' as const, label: 'Running' },
  { key: 'stopped' as const, label: 'Stopped' }
]

export default function ServicesManager() {
  const {
    services,
    isLoadingServices,
    servicesSearch,
    servicesFilter,
    fetchServices,
    changeServiceStartType,
    setServicesSearch,
    setServicesFilter
  } = useBoosterStore()

  useEffect(() => {
    fetchServices()
  }, [])

  const filtered = services.filter((svc) => {
    const matchSearch =
      svc.displayName.toLowerCase().includes(servicesSearch.toLowerCase()) ||
      svc.name.toLowerCase().includes(servicesSearch.toLowerCase())
    const matchFilter =
      servicesFilter === 'all' ||
      (servicesFilter === 'running' && svc.status === 'Running') ||
      (servicesFilter === 'stopped' && svc.status === 'Stopped')
    return matchSearch && matchFilter
  })

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search services..."
              value={servicesSearch}
              onChange={(e) => setServicesSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>
          <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setServicesFilter(f.key)}
                className={`px-3 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                  servicesFilter === f.key
                    ? 'bg-white/10 text-white'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={fetchServices}
          disabled={isLoadingServices}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40 cursor-pointer"
        >
          {isLoadingServices ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Refresh
        </button>
      </div>

      {/* Loading Skeleton */}
      {isLoadingServices && services.length === 0 && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-48 h-4 bg-white/10 rounded" />
                <div className="flex-1 h-4 bg-white/5 rounded" />
                <div className="w-20 h-6 bg-white/10 rounded-full" />
                <div className="w-28 h-8 bg-white/10 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoadingServices && services.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <Server className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-sm">
            No services found. Click "Refresh" to scan again.
          </p>
        </div>
      )}

      {/* Services List */}
      {filtered.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_90px_30px_140px] gap-4 px-4 py-3 border-b border-white/5 text-xs text-white/30 uppercase tracking-wider">
            <span>Service</span>
            <span>Status</span>
            <span></span>
            <span>Startup Type</span>
          </div>

          {/* Table Rows */}
          <div className="max-h-[60vh] overflow-y-auto">
            <AnimatePresence>
              {filtered.map((svc) => (
                <motion.div
                  key={svc.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-[1fr_90px_30px_140px] gap-4 px-4 py-3 items-center border-b border-white/[0.03] hover:bg-white/5 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-white truncate">{svc.displayName}</p>
                      {svc.safeToDisable && (
                        <span title="Safe to disable">
                          <ShieldCheck className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/30 truncate font-mono">{svc.name}</p>
                  </div>
                  <span
                    className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      svc.status === 'Running'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-white/5 text-white/40'
                    }`}
                  >
                    {svc.status}
                  </span>
                  <div />
                  <select
                    value={svc.startType}
                    onChange={(e) => changeServiceStartType(svc.name, e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-white/20 cursor-pointer appearance-none"
                    style={{ backgroundImage: 'none' }}
                  >
                    <option value="Automatic" className="bg-[#1a1a2e] text-white">
                      Automatic
                    </option>
                    <option value="Manual" className="bg-[#1a1a2e] text-white">
                      Manual
                    </option>
                    <option value="Disabled" className="bg-[#1a1a2e] text-white">
                      Disabled
                    </option>
                  </select>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* No Results */}
      {!isLoadingServices && services.length > 0 && filtered.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-white/40 text-sm">No services match your search or filter.</p>
        </div>
      )}
    </div>
  )
}

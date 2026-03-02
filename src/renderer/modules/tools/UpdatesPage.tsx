import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  Loader2,
  RefreshCw,
  Shield,
  CheckCircle2,
  Clock,
  Package,
  AlertTriangle,
  Calendar,
  Search
} from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'

interface AvailableUpdate {
  title: string
  kbArticleId: string
  size: string
  isDownloaded: boolean
  isMandatory: boolean
  description: string
}

interface InstalledUpdate {
  id: string
  description: string
  date: string
}

type TabId = 'available' | 'installed'

export default function UpdatesPage() {
  const [activeTab, setActiveTab] = useState<TabId>('available')
  const [availableUpdates, setAvailableUpdates] = useState<AvailableUpdate[]>([])
  const [installedUpdates, setInstalledUpdates] = useState<InstalledUpdate[]>([])
  const [lastDate, setLastDate] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isLoadingInstalled, setIsLoadingInstalled] = useState(false)
  const [hasChecked, setHasChecked] = useState(false)
  const [hasLoadedInstalled, setHasLoadedInstalled] = useState(false)
  const addToast = useToastStore((s) => s.addToast)

  const handleCheck = useCallback(async () => {
    setIsChecking(true)
    try {
      const [updates, date] = await Promise.all([
        window.api.winUpdate.check(),
        window.api.winUpdate.lastDate()
      ])
      setAvailableUpdates(updates)
      setLastDate(date)
      setHasChecked(true)
      addToast({
        type: 'info',
        title: 'Update check complete',
        message: `${updates.length} update${updates.length !== 1 ? 's' : ''} found`
      })
    } catch {
      addToast({ type: 'error', title: 'Check failed', message: 'Could not check for Windows updates' })
    }
    setIsChecking(false)
  }, [])

  const loadInstalled = useCallback(async () => {
    if (hasLoadedInstalled) return
    setIsLoadingInstalled(true)
    try {
      const data = await window.api.winUpdate.installed()
      setInstalledUpdates(data)
      setHasLoadedInstalled(true)
    } catch {
      addToast({ type: 'error', title: 'Load failed', message: 'Could not load installed updates' })
    }
    setIsLoadingInstalled(false)
  }, [hasLoadedInstalled])

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab)
    if (tab === 'installed') loadInstalled()
  }

  const mandatoryCount = availableUpdates.filter((u) => u.isMandatory).length

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'available', label: 'Available Updates', count: hasChecked ? availableUpdates.length : undefined },
    { id: 'installed', label: 'Installed Updates', count: hasLoadedInstalled ? installedUpdates.length : undefined }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Windows Updates</h1>
          <p className="text-sm text-white/40 mt-1">
            Check and manage system updates
            {lastDate && (
              <span className="text-white/30"> &middot; Last updated: {lastDate}</span>
            )}
          </p>
        </div>
        <button
          onClick={handleCheck}
          disabled={isChecking}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          style={{ background: 'var(--accent-color)' }}
        >
          {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {isChecking ? 'Checking...' : 'Check for Updates'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] tabular-nums ${
                activeTab === tab.id ? 'bg-white/10' : 'bg-white/5'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Checking Progress */}
      <AnimatePresence>
        {isChecking && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-xl p-6"
          >
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-white/60" />
              <p className="text-sm text-white/60">Checking for updates...</p>
              <div className="w-full max-w-xs h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'var(--accent-color)' }}
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 12, ease: 'linear' }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Available Updates Tab */}
      {activeTab === 'available' && !isChecking && (
        <>
          {!hasChecked ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Shield className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40 text-sm">Click "Check for Updates" to scan for available updates</p>
            </div>
          ) : availableUpdates.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-2xl p-12 text-center"
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-400/60 mx-auto mb-4" />
              <p className="text-white/60 text-sm font-medium">Your system is up to date</p>
              <p className="text-white/30 text-xs mt-1">No pending updates available</p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {/* Summary Bar */}
              {mandatoryCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/10"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400/60 shrink-0" />
                  <p className="text-xs text-white/40">
                    <span className="text-amber-400 font-medium">{mandatoryCount}</span> mandatory update{mandatoryCount !== 1 ? 's' : ''} require attention
                  </p>
                </motion.div>
              )}

              {/* Updates List */}
              <div className="glass rounded-xl overflow-hidden">
                <div className="max-h-[480px] overflow-y-auto">
                  <AnimatePresence>
                    {availableUpdates.map((update, index) => (
                      <motion.div
                        key={update.kbArticleId || index}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="flex items-start gap-4 px-5 py-4 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                      >
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          update.isMandatory ? 'bg-amber-500/10' : 'bg-white/5'
                        }`}>
                          {update.isDownloaded ? (
                            <Download className={`w-5 h-5 ${update.isMandatory ? 'text-amber-400' : 'text-white/40'}`} />
                          ) : (
                            <Package className={`w-5 h-5 ${update.isMandatory ? 'text-amber-400' : 'text-white/40'}`} />
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm text-white font-medium truncate">{update.title}</p>
                          </div>
                          <p className="text-xs text-white/30 line-clamp-2">{update.description}</p>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-2 shrink-0">
                          {update.kbArticleId && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20">
                              KB{update.kbArticleId}
                            </span>
                          )}
                          {update.isMandatory && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/20">
                              Mandatory
                            </span>
                          )}
                          {update.isDownloaded && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                              Downloaded
                            </span>
                          )}
                          <span className="text-[11px] text-white/25 tabular-nums min-w-[60px] text-right">
                            {update.size}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Installed Updates Tab */}
      {activeTab === 'installed' && (
        <>
          {isLoadingInstalled ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-white/30 mx-auto mb-3" />
              <p className="text-sm text-white/40">Loading installed updates...</p>
            </div>
          ) : installedUpdates.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Package className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/40">No installed updates found</p>
            </div>
          ) : (
            <div className="glass rounded-xl overflow-hidden">
              {/* Table Header */}
              <div className="flex items-center gap-4 px-5 py-3 border-b border-white/5 text-xs text-white/30 font-medium uppercase tracking-wider">
                <span className="w-32">Update ID</span>
                <span className="flex-1">Description</span>
                <span className="w-28 text-right">Installed</span>
              </div>

              <div className="max-h-[480px] overflow-y-auto">
                <AnimatePresence>
                  {installedUpdates.map((update, index) => (
                    <motion.div
                      key={update.id || index}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.015 }}
                      className="flex items-center gap-4 px-5 py-3 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="w-32 text-xs font-mono text-[var(--accent-color)]/70 shrink-0">
                        {update.id}
                      </span>
                      <span className="flex-1 text-sm text-white/60 truncate">
                        {update.description}
                      </span>
                      <div className="w-28 flex items-center justify-end gap-1.5 text-white/25 shrink-0">
                        <Calendar className="w-3 h-3" />
                        <span className="text-[11px] tabular-nums">{update.date}</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

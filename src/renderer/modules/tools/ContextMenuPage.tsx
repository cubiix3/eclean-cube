import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Trash2, Loader2, AlertTriangle, CheckCircle2, Terminal, MapPin } from 'lucide-react'

interface ContextMenuEntry {
  name: string
  key: string
  command: string
  location: string
  icon?: string
}

const LOCATION_COLORS: Record<string, string> = {
  Desktop: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  Directory: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
  File: 'bg-green-400/10 text-green-400 border-green-400/20',
  Drive: 'bg-amber-400/10 text-amber-400 border-amber-400/20'
}

export default function ContextMenuPage() {
  const [entries, setEntries] = useState<ContextMenuEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [removingKey, setRemovingKey] = useState<string | null>(null)
  const [confirmKey, setConfirmKey] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<{ success: boolean; name: string; error?: string } | null>(null)

  const loadEntries = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await window.api.contextMenu.getEntries()
      setEntries(data)
    } catch (err) {
      console.error('Failed to load context menu entries:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  const handleRemove = async (entry: ContextMenuEntry) => {
    setRemovingKey(entry.key)
    setConfirmKey(null)
    setLastResult(null)
    try {
      const result = await window.api.contextMenu.remove(entry.key)
      if (result.success) {
        setEntries((prev) => prev.filter((e) => e.key !== entry.key))
        setLastResult({ success: true, name: entry.name })
      } else {
        setLastResult({ success: false, name: entry.name, error: result.error })
      }
    } catch (err) {
      setLastResult({ success: false, name: entry.name, error: 'Unexpected error' })
    } finally {
      setRemovingKey(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Context Menu Manager</h1>
        <p className="text-sm text-white/40 mt-1">
          View and remove right-click context menu entries
          {!isLoading && entries.length > 0 && (
            <span className="text-white/30"> &middot; {entries.length} entries</span>
          )}
        </p>
      </div>

      {/* Result Banner */}
      <AnimatePresence>
        {lastResult && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              {lastResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400" />
              )}
              <span className="text-sm text-white/80">
                {lastResult.success
                  ? `Removed "${lastResult.name}" successfully`
                  : `Failed to remove "${lastResult.name}": ${lastResult.error}`}
              </span>
            </div>
            <button
              onClick={() => setLastResult(null)}
              className="text-xs text-white/40 hover:text-white/60 cursor-pointer"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {isLoading && (
        <div className="glass rounded-2xl p-12 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-white/40" />
          <p className="text-sm text-white/40">Loading context menu entries...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && entries.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <Menu className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-sm">No custom context menu entries found</p>
        </div>
      )}

      {/* Entries List */}
      {!isLoading && entries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-white/5">
            <span className="text-xs text-white/50 uppercase tracking-wider">Context Menu Entries</span>
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            {entries.map((entry, index) => {
              const locationClass = LOCATION_COLORS[entry.location] || 'bg-white/5 text-white/50 border-white/10'

              return (
                <motion.div
                  key={entry.key}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    {entry.icon ? (
                      <img src={entry.icon} alt="" className="w-4 h-4" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    ) : (
                      <Menu size={14} className="text-white/30" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm text-white font-medium truncate">{entry.name}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${locationClass}`}>
                        <MapPin size={8} className="inline mr-0.5 -mt-px" />
                        {entry.location}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Terminal size={10} className="text-white/20 shrink-0" />
                      <p className="text-xs text-white/40 truncate font-mono">{entry.command}</p>
                    </div>
                    <p className="text-[10px] text-white/20 truncate mt-0.5 font-mono">{entry.key}</p>
                  </div>

                  <div className="shrink-0">
                    {confirmKey === entry.key ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleRemove(entry)}
                          disabled={removingKey === entry.key}
                          className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {removingKey === entry.key ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            'Confirm'
                          )}
                        </button>
                        <button
                          onClick={() => setConfirmKey(null)}
                          className="px-2.5 py-1 rounded-lg bg-white/5 text-white/40 text-xs hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmKey(entry.key)}
                        className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}
    </div>
  )
}

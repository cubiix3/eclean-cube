import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { History, Plus, Loader2, Calendar, Shield, CheckCircle2, AlertTriangle } from 'lucide-react'

interface RestorePoint {
  sequenceNumber: number
  description: string
  creationTime: string
  type: string
}

const TYPE_BADGES: Record<string, { label: string; color: string }> = {
  APPLICATION_INSTALL: { label: 'Install', color: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  APPLICATION_UNINSTALL: { label: 'Uninstall', color: 'bg-red-400/10 text-red-400 border-red-400/20' },
  DEVICE_DRIVER_INSTALL: { label: 'Driver', color: 'bg-purple-400/10 text-purple-400 border-purple-400/20' },
  MODIFY_SETTINGS: { label: 'Settings', color: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  MANUAL: { label: 'Manual', color: 'bg-green-400/10 text-green-400 border-green-400/20' }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  } catch {
    return dateStr
  }
}

export default function RestorePointPage() {
  const [points, setPoints] = useState<RestorePoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [description, setDescription] = useState('')
  const [createResult, setCreateResult] = useState<{ success: boolean; error?: string } | null>(null)

  const loadPoints = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await window.api.restore.getPoints()
      setPoints(data)
    } catch (err) {
      console.error('Failed to load restore points:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPoints()
  }, [loadPoints])

  const handleCreate = async () => {
    if (!description.trim()) return
    setIsCreating(true)
    setCreateResult(null)
    try {
      const result = await window.api.restore.create(description.trim())
      if (result.success) {
        setCreateResult({ success: true })
        setDescription('')
        setShowCreateForm(false)
        loadPoints()
      } else {
        setCreateResult({ success: false, error: result.error })
      }
    } catch (err) {
      setCreateResult({ success: false, error: 'Unexpected error' })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Restore Points</h1>
          <p className="text-sm text-white/40 mt-1">
            Manage system restore points
            {!isLoading && points.length > 0 && (
              <span className="text-white/30"> &middot; {points.length} restore points</span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all cursor-pointer"
          style={{ background: 'var(--accent-color)' }}
        >
          <Plus className="w-4 h-4" />
          Create Restore Point
        </button>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">New Restore Point</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="Enter a description..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-white/20 transition-colors"
                  disabled={isCreating}
                />
                <button
                  onClick={handleCreate}
                  disabled={isCreating || !description.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  style={{ background: 'var(--accent-color)' }}
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
                <button
                  onClick={() => { setShowCreateForm(false); setDescription('') }}
                  className="px-4 py-2.5 rounded-lg bg-white/5 text-white/40 text-sm hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Result */}
      <AnimatePresence>
        {createResult && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              {createResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400" />
              )}
              <span className="text-sm text-white/80">
                {createResult.success
                  ? 'Restore point created successfully'
                  : `Failed to create restore point: ${createResult.error}`}
              </span>
            </div>
            <button
              onClick={() => setCreateResult(null)}
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
          <p className="text-sm text-white/40">Loading restore points...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && points.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <History className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-sm">No restore points found</p>
          <p className="text-white/30 text-xs mt-1">Create one to save your current system state</p>
        </div>
      )}

      {/* Restore Points List */}
      {!isLoading && points.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-white/5">
            <span className="text-xs text-white/50 uppercase tracking-wider">System Restore Points</span>
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            {points.map((point, index) => {
              const badge = TYPE_BADGES[point.type] || { label: point.type, color: 'bg-white/5 text-white/50 border-white/10' }

              return (
                <motion.div
                  key={point.sequenceNumber}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="flex items-center gap-4 px-4 py-3.5 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <Shield size={16} className="text-white/30" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm text-white font-medium truncate">{point.description}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={10} className="text-white/20" />
                        <span className="text-xs text-white/40">{formatDate(point.creationTime)}</span>
                      </div>
                      <span className="text-[10px] text-white/20 font-mono">#{point.sequenceNumber}</span>
                    </div>
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

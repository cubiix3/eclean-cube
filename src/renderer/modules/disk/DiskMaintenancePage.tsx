import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HardDrive,
  Loader2,
  Search,
  Zap,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Cpu
} from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'

interface DiskDriveInfo {
  letter: string
  label: string
  mediaType: string
  sizeGB: number
  freeGB: number
}

interface AnalysisResult {
  fragmentPercent: number
  status: string
}

interface OptimizeResult {
  drive: string
  success: boolean
  type: 'trim' | 'defrag'
  message: string
}

interface DriveState {
  analyzing: boolean
  optimizing: boolean
  analysis: AnalysisResult | null
  optimizeResult: OptimizeResult | null
}

export default function DiskMaintenancePage() {
  const [drives, setDrives] = useState<DiskDriveInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [driveStates, setDriveStates] = useState<Record<string, DriveState>>({})
  const addToast = useToastStore((s) => s.addToast)

  const fetchDrives = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await window.api.disk.getDrives()
      setDrives(data)
      const states: Record<string, DriveState> = {}
      for (const d of data) {
        states[d.letter] = driveStates[d.letter] ?? {
          analyzing: false,
          optimizing: false,
          analysis: null,
          optimizeResult: null
        }
      }
      setDriveStates(states)
    } catch {
      addToast({
        type: 'error',
        title: 'Failed to load drives',
        message: 'Could not enumerate disk drives'
      })
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchDrives()
  }, [fetchDrives])

  const updateDriveState = (letter: string, patch: Partial<DriveState>) => {
    setDriveStates((prev) => ({
      ...prev,
      [letter]: { ...prev[letter], ...patch }
    }))
  }

  const handleAnalyze = async (letter: string) => {
    updateDriveState(letter, { analyzing: true, analysis: null, optimizeResult: null })
    try {
      const result = await window.api.disk.analyze(letter)
      updateDriveState(letter, { analyzing: false, analysis: result })
      addToast({
        type: 'info',
        title: `${letter}: drive analyzed`,
        message: `${result.fragmentPercent}% fragmented`
      })
    } catch {
      updateDriveState(letter, { analyzing: false })
      addToast({
        type: 'error',
        title: `${letter}: analysis failed`,
        message: 'Could not analyze drive fragmentation'
      })
    }
  }

  const handleOptimize = async (drive: DiskDriveInfo) => {
    const isSSD = drive.mediaType === 'SSD'
    updateDriveState(drive.letter, { optimizing: true, optimizeResult: null })
    try {
      const result = await window.api.disk.optimize(drive.letter)
      updateDriveState(drive.letter, { optimizing: false, optimizeResult: result })
      if (result.success) {
        addToast({
          type: 'success',
          title: `${drive.letter}: ${isSSD ? 'TRIM' : 'Defrag'} complete`,
          message: result.message
        })
      } else {
        addToast({
          type: 'error',
          title: `${drive.letter}: optimization failed`,
          message: result.message
        })
      }
    } catch {
      updateDriveState(drive.letter, { optimizing: false })
      addToast({
        type: 'error',
        title: `${drive.letter}: optimization failed`,
        message: `Could not ${isSSD ? 'TRIM' : 'defragment'} drive`
      })
    }
  }

  const usedPercent = (drive: DiskDriveInfo) => {
    if (drive.sizeGB <= 0) return 0
    return Math.round(((drive.sizeGB - drive.freeGB) / drive.sizeGB) * 100)
  }

  const formatGB = (gb: number) => {
    if (gb >= 1000) return `${(gb / 1024).toFixed(1)} TB`
    return `${Math.round(gb)} GB`
  }

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-500'
    if (percent >= 75) return 'bg-amber-500'
    return 'bg-[var(--accent-color)]'
  }

  const getFragmentColor = (percent: number) => {
    if (percent >= 30) return 'text-red-400'
    if (percent >= 15) return 'text-amber-400'
    return 'text-emerald-400'
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Disk Maintenance</h1>
          <p className="text-sm text-white/40 mt-1">Optimize your drives</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="glass rounded-2xl p-5 h-44 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Disk Maintenance</h1>
          <p className="text-sm text-white/40 mt-1">Analyze and optimize your drives</p>
        </div>
        <button
          onClick={fetchDrives}
          className="p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          title="Refresh drives"
        >
          <RefreshCw className="w-4 h-4 text-white/40" />
        </button>
      </div>

      {/* Drive Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {drives.map((drive, index) => {
            const state = driveStates[drive.letter]
            const isSSD = drive.mediaType === 'SSD'
            const used = usedPercent(drive)
            const busy = state?.analyzing || state?.optimizing

            return (
              <motion.div
                key={drive.letter}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ delay: index * 0.06 }}
                className="glass rounded-2xl p-5 space-y-4"
              >
                {/* Drive Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                      <HardDrive className="w-5 h-5 text-white/60" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">
                          {drive.letter}:
                          {drive.label ? ` ${drive.label}` : ''}
                        </p>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            isSSD
                              ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {isSSD ? 'SSD' : 'HDD'}
                        </span>
                      </div>
                      <p className="text-xs text-white/40 mt-0.5">
                        {formatGB(drive.freeGB)} free of {formatGB(drive.sizeGB)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Usage Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-white/40">
                    <span>Storage used</span>
                    <span>{used}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${used}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className={`h-full rounded-full ${getUsageColor(used)}`}
                    />
                  </div>
                </div>

                {/* Analysis Result */}
                <AnimatePresence>
                  {state?.analysis && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <Cpu className="w-4 h-4 text-white/40 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-white/40">Fragmentation</p>
                          <p className={`text-sm font-medium ${getFragmentColor(state.analysis.fragmentPercent)}`}>
                            {state.analysis.fragmentPercent}%
                          </p>
                        </div>
                        <p className="text-xs text-white/30">{state.analysis.status}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Optimize Result */}
                <AnimatePresence>
                  {state?.optimizeResult && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div
                        className={`flex items-center gap-3 p-3 rounded-xl border ${
                          state.optimizeResult.success
                            ? 'bg-emerald-500/10 border-emerald-500/20'
                            : 'bg-red-500/10 border-red-500/20'
                        }`}
                      >
                        {state.optimizeResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs font-medium ${
                              state.optimizeResult.success ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {state.optimizeResult.success ? 'Optimization complete' : 'Optimization failed'}
                          </p>
                          <p className="text-xs text-white/40 mt-0.5 truncate">
                            {state.optimizeResult.message}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            state.optimizeResult.type === 'trim'
                              ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {state.optimizeResult.type === 'trim' ? 'TRIM' : 'Defrag'}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleAnalyze(drive.letter)}
                    disabled={busy}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-white/5 border border-white/8 text-white/70 hover:bg-white/8 hover:text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {state?.analyzing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Analyze
                  </button>
                  <button
                    onClick={() => handleOptimize(drive)}
                    disabled={busy}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: busy ? 'rgba(255,255,255,0.05)' : 'var(--accent-color)',
                      borderColor: busy ? 'rgba(255,255,255,0.08)' : 'transparent',
                      borderWidth: '1px',
                      borderStyle: 'solid'
                    }}
                  >
                    {state?.optimizing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    {isSSD ? 'TRIM' : 'Defrag'}
                  </button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {drives.length === 0 && !isLoading && (
        <div className="glass rounded-2xl p-10 text-center">
          <HardDrive className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40">No drives detected</p>
          <p className="text-xs text-white/25 mt-1">
            Drive enumeration may require administrator privileges
          </p>
        </div>
      )}
    </div>
  )
}

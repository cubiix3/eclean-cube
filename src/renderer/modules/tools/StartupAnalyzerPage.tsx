import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Timer,
  Loader2,
  Clock,
  Calendar,
  Activity,
  Cpu,
  Play
} from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'

interface BootEntry {
  name: string
  path: string
  impactMs: number
  source: string
}

interface AnalyzeResult {
  totalBootMs: number
  lastBootDate: string
  entries: BootEntry[]
}

function getImpactColor(ms: number): string {
  if (ms > 5000) return '#ef4444'  // red-500
  if (ms > 2000) return '#f59e0b'  // amber-500
  return '#22c55e'                  // green-500
}

function getImpactLabel(ms: number): string {
  if (ms > 5000) return 'High'
  if (ms > 2000) return 'Medium'
  return 'Low'
}

function getImpactBadgeClasses(ms: number): string {
  if (ms > 5000) return 'bg-red-500/15 text-red-400 border-red-500/20'
  if (ms > 2000) return 'bg-amber-500/15 text-amber-400 border-amber-500/20'
  return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
}

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${ms}ms`
}

export default function StartupAnalyzerPage() {
  const [result, setResult] = useState<AnalyzeResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const addToast = useToastStore((s) => s.addToast)

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setResult(null)
    try {
      const data = await window.api.startupAnalyzer.analyze()
      // Sort entries by impact descending
      data.entries.sort((a: BootEntry, b: BootEntry) => b.impactMs - a.impactMs)
      setResult(data)
      addToast({
        type: 'info',
        title: 'Boot analysis complete',
        message: `Total boot time: ${formatMs(data.totalBootMs)}`
      })
    } catch {
      addToast({ type: 'error', title: 'Analysis failed', message: 'Could not analyze boot performance' })
    }
    setIsAnalyzing(false)
  }

  const maxImpact = result ? Math.max(...result.entries.map((e) => e.impactMs), 1) : 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Startup Analyzer</h1>
          <p className="text-sm text-white/40 mt-1">Analyze boot performance and identify slow startup items</p>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          style={{ background: 'var(--accent-color)' }}
        >
          {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {isAnalyzing ? 'Analyzing...' : 'Analyze Boot'}
        </button>
      </div>

      {/* Analyzing Progress */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-xl p-6"
          >
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-white/60" />
              <p className="text-sm text-white/60">Analyzing boot performance...</p>
              <div className="w-full max-w-xs h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'var(--accent-color)' }}
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 6, ease: 'linear' }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!result && !isAnalyzing && (
        <div className="glass rounded-2xl p-12 text-center">
          <Timer className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-sm">Click "Analyze Boot" to measure startup performance</p>
          <p className="text-white/25 text-xs mt-1">This will collect boot timing data from Windows</p>
        </div>
      )}

      {/* Results */}
      {result && !isAnalyzing && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white/40" />
                </div>
                <div>
                  <p className="text-xs text-white/40">Total Boot Time</p>
                  <p className="text-xl font-bold text-white tabular-nums">{formatMs(result.totalBootMs)}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white/40" />
                </div>
                <div>
                  <p className="text-xs text-white/40">Last Boot Date</p>
                  <p className="text-sm font-medium text-white mt-0.5">{result.lastBootDate}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white/40" />
                </div>
                <div>
                  <p className="text-xs text-white/40">Startup Items</p>
                  <p className="text-xl font-bold text-white tabular-nums">{result.entries.length}</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bar Chart */}
          {result.entries.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Activity className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/40">No startup entries found</p>
            </div>
          ) : (
            <div className="glass rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
                <Cpu className="w-4 h-4 text-white/40" />
                <h2 className="text-sm font-medium text-white/60">Boot Impact by Item</h2>
                <span className="text-xs text-white/25 ml-auto">Sorted by impact (highest first)</span>
              </div>

              <div className="max-h-[520px] overflow-y-auto">
                {result.entries.map((entry, index) => {
                  const barPercent = Math.max((entry.impactMs / maxImpact) * 100, 2)
                  const color = getImpactColor(entry.impactMs)

                  return (
                    <motion.div
                      key={`${entry.path}-${index}`}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="px-5 py-3.5 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Top Row: Name + Source + Badge + Time */}
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-white font-medium truncate">{entry.name}</p>
                            <span className="text-[10px] text-white/25 px-1.5 py-0.5 rounded bg-white/5 shrink-0">
                              {entry.source}
                            </span>
                          </div>
                          <p className="text-[11px] text-white/20 font-mono truncate mt-0.5">{entry.path}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${getImpactBadgeClasses(entry.impactMs)}`}>
                          {getImpactLabel(entry.impactMs)}
                        </span>
                        <span
                          className="text-sm font-medium tabular-nums shrink-0 min-w-[64px] text-right"
                          style={{ color }}
                        >
                          {formatMs(entry.impactMs)}
                        </span>
                      </div>

                      {/* Bar */}
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${barPercent}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut', delay: index * 0.03 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

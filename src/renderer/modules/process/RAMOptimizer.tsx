import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Zap, HardDrive, MemoryStick, Server, ArrowDown } from 'lucide-react'
import { useProcessStore } from '@/stores/processStore'

function RAMGauge({ percent, isOptimizing }: { percent: number; isOptimizing: boolean }) {
  const radius = 80
  const stroke = 10
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference

  const getColor = (p: number) => {
    if (p < 50) return { start: '#34d399', end: '#10b981' }
    if (p < 75) return { start: '#fbbf24', end: '#f59e0b' }
    return { start: '#f87171', end: '#ef4444' }
  }
  const color = getColor(percent)

  return (
    <div className="relative flex items-center justify-center">
      <svg width="200" height="200" className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={stroke}
        />
        {/* Progress circle */}
        <motion.circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke={`url(#ramGradient)`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{
            strokeDashoffset: offset,
            filter: isOptimizing ? 'drop-shadow(0 0 12px rgba(59,130,246,0.6))' : 'none'
          }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="ramGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color.start} />
            <stop offset="100%" stopColor={color.end} />
          </linearGradient>
        </defs>
      </svg>

      {/* Center Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isOptimizing ? (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Zap size={32} className="text-blue-400" />
          </motion.div>
        ) : (
          <>
            <motion.span
              className="text-3xl font-bold text-white"
              key={percent}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {percent}%
            </motion.span>
            <span className="text-xs text-white/40 mt-1">RAM Used</span>
          </>
        )}
      </div>

      {/* Pulse animation during optimization */}
      {isOptimizing && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-blue-500/30"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ borderRadius: '50%' }}
        />
      )}
    </div>
  )
}

export default function RAMOptimizer() {
  const {
    ramDetails,
    isLoadingRAM,
    isOptimizing,
    optimizeResult,
    fetchRAMDetails,
    optimizeRAM,
    clearOptimizeResult
  } = useProcessStore()

  useEffect(() => {
    fetchRAMDetails()
    return () => clearOptimizeResult()
  }, [])

  return (
    <div className="space-y-6">
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Gauge and Optimize Button */}
        <div className="glass rounded-xl border border-white/5 p-6 flex flex-col items-center">
          <h3 className="text-sm font-medium text-white/60 mb-6">Memory Usage</h3>

          <RAMGauge
            percent={ramDetails?.percentUsed ?? 0}
            isOptimizing={isOptimizing}
          />

          {/* RAM Stats */}
          <div className="grid grid-cols-2 gap-4 w-full mt-6">
            <div className="text-center">
              <div className="text-xs text-white/40 mb-1">Total</div>
              <div className="text-sm font-semibold text-white">
                {ramDetails ? `${(ramDetails.totalMB / 1024).toFixed(1)} GB` : '--'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-white/40 mb-1">Used</div>
              <div className="text-sm font-semibold text-yellow-400">
                {ramDetails ? `${(ramDetails.usedMB / 1024).toFixed(1)} GB` : '--'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-white/40 mb-1">Available</div>
              <div className="text-sm font-semibold text-emerald-400">
                {ramDetails ? `${(ramDetails.availableMB / 1024).toFixed(1)} GB` : '--'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-white/40 mb-1">Cached</div>
              <div className="text-sm font-semibold text-blue-400">
                {ramDetails ? `${(ramDetails.cachedMB / 1024).toFixed(1)} GB` : '--'}
              </div>
            </div>
          </div>

          {/* Optimize Button */}
          <motion.button
            onClick={optimizeRAM}
            disabled={isOptimizing || isLoadingRAM}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/20 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Zap size={16} />
            {isOptimizing ? 'Optimizing...' : 'Optimize RAM'}
          </motion.button>

          {/* Before/After Result */}
          {optimizeResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 w-full glass rounded-xl border border-white/5 p-4"
            >
              <div className="text-xs text-white/40 mb-3 text-center font-medium">
                Optimization Result
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-center flex-1">
                  <div className="text-xs text-white/30 mb-1">Before</div>
                  <div className="text-lg font-bold text-red-400">
                    {(optimizeResult.beforeMB / 1024).toFixed(1)} GB
                  </div>
                </div>
                <ArrowDown size={18} className="text-white/20 rotate-[-90deg]" />
                <div className="text-center flex-1">
                  <div className="text-xs text-white/30 mb-1">After</div>
                  <div className="text-lg font-bold text-emerald-400">
                    {(optimizeResult.afterMB / 1024).toFixed(1)} GB
                  </div>
                </div>
              </div>
              {optimizeResult.freedMB > 0 && (
                <div className="mt-3 text-center text-sm font-medium text-blue-400">
                  Freed {optimizeResult.freedMB >= 1024
                    ? `${(optimizeResult.freedMB / 1024).toFixed(1)} GB`
                    : `${optimizeResult.freedMB} MB`
                  }
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Right: Top RAM Consumers */}
        <div className="glass rounded-xl border border-white/5 p-6">
          <h3 className="text-sm font-medium text-white/60 mb-4 flex items-center gap-2">
            <Server size={14} />
            Top RAM Consumers
          </h3>

          {isLoadingRAM && !ramDetails ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-white/5 rounded animate-pulse w-32" />
                  <div className="h-3 bg-white/5 rounded animate-pulse w-full" />
                </div>
              ))}
            </div>
          ) : ramDetails?.topProcesses.length ? (
            <div className="space-y-4">
              {ramDetails.topProcesses.map((proc, idx) => {
                const maxRAM = ramDetails.topProcesses[0]?.ramMB || 1
                const barPercent = (proc.ramMB / maxRAM) * 100

                return (
                  <motion.div
                    key={`${proc.pid}-${proc.name}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/30 font-mono w-5">#{idx + 1}</span>
                        <span className="text-sm text-white/80 font-mono truncate max-w-[160px]">
                          {proc.name}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-white/60 font-mono">
                        {proc.ramMB >= 1024
                          ? `${(proc.ramMB / 1024).toFixed(1)} GB`
                          : `${proc.ramMB.toFixed(0)} MB`
                        }
                      </span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background:
                            proc.ramMB >= 500
                              ? 'linear-gradient(90deg, #f87171, #ef4444)'
                              : proc.ramMB >= 100
                                ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                                : 'linear-gradient(90deg, #34d399, #10b981)'
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${barPercent}%` }}
                        transition={{ duration: 0.6, delay: idx * 0.05 }}
                      />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="text-white/30 text-sm text-center py-8">No data available</div>
          )}

          {/* RAM Info Cards */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="bg-white/[0.03] rounded-lg p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <MemoryStick size={14} className="text-blue-400" />
              </div>
              <div>
                <div className="text-[10px] text-white/30 uppercase tracking-wider">Physical</div>
                <div className="text-sm font-medium text-white">
                  {ramDetails ? `${(ramDetails.totalMB / 1024).toFixed(0)} GB` : '--'}
                </div>
              </div>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <HardDrive size={14} className="text-emerald-400" />
              </div>
              <div>
                <div className="text-[10px] text-white/30 uppercase tracking-wider">Free</div>
                <div className="text-sm font-medium text-white">
                  {ramDetails ? `${(ramDetails.availableMB / 1024).toFixed(1)} GB` : '--'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

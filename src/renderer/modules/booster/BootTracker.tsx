import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell
} from 'recharts'
import {
  Timer,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Loader2,
  RefreshCw,
  Lightbulb,
  Rocket
} from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'
import { useBoosterStore } from '@/stores/boosterStore'

interface BootTimeEntry {
  date: string
  bootDurationSeconds: number
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatDateFull(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}

function getBootRating(seconds: number): { label: string; color: string } {
  if (seconds <= 20) return { label: 'Excellent', color: 'text-green-400' }
  if (seconds <= 40) return { label: 'Good', color: 'text-cyan-400' }
  if (seconds <= 60) return { label: 'Average', color: 'text-amber-400' }
  return { label: 'Slow', color: 'text-red-400' }
}

function getBarColor(seconds: number, isBest: boolean, isWorst: boolean): string {
  if (isBest) return '#22c55e'
  if (isWorst) return '#ef4444'
  if (seconds <= 30) return '#06b6d4'
  if (seconds <= 50) return '#f59e0b'
  return '#f97316'
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1e1e2e] border border-white/10 rounded-lg p-2 text-xs">
      <p className="text-white/40 mb-1">{label}</p>
      <p className="text-cyan-400">Boot time: {payload[0].value}s</p>
    </div>
  )
}

export default function BootTracker() {
  const [bootTimes, setBootTimes] = useState<BootTimeEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const addToast = useToastStore((s) => s.addToast)
  const setActiveTab = useBoosterStore((s) => s.setActiveTab)

  const fetchBootTimes = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await (window.api as any).booster.getBootTimes()
      setBootTimes(result || [])
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to fetch boot times',
        message: err?.message || 'An unexpected error occurred'
      })
    }
    setIsLoading(false)
  }, [addToast])

  useEffect(() => {
    fetchBootTimes()
  }, [fetchBootTimes])

  // Calculate stats
  const durations = bootTimes.map((b) => b.bootDurationSeconds)
  const lastBoot = durations.length > 0 ? durations[0] : 0
  const average = durations.length > 0 ? durations.reduce((s, d) => s + d, 0) / durations.length : 0
  const best = durations.length > 0 ? Math.min(...durations) : 0
  const worst = durations.length > 0 ? Math.max(...durations) : 0

  // Trend: compare average of first half vs second half
  let trendDirection: 'improving' | 'worsening' | 'stable' = 'stable'
  if (durations.length >= 4) {
    const mid = Math.floor(durations.length / 2)
    const olderAvg = durations.slice(mid).reduce((s, d) => s + d, 0) / (durations.length - mid)
    const newerAvg = durations.slice(0, mid).reduce((s, d) => s + d, 0) / mid
    const diff = olderAvg - newerAvg
    if (diff > 3) trendDirection = 'improving'
    else if (diff < -3) trendDirection = 'worsening'
  }

  const rating = getBootRating(lastBoot)

  // Chart data (reversed so oldest is on left)
  const chartData = [...bootTimes]
    .reverse()
    .map((b) => ({
      date: formatDate(b.date),
      fullDate: formatDateFull(b.date),
      seconds: b.bootDurationSeconds
    }))

  return (
    <div className="space-y-4">
      {/* Main Boot Time Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 lg:col-span-1 flex flex-col items-center justify-center text-center"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-400/20 flex items-center justify-center mb-3">
            <Timer className="w-6 h-6 text-cyan-400" />
          </div>
          {isLoading ? (
            <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
          ) : (
            <>
              <p className="text-4xl font-bold text-white mb-1">
                {lastBoot > 0 ? `${lastBoot}s` : '--'}
              </p>
              <p className="text-sm text-white/40">Last Boot Time</p>
              {lastBoot > 0 && (
                <span className={`text-xs mt-2 ${rating.color} font-medium`}>
                  {rating.label}
                </span>
              )}
            </>
          )}
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass rounded-2xl p-5 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-white/40 uppercase tracking-wider">Statistics</h3>
            <button
              onClick={fetchBootTimes}
              disabled={isLoading}
              className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/50 transition-colors cursor-pointer disabled:opacity-30"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-white/30 mb-1">Average</p>
              <p className="text-lg font-bold text-white/80">
                {average > 0 ? `${Math.round(average)}s` : '--'}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/30 mb-1">Best</p>
              <p className="text-lg font-bold text-green-400">
                {best > 0 ? `${best}s` : '--'}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/30 mb-1">Worst</p>
              <p className="text-lg font-bold text-red-400">
                {worst > 0 ? `${worst}s` : '--'}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/30 mb-1">Trend</p>
              <div className="flex items-center gap-1.5">
                {trendDirection === 'improving' && (
                  <>
                    <TrendingDown className="w-4 h-4 text-green-400" />
                    <span className="text-lg font-bold text-green-400">Better</span>
                  </>
                )}
                {trendDirection === 'worsening' && (
                  <>
                    <TrendingUp className="w-4 h-4 text-red-400" />
                    <span className="text-lg font-bold text-red-400">Worse</span>
                  </>
                )}
                {trendDirection === 'stable' && (
                  <>
                    <Minus className="w-4 h-4 text-white/40" />
                    <span className="text-lg font-bold text-white/40">Stable</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <h3 className="text-sm text-white/40 uppercase tracking-wider">Boot History</h3>
          <span className="text-xs text-white/20 ml-auto">Last {bootTimes.length} boots</span>
        </div>
        <div className="h-[220px]">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-white/20 text-sm">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading boot history...
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-white/20 text-sm">
              No boot data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis
                  dataKey="date"
                  stroke="rgba(255,255,255,0.1)"
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.1)"
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                  width={35}
                  unit="s"
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="seconds" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getBarColor(
                        entry.seconds,
                        entry.seconds === best,
                        entry.seconds === worst
                      )}
                      fillOpacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        {chartData.length > 0 && (
          <div className="flex items-center gap-4 mt-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-white/30">Best</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-white/30">Worst</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-cyan-500" />
              <span className="text-white/30">Normal</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Tips Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass rounded-2xl p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-amber-400" />
          </div>
          <h3 className="text-sm text-white/40 uppercase tracking-wider">Tips to Improve Boot Time</h3>
        </div>
        <div className="space-y-3">
          {lastBoot > 40 && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <Rocket className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-white/70">
                  Your boot time is{' '}
                  <span className="text-amber-400 font-medium">{lastBoot} seconds</span>.
                  {lastBoot > 60
                    ? ' This is slower than average. Consider disabling unnecessary startup apps.'
                    : ' You can improve it by managing your startup applications.'}
                </p>
                <button
                  onClick={() => setActiveTab('startup')}
                  className="text-xs text-cyan-400 hover:text-cyan-300 mt-2 transition-colors cursor-pointer"
                >
                  Go to Startup Apps &rarr;
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <p className="text-xs text-white/50 mb-1 font-medium">Disable unnecessary startup apps</p>
              <p className="text-xs text-white/30">
                Each startup app adds seconds to your boot time. Disable ones you do not need immediately.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <p className="text-xs text-white/50 mb-1 font-medium">Enable Fast Startup in Windows</p>
              <p className="text-xs text-white/30">
                Windows Fast Startup uses hibernation to speed up the boot process significantly.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <p className="text-xs text-white/50 mb-1 font-medium">Upgrade to an SSD</p>
              <p className="text-xs text-white/30">
                If you are still using an HDD, upgrading to an SSD can reduce boot times by 70% or more.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <p className="text-xs text-white/50 mb-1 font-medium">Manage Windows Services</p>
              <p className="text-xs text-white/30">
                Disable services you do not need to reduce background load during startup.
              </p>
              <button
                onClick={() => setActiveTab('services')}
                className="text-xs text-cyan-400 hover:text-cyan-300 mt-1 transition-colors cursor-pointer"
              >
                Go to Services &rarr;
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

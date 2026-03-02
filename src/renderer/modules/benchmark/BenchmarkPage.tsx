import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Cpu, MemoryStick, HardDrive, Play, Gauge, Clock, TrendingUp } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { useBenchmarkStore } from '@/stores/benchmarkStore'
import { useToastStore } from '@/stores/toastStore'

function getScoreRating(score: number): { label: string; color: string } {
  if (score >= 8000) return { label: 'Excellent', color: '#22c55e' }
  if (score >= 5000) return { label: 'Good', color: '#3b82f6' }
  if (score >= 3000) return { label: 'Average', color: '#f59e0b' }
  return { label: 'Slow', color: '#ef4444' }
}

function AnimatedScore({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (value === 0) {
      setDisplay(0)
      return
    }
    let start = 0
    const step = value / (duration * 60)
    const timer = setInterval(() => {
      start += step
      if (start >= value) {
        setDisplay(value)
        clearInterval(timer)
      } else {
        setDisplay(Math.round(start))
      }
    }, 1000 / 60)
    return () => clearInterval(timer)
  }, [value, duration])

  return <span>{display.toLocaleString()}</span>
}

function ScoreCircle({ score, isRunning }: { score: number | null; isRunning: boolean }) {
  const radius = 70
  const strokeWidth = 6
  const circumference = 2 * Math.PI * radius
  const maxScore = 10000
  const normalizedScore = Math.min(score || 0, maxScore)
  const progress = (normalizedScore / maxScore) * circumference
  const rating = score ? getScoreRating(score) : { label: '--', color: 'rgba(255,255,255,0.2)' }

  return (
    <div className="relative w-[180px] h-[180px] mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 180 180">
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        {score !== null && (
          <motion.circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke={rating.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 8px ${rating.color}40)` }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isRunning ? (
          <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        ) : score !== null ? (
          <>
            <div className="text-3xl font-bold text-white">
              <AnimatedScore value={score} />
            </div>
            <div className="text-xs mt-1" style={{ color: rating.color }}>
              {rating.label}
            </div>
          </>
        ) : (
          <div className="text-white/20 text-sm">No data</div>
        )}
      </div>
    </div>
  )
}

interface BenchmarkCardProps {
  icon: React.ReactNode
  title: string
  score: number | null
  isRunning: boolean
  onRun: () => void
  children?: React.ReactNode
  delay?: number
}

function BenchmarkCard({ icon, title, score, isRunning, onRun, children, delay = 0 }: BenchmarkCardProps) {
  const rating = score ? getScoreRating(score) : null

  return (
    <motion.div
      className="glass rounded-2xl p-5 flex flex-col"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/50">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {rating && (
            <span className="text-xs" style={{ color: rating.color }}>
              {rating.label}
            </span>
          )}
        </div>
        <motion.button
          onClick={onRun}
          disabled={isRunning}
          className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isRunning ? (
            <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          ) : (
            <Play size={14} />
          )}
        </motion.button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-2">
        {isRunning ? (
          <div className="space-y-2 text-center">
            <motion.div
              className="w-12 h-12 border-3 border-blue-500/20 border-t-blue-500 rounded-full mx-auto"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{ borderWidth: '3px' }}
            />
            <p className="text-xs text-white/30">Running benchmark...</p>
          </div>
        ) : score !== null ? (
          <div className="text-center">
            <div className="text-4xl font-bold text-white mb-1">
              <AnimatedScore value={score} />
            </div>
            <div className="text-xs text-white/30">points</div>
          </div>
        ) : (
          <div className="text-white/15 text-sm">Click to run</div>
        )}
      </div>

      {children && <div className="mt-3 pt-3 border-t border-white/5">{children}</div>}
    </motion.div>
  )
}

function HistoryTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const date = new Date(label)
  return (
    <div className="bg-[#1e1e2e] border border-white/10 rounded-lg p-2 text-xs">
      <p className="text-white/40 mb-1">
        {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

export default function BenchmarkPage() {
  const {
    cpuResult,
    ramResult,
    diskResult,
    totalScore,
    history,
    runningCPU,
    runningRAM,
    runningDisk,
    runningAll,
    runCPU,
    runRAM,
    runDisk,
    runAll,
    fetchHistory
  } = useBenchmarkStore()
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    fetchHistory()
  }, [])

  const handleRunAll = async () => {
    try {
      await runAll()
      addToast({
        type: 'success',
        title: 'Benchmark Complete',
        message: `Total score: ${useBenchmarkStore.getState().totalScore}`
      })
    } catch {
      addToast({
        type: 'error',
        title: 'Benchmark Failed',
        message: 'An error occurred while running benchmarks'
      })
    }
  }

  const handleRunCPU = async () => {
    try {
      await runCPU()
      addToast({ type: 'success', title: 'CPU Benchmark Done', message: `Score: ${useBenchmarkStore.getState().cpuResult?.score}` })
    } catch {
      addToast({ type: 'error', title: 'CPU Benchmark Failed' })
    }
  }

  const handleRunRAM = async () => {
    try {
      await runRAM()
      addToast({ type: 'success', title: 'RAM Benchmark Done', message: `Score: ${useBenchmarkStore.getState().ramResult?.score}` })
    } catch {
      addToast({ type: 'error', title: 'RAM Benchmark Failed' })
    }
  }

  const handleRunDisk = async () => {
    try {
      await runDisk()
      addToast({ type: 'success', title: 'Disk Benchmark Done', message: `Score: ${useBenchmarkStore.getState().diskResult?.score}` })
    } catch {
      addToast({ type: 'error', title: 'Disk Benchmark Failed' })
    }
  }

  const isAnyRunning = runningCPU || runningRAM || runningDisk || runningAll

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Benchmark</h1>
          <p className="text-sm text-white/40 mt-1">Test your hardware performance</p>
        </div>
        <motion.button
          onClick={handleRunAll}
          disabled={isAnyRunning}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/20 text-blue-400 text-sm font-medium hover:from-blue-500/30 hover:to-cyan-500/30 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {runningAll ? (
            <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
          ) : (
            <Play size={16} />
          )}
          Run All Tests
        </motion.button>
      </div>

      {/* Total Score */}
      <motion.div
        className="glass rounded-2xl p-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-6">
          <ScoreCircle score={totalScore} isRunning={runningAll} />
          <div className="flex-1">
            <h3 className="text-sm text-white/40 uppercase tracking-wider mb-2">Total Score</h3>
            {totalScore !== null ? (
              <>
                <div className="text-4xl font-bold text-white mb-1">
                  <AnimatedScore value={totalScore} />
                </div>
                <div className="text-sm" style={{ color: getScoreRating(totalScore).color }}>
                  {getScoreRating(totalScore).label} Performance
                </div>
              </>
            ) : (
              <p className="text-white/20 text-sm">Run all tests to get your total score</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Individual benchmarks */}
      <div className="grid grid-cols-3 gap-6">
        <BenchmarkCard
          icon={<Cpu size={18} />}
          title="CPU"
          score={cpuResult?.score ?? null}
          isRunning={runningCPU}
          onRun={handleRunCPU}
          delay={0.05}
        >
          {cpuResult && (
            <div className="flex items-center gap-2 text-xs text-white/30">
              <Clock size={12} />
              <span>{cpuResult.timeMs} ms</span>
            </div>
          )}
        </BenchmarkCard>

        <BenchmarkCard
          icon={<MemoryStick size={18} />}
          title="RAM"
          score={ramResult?.score ?? null}
          isRunning={runningRAM}
          onRun={handleRunRAM}
          delay={0.1}
        >
          {ramResult && (
            <div className="flex items-center gap-2 text-xs text-white/30">
              <Clock size={12} />
              <span>{ramResult.timeMs} ms</span>
            </div>
          )}
        </BenchmarkCard>

        <BenchmarkCard
          icon={<HardDrive size={18} />}
          title="Disk"
          score={diskResult?.score ?? null}
          isRunning={runningDisk}
          onRun={handleRunDisk}
          delay={0.15}
        >
          {diskResult && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/30">Write</span>
                <span className="text-white/60">{diskResult.writeMBs} MB/s</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/30">Read</span>
                <span className="text-white/60">{diskResult.readMBs} MB/s</span>
              </div>
            </div>
          )}
        </BenchmarkCard>
      </div>

      {/* History Chart */}
      <motion.div
        className="glass rounded-2xl p-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-white/40" />
          <h3 className="text-sm text-white/40 uppercase tracking-wider">Score History</h3>
        </div>
        <div className="h-[200px]">
          {history.length < 2 ? (
            <div className="h-full flex items-center justify-center text-white/20 text-sm">
              Run benchmarks at least twice to see history
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(ts) => {
                    const d = new Date(ts)
                    return `${d.getMonth() + 1}/${d.getDate()}`
                  }}
                  stroke="rgba(255,255,255,0.1)"
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="rgba(255,255,255,0.1)"
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                  width={50}
                />
                <Tooltip content={<HistoryTooltip />} />
                <Line
                  type="monotone"
                  dataKey="totalScore"
                  name="Total"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#3b82f6' }}
                  activeDot={{ r: 5, fill: '#3b82f6' }}
                />
                <Line
                  type="monotone"
                  dataKey="cpu.score"
                  name="CPU"
                  stroke="#22c55e"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3, fill: '#22c55e' }}
                />
                <Line
                  type="monotone"
                  dataKey="ram.score"
                  name="RAM"
                  stroke="#a855f7"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3, fill: '#a855f7' }}
                />
                <Line
                  type="monotone"
                  dataKey="disk.score"
                  name="Disk"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3, fill: '#f59e0b' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="flex gap-4 mt-3 justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-xs text-white/40">Total</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-xs text-white/40">CPU</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span className="text-xs text-white/40">RAM</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-xs text-white/40">Disk</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

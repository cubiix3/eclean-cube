import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wifi, Download, Upload, Activity, Play, Server } from 'lucide-react'

interface SpeedResult {
  downloadMbps: number
  uploadMbps: number
  latencyMs: number
  server: string
}

type TestPhase = 'idle' | 'connecting' | 'download' | 'upload' | 'done'

function AnimatedNumber({ value, decimals = 1, duration = 1.2 }: { value: number; decimals?: number; duration?: number }) {
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
        setDisplay(start)
      }
    }, 1000 / 60)
    return () => clearInterval(timer)
  }, [value, duration])

  return <span>{display.toFixed(decimals)}</span>
}

function SpeedGauge({ value, max, label, unit, icon, color, delay = 0 }: {
  value: number
  max: number
  label: string
  unit: string
  icon: React.ReactNode
  color: string
  delay?: number
}) {
  const radius = 60
  const strokeWidth = 6
  const circumference = Math.PI * radius
  const progress = Math.min(value / max, 1) * circumference

  return (
    <motion.div
      className="glass rounded-2xl p-6 flex flex-col items-center"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <div className="relative w-[150px] h-[85px] mb-3">
        <svg className="w-full h-full" viewBox="0 0 150 85">
          <path
            d="M 15 80 A 60 60 0 0 1 135 80"
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <motion.path
            d="M 15 80 A 60 60 0 0 1 135 80"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1.2, delay: delay + 0.2, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-0">
          <div className="text-3xl font-bold text-white">
            <AnimatedNumber value={value} decimals={value >= 100 ? 0 : 1} />
          </div>
        </div>
      </div>
      <span className="text-xs text-white/40 uppercase tracking-wider">{unit}</span>
      <div className="flex items-center gap-2 mt-3">
        <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center" style={{ color }}>
          {icon}
        </div>
        <span className="text-sm font-medium text-white/70">{label}</span>
      </div>
    </motion.div>
  )
}

export default function SpeedTestPage() {
  const [phase, setPhase] = useState<TestPhase>('idle')
  const [result, setResult] = useState<SpeedResult | null>(null)

  const handleRun = async () => {
    setPhase('connecting')
    setResult(null)
    try {
      // Simulate phase progression while the actual test runs
      const phaseTimer1 = setTimeout(() => setPhase('download'), 1500)
      const phaseTimer2 = setTimeout(() => setPhase('upload'), 5000)

      const data = await window.api.speedTest.run()
      clearTimeout(phaseTimer1)
      clearTimeout(phaseTimer2)
      setResult(data)
      setPhase('done')
    } catch (err) {
      console.error('Speed test failed:', err)
      setPhase('idle')
    }
  }

  const isRunning = phase !== 'idle' && phase !== 'done'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Speed Test</h1>
        <p className="text-sm text-white/40 mt-1">Measure your internet connection speed</p>
      </div>

      {/* Start / Status */}
      <motion.div
        className="glass rounded-2xl p-8 flex flex-col items-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {phase === 'idle' && !result && (
          <motion.button
            onClick={handleRun}
            className="w-32 h-32 rounded-full flex flex-col items-center justify-center gap-2 text-white cursor-pointer transition-all hover:scale-105"
            style={{ background: 'var(--accent-color)' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Play size={28} />
            <span className="text-sm font-medium">Start</span>
          </motion.button>
        )}

        {isRunning && (
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-28 h-28">
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-white/5"
              />
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  border: '4px solid transparent',
                  borderTopColor: 'var(--accent-color)',
                  borderRightColor: phase === 'upload' ? 'var(--accent-color)' : 'transparent'
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                {phase === 'connecting' && <Wifi size={24} className="text-white/60" />}
                {phase === 'download' && <Download size={24} className="text-blue-400" />}
                {phase === 'upload' && <Upload size={24} className="text-cyan-400" />}
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white">
                {phase === 'connecting' && 'Connecting to server...'}
                {phase === 'download' && 'Testing download speed...'}
                {phase === 'upload' && 'Testing upload speed...'}
              </p>
              <p className="text-xs text-white/40 mt-1">Please wait</p>
            </div>
          </div>
        )}

        {phase === 'done' && result && (
          <div className="w-full space-y-6">
            {/* Server Info */}
            <div className="flex items-center justify-center gap-2 text-white/40">
              <Server size={14} />
              <span className="text-xs">{result.server}</span>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-3 gap-4">
              <SpeedGauge
                value={result.downloadMbps}
                max={Math.max(result.downloadMbps * 1.3, 100)}
                label="Download"
                unit="Mbps"
                icon={<Download size={16} />}
                color="#3b82f6"
                delay={0}
              />
              <SpeedGauge
                value={result.uploadMbps}
                max={Math.max(result.uploadMbps * 1.3, 100)}
                label="Upload"
                unit="Mbps"
                icon={<Upload size={16} />}
                color="#06b6d4"
                delay={0.1}
              />
              <SpeedGauge
                value={result.latencyMs}
                max={Math.max(result.latencyMs * 2, 100)}
                label="Ping"
                unit="ms"
                icon={<Activity size={16} />}
                color={result.latencyMs <= 20 ? '#22c55e' : result.latencyMs <= 50 ? '#f59e0b' : '#ef4444'}
                delay={0.2}
              />
            </div>

            {/* Run Again */}
            <div className="flex justify-center pt-2">
              <motion.button
                onClick={handleRun}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all cursor-pointer"
                style={{ background: 'var(--accent-color)' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Play size={16} />
                Run Again
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

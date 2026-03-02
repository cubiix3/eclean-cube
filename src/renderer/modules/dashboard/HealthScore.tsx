import { motion } from 'framer-motion'

interface Props {
  score: number
  isLoading: boolean
}

function getScoreColor(score: number): string {
  if (score >= 70) return '#22c55e'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

function getScoreLabel(score: number): string {
  if (score >= 70) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Poor'
}

export default function HealthScore({ score, isLoading }: Props) {
  const radius = 80
  const strokeWidth = 8
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const color = getScoreColor(score)

  return (
    <div className="glass rounded-2xl p-6 flex flex-col items-center justify-center">
      <h3 className="text-sm text-white/40 uppercase tracking-wider mb-4">Health Score</h3>
      <div className="relative w-[200px] h-[200px]">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
          <motion.circle
            cx="100" cy="100" r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isLoading ? (
            <div className="text-white/30 text-sm">Scanning...</div>
          ) : (
            <>
              <motion.span className="text-5xl font-bold text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                {score}
              </motion.span>
              <span className="text-sm mt-1" style={{ color }}>{getScoreLabel(score)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

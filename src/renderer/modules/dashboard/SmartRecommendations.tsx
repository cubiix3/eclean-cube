import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  HardDrive,
  Cpu,
  Shield,
  Rocket,
  ChevronRight,
  Sparkles,
  CheckCircle
} from 'lucide-react'

interface Recommendation {
  id: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  category: 'cleanup' | 'performance' | 'security' | 'startup'
  action: string
  actionLabel: string
}

const categoryIcons: Record<string, any> = {
  cleanup: HardDrive,
  performance: Cpu,
  security: Shield,
  startup: Rocket,
}

const impactColors: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#3b82f6',
}

export default function SmartRecommendations() {
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    window.api.recommendations.get().then((data: Recommendation[]) => {
      setRecs(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleAction = (action: string) => {
    if (action.startsWith('navigate:')) {
      navigate(action.replace('navigate:', ''))
    }
  }

  if (loading) {
    return (
      <div className="glass rounded-2xl p-6">
        <h3 className="text-sm text-white/40 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Sparkles size={14} />
          Smart Recommendations
        </h3>
        <div className="text-sm text-white/20">Analyzing system...</div>
      </div>
    )
  }

  if (recs.length === 0) {
    return (
      <div className="glass rounded-2xl p-6">
        <h3 className="text-sm text-white/40 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Sparkles size={14} />
          Smart Recommendations
        </h3>
        <div className="text-center py-4">
          <CheckCircle size={24} className="text-green-500/40 mx-auto mb-2" />
          <p className="text-sm text-white/40">Your system looks great!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-sm text-white/40 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Sparkles size={14} />
        Smart Recommendations
      </h3>
      <div className="space-y-3">
        <AnimatePresence>
          {recs.map((rec, i) => {
            const Icon = categoryIcons[rec.category] || HardDrive
            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors group cursor-pointer"
                onClick={() => handleAction(rec.action)}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${impactColors[rec.impact]}15` }}
                >
                  <Icon size={16} style={{ color: impactColors[rec.impact] }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/90 font-medium">{rec.title}</p>
                  <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{rec.description}</p>
                </div>
                <div className="flex items-center gap-1 text-xs flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--accent-color)' }}>
                  {rec.actionLabel}
                  <ChevronRight size={12} />
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}

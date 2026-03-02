import { Trash2, Rocket, Sliders } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useNavigationStore } from '@/stores/navigationStore'
import { motion } from 'framer-motion'

interface ActionCard {
  icon: React.ReactNode
  title: string
  description: string
  gradient: string
  module: 'cleaner' | 'booster' | 'optimizer'
  path: string
}

const actions: ActionCard[] = [
  { icon: <Trash2 size={22} />, title: 'Quick Clean', description: 'Remove junk files', gradient: 'from-emerald-500/20 to-emerald-600/20', module: 'cleaner', path: '/cleaner' },
  { icon: <Rocket size={22} />, title: 'Quick Boost', description: 'Speed up startup', gradient: 'from-orange-500/20 to-orange-600/20', module: 'booster', path: '/booster' },
  { icon: <Sliders size={22} />, title: 'Quick Optimize', description: 'Tune your system', gradient: 'from-blue-500/20 to-cyan-500/20', module: 'optimizer', path: '/optimizer' }
]

export default function QuickActions() {
  const navigate = useNavigate()
  const setActiveModule = useNavigationStore((s) => s.setActiveModule)

  const handleClick = (action: ActionCard) => {
    setActiveModule(action.module)
    navigate(action.path)
  }

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-sm text-white/40 uppercase tracking-wider mb-4">Quick Actions</h3>
      <div className="grid grid-cols-3 gap-3">
        {actions.map((action, i) => (
          <motion.button
            key={action.title}
            onClick={() => handleClick(action)}
            className={`rounded-xl p-4 bg-gradient-to-br ${action.gradient} border border-white/5 hover:border-white/15 transition-all duration-200 text-left group`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="text-white/80 mb-2 group-hover:text-white transition-colors">{action.icon}</div>
            <div className="text-sm font-medium text-white">{action.title}</div>
            <div className="text-xs text-white/40 mt-0.5">{action.description}</div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

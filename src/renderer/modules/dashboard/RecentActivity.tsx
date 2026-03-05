import { useActivityStore } from '@/stores/activityStore'
import { Clock, Trash2, Sliders, Rocket, PackageX, Shield, Activity } from 'lucide-react'
import { motion } from 'framer-motion'

function getActivityIcon(action: string): { icon: any; color: string } {
  const lower = action.toLowerCase()
  if (lower.includes('clean') || lower.includes('delete') || lower.includes('shred')) return { icon: Trash2, color: '#ef4444' }
  if (lower.includes('optim') || lower.includes('tweak')) return { icon: Sliders, color: '#3b82f6' }
  if (lower.includes('boost') || lower.includes('startup') || lower.includes('dns')) return { icon: Rocket, color: '#f59e0b' }
  if (lower.includes('uninstall') || lower.includes('leftover')) return { icon: PackageX, color: '#a855f7' }
  if (lower.includes('secur') || lower.includes('privacy')) return { icon: Shield, color: '#22c55e' }
  return { icon: Activity, color: '#6b7280' }
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function RecentActivity() {
  const entries = useActivityStore((s) => s.entries)

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-sm text-white/40 uppercase tracking-wider mb-4">Recent Activity</h3>
      {entries.length === 0 ? (
        <div className="text-center py-8">
          <Clock size={24} className="text-white/10 mx-auto mb-2" />
          <p className="text-sm text-white/20">No activity yet</p>
          <p className="text-xs text-white/10 mt-1">Actions will appear here</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[200px] overflow-auto">
          {entries.slice(0, 10).map((entry, i) => {
            const { icon: Icon, color } = getActivityIcon(entry.action)
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${color}15` }}>
                  <Icon size={12} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80">{entry.action}</p>
                  <p className="text-xs text-white/30">{entry.detail}</p>
                </div>
                <span className="text-xs text-white/20 flex-shrink-0">{timeAgo(entry.timestamp)}</span>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

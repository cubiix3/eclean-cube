import { useActivityStore } from '@/stores/activityStore'
import { Clock } from 'lucide-react'

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
          {entries.slice(0, 10).map((entry) => (
            <div key={entry.id} className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400/60 mt-2 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/80">{entry.action}</p>
                <p className="text-xs text-white/30">{entry.detail}</p>
              </div>
              <span className="text-xs text-white/20 flex-shrink-0">{timeAgo(entry.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

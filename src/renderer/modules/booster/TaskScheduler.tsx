import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader2, RefreshCw, CalendarClock, ChevronDown } from 'lucide-react'
import { useBoosterStore } from '@/stores/boosterStore'

const STATE_STYLES: Record<string, { bg: string; text: string }> = {
  Ready: { bg: 'bg-green-500/10', text: 'text-green-400' },
  Running: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  Disabled: { bg: 'bg-white/5', text: 'text-white/40' },
  Queued: { bg: 'bg-amber-500/10', text: 'text-amber-400' }
}

export default function TaskScheduler() {
  const {
    scheduledTasks,
    isLoadingTasks,
    tasksSearch,
    fetchScheduledTasks,
    toggleTask,
    setTasksSearch
  } = useBoosterStore()

  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchScheduledTasks()
  }, [])

  const toggleExpanded = (key: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const filtered = scheduledTasks.filter(
    (task) =>
      task.taskName.toLowerCase().includes(tasksSearch.toLowerCase()) ||
      task.taskPath.toLowerCase().includes(tasksSearch.toLowerCase()) ||
      task.description.toLowerCase().includes(tasksSearch.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={tasksSearch}
            onChange={(e) => setTasksSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>
        <button
          onClick={fetchScheduledTasks}
          disabled={isLoadingTasks}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40 cursor-pointer"
        >
          {isLoadingTasks ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Refresh
        </button>
      </div>

      {/* Loading Skeleton */}
      {isLoadingTasks && scheduledTasks.length === 0 && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-40 h-4 bg-white/10 rounded" />
                <div className="flex-1 h-4 bg-white/5 rounded" />
                <div className="w-16 h-6 bg-white/10 rounded-full" />
                <div className="w-10 h-5 bg-white/10 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoadingTasks && scheduledTasks.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <CalendarClock className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-sm">
            No scheduled tasks found. Click "Refresh" to scan again.
          </p>
        </div>
      )}

      {/* Task List */}
      {filtered.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_160px_80px_60px] gap-4 px-4 py-3 border-b border-white/5 text-xs text-white/30 uppercase tracking-wider">
            <span>Task Name</span>
            <span>Path</span>
            <span>State</span>
            <span className="text-right">Toggle</span>
          </div>

          {/* Table Rows */}
          <div className="max-h-[60vh] overflow-y-auto">
            <AnimatePresence>
              {filtered.map((task) => {
                const key = `${task.taskPath}${task.taskName}`
                const isExpanded = expandedTasks.has(key)
                const stateStyle = STATE_STYLES[task.state] || STATE_STYLES.Disabled
                const isEnabled = task.state !== 'Disabled'

                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-white/[0.03]"
                  >
                    <div className="grid grid-cols-[1fr_160px_80px_60px] gap-4 px-4 py-3 items-center hover:bg-white/5 transition-colors">
                      <div className="min-w-0 flex items-center gap-2">
                        {task.description && (
                          <button
                            onClick={() => toggleExpanded(key)}
                            className="text-white/30 hover:text-white/60 transition-colors cursor-pointer flex-shrink-0"
                          >
                            <motion.div
                              animate={{ rotate: isExpanded ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </motion.div>
                          </button>
                        )}
                        <p className="text-sm text-white truncate">{task.taskName}</p>
                      </div>
                      <p className="text-xs text-white/30 truncate font-mono" title={task.taskPath}>
                        {task.taskPath}
                      </p>
                      <span
                        className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stateStyle.bg} ${stateStyle.text}`}
                      >
                        {task.state}
                      </span>
                      <div className="flex justify-end">
                        <button
                          onClick={() => toggleTask(task)}
                          className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                            isEnabled
                              ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
                              : 'bg-white/10'
                          }`}
                        >
                          <motion.div
                            className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                            animate={{ left: isEnabled ? '22px' : '2px' }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Description */}
                    <AnimatePresence>
                      {isExpanded && task.description && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-3 pl-10">
                            <p className="text-xs text-white/40 leading-relaxed">
                              {task.description}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* No Results */}
      {!isLoadingTasks && scheduledTasks.length > 0 && filtered.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-white/40 text-sm">No tasks match your search.</p>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ScrollText,
  Trash2,
  Download,
  ChevronDown,
  ChevronRight,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Calendar,
  Filter,
  FileText,
  RefreshCw
} from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'

interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'success'
  category: string
  message: string
  details?: string
}

interface LogFile {
  name: string
  size: number
  date: string
}

type LogLevel = 'all' | 'info' | 'warn' | 'error' | 'success'

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'cleaner', label: 'Cleaner' },
  { value: 'optimizer', label: 'Optimizer' },
  { value: 'registry', label: 'Registry' },
  { value: 'disk', label: 'Disk' },
  { value: 'fileMonitor', label: 'File Monitor' }
]

const LEVEL_TABS: { key: LogLevel; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'info', label: 'Info' },
  { key: 'warn', label: 'Warning' },
  { key: 'error', label: 'Error' },
  { key: 'success', label: 'Success' }
]

const LEVEL_CONFIG: Record<
  string,
  { icon: typeof Info; color: string; bg: string; badge: string }
> = {
  info: {
    icon: Info,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/20'
  },
  warn: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/20'
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    badge: 'bg-red-500/15 text-red-400 border-red-500/20'
  },
  success: {
    icon: CheckCircle,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
  }
}

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return ts
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function LogEntryRow({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false)
  const config = LEVEL_CONFIG[entry.level] || LEVEL_CONFIG.info
  const LevelIcon = config.icon

  return (
    <div className="group border-b border-white/[0.03] last:border-0">
      <button
        onClick={() => entry.details && setExpanded(!expanded)}
        className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
          entry.details ? 'cursor-pointer hover:bg-white/[0.02]' : 'cursor-default'
        }`}
      >
        {/* Expand indicator */}
        <div className="w-4 h-4 mt-0.5 shrink-0 flex items-center justify-center">
          {entry.details ? (
            expanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-white/30" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-white/30" />
            )
          ) : (
            <span className="w-1 h-1 rounded-full bg-white/10" />
          )}
        </div>

        {/* Level icon */}
        <div className={`w-6 h-6 rounded-md ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
          <LevelIcon className={`w-3.5 h-3.5 ${config.color}`} />
        </div>

        {/* Timestamp */}
        <span className="text-[11px] text-white/25 font-mono shrink-0 mt-1 w-[140px]">
          {formatTimestamp(entry.timestamp)}
        </span>

        {/* Level badge */}
        <span
          className={`text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 uppercase tracking-wider ${config.badge}`}
        >
          {entry.level}
        </span>

        {/* Category */}
        <span className="text-[11px] text-white/30 shrink-0 w-[80px] truncate capitalize">
          {entry.category}
        </span>

        {/* Message */}
        <span className="text-sm text-white/70 flex-1 min-w-0 truncate">{entry.message}</span>
      </button>

      {/* Expandable details */}
      <AnimatePresence>
        {expanded && entry.details && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="mx-4 mb-3 ml-[54px] p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <pre className="text-xs text-white/40 font-mono whitespace-pre-wrap break-words">
                {entry.details}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function LogViewerPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [logFiles, setLogFiles] = useState<LogFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeLevel, setActiveLevel] = useState<LogLevel>('all')
  const [category, setCategory] = useState('all')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [isClearing, setIsClearing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const addToast = useToastStore((s) => s.addToast)

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      let entries: LogEntry[]
      if (selectedDate) {
        entries = await window.api.logs.getByDate(selectedDate)
      } else {
        entries = await window.api.logs.get(500, category !== 'all' ? category : undefined)
      }
      setLogs(entries)
    } catch {
      setLogs([])
      addToast({ type: 'error', title: 'Failed to load logs' })
    }
    setIsLoading(false)
  }, [selectedDate, category, addToast])

  const fetchLogFiles = useCallback(async () => {
    try {
      const files = await window.api.logs.getFiles()
      setLogFiles(files)
    } catch {
      setLogFiles([])
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    fetchLogFiles()
  }, [fetchLogFiles])

  const filteredLogs = useMemo(() => {
    let result = logs
    if (activeLevel !== 'all') {
      result = result.filter((l) => l.level === activeLevel)
    }
    if (category !== 'all' && !selectedDate) {
      result = result.filter((l) => l.category === category)
    }
    return result
  }, [logs, activeLevel, category, selectedDate])

  const levelCounts = useMemo(() => {
    const counts = { all: logs.length, info: 0, warn: 0, error: 0, success: 0 }
    for (const log of logs) {
      if (log.level in counts) {
        counts[log.level as keyof typeof counts]++
      }
    }
    return counts
  }, [logs])

  async function handleClear() {
    setIsClearing(true)
    try {
      await window.api.logs.clear()
      setLogs([])
      addToast({ type: 'success', title: 'Logs cleared' })
      fetchLogFiles()
    } catch {
      addToast({ type: 'error', title: 'Failed to clear logs' })
    }
    setIsClearing(false)
  }

  async function handleExport() {
    setIsExporting(true)
    try {
      const text = await window.api.logs.export(selectedDate || undefined)
      if (text) {
        addToast({ type: 'success', title: 'Logs exported successfully' })
      }
    } catch {
      addToast({ type: 'error', title: 'Failed to export logs' })
    }
    setIsExporting(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gradient">Activity Logs</h1>
          <p className="text-sm text-white/40 mt-1">
            View and manage application activity history
            {filteredLogs.length > 0 && (
              <span className="text-white/30">
                {' '}
                &middot; {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 text-xs text-white/60 hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-30"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 text-xs text-white/60 hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-30"
          >
            <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-pulse' : ''}`} />
            Export
          </button>
          <button
            onClick={handleClear}
            disabled={isClearing || logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer disabled:opacity-30"
          >
            <Trash2 className={`w-3.5 h-3.5 ${isClearing ? 'animate-pulse' : ''}`} />
            Clear
          </button>
        </div>
      </div>

      {/* Filters row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex items-center gap-4"
      >
        {/* Category filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-white/30" />
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setSelectedDate('')
            }}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-white/20 cursor-pointer appearance-none pr-8"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 0.5rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.25em 1.25em'
            }}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-white/30" />
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-white/20 cursor-pointer appearance-none pr-8"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 0.5rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.25em 1.25em'
            }}
          >
            <option value="">Current logs</option>
            {logFiles.map((file) => (
              <option key={file.name} value={file.date}>
                {file.date} ({formatFileSize(file.size)})
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Level filter tabs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-1 border-b border-white/10"
      >
        {LEVEL_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveLevel(tab.key)}
            className="relative px-5 py-2.5 text-sm transition-colors cursor-pointer"
          >
            <span
              className={`flex items-center gap-2 ${
                activeLevel === tab.key
                  ? 'text-white font-medium'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {tab.label}
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeLevel === tab.key ? 'bg-white/10 text-white/60' : 'bg-white/5 text-white/25'
                }`}
              >
                {levelCounts[tab.key]}
              </span>
            </span>
            {activeLevel === tab.key && (
              <motion.div
                layoutId="log-level-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ background: 'var(--accent-color)' }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        ))}
      </motion.div>

      {/* Log list */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
          {isLoading ? (
            <div className="space-y-0">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.03] animate-pulse"
                >
                  <div className="w-4 h-4 rounded bg-white/5" />
                  <div className="w-6 h-6 rounded-md bg-white/5" />
                  <div className="w-[140px] h-3 rounded bg-white/5" />
                  <div className="w-12 h-4 rounded bg-white/5" />
                  <div className="w-[80px] h-3 rounded bg-white/5" />
                  <div className="flex-1 h-3 rounded bg-white/5" />
                </div>
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4">
                <ScrollText className="w-6 h-6 text-white/20" />
              </div>
              <p className="text-sm text-white/40">No log entries found</p>
              <p className="text-xs text-white/20 mt-1">
                {activeLevel !== 'all' || category !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Activity will appear here as you use the app'}
              </p>
            </div>
          ) : (
            <div className="max-h-[calc(100vh-340px)] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {filteredLogs.map((entry, idx) => (
                <LogEntryRow key={`${entry.timestamp}-${idx}`} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Log files summary */}
      {logFiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-3.5 h-3.5 text-white/30" />
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                Log Files
              </h3>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {logFiles.map((file) => (
                <button
                  key={file.name}
                  onClick={() => setSelectedDate(file.date)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors cursor-pointer ${
                    selectedDate === file.date
                      ? 'bg-white/[0.06] border-white/15'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-white/20 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-white/60 truncate">{file.date}</p>
                    <p className="text-[10px] text-white/25">{formatFileSize(file.size)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  FolderPlus,
  FolderOpen,
  FileText,
  X,
  Trash2,
  Activity,
  RefreshCw,
  Clock
} from 'lucide-react'

interface FileChangeEvent {
  type: 'rename' | 'change'
  path: string
  filename: string
  timestamp: number
  sizeBytes?: number
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatSize(bytes?: number): string {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function EventTypeBadge({ type }: { type: 'rename' | 'change' }) {
  const isRename = type === 'rename'
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wide ${
        isRename
          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
          : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
      }`}
    >
      {type}
    </span>
  )
}

export default function FileMonitorPage() {
  const [watchedDirs, setWatchedDirs] = useState<string[]>([])
  const [events, setEvents] = useState<FileChangeEvent[]>([])
  const feedRef = useRef<HTMLDivElement>(null)

  const loadWatchedDirs = useCallback(async () => {
    const dirs = await window.api.fileMonitor.getWatched()
    setWatchedDirs(dirs)
  }, [])

  const loadEvents = useCallback(async () => {
    const changes = await window.api.fileMonitor.getChanges()
    setEvents(changes.reverse())
  }, [])

  useEffect(() => {
    loadWatchedDirs()
    loadEvents()

    window.api.fileMonitor.onChange((event: FileChangeEvent) => {
      setEvents((prev) => [event, ...prev])
    })

    return () => {
      window.api.fileMonitor.removeChangeListener()
    }
  }, [loadWatchedDirs, loadEvents])

  async function handleAddDirectory() {
    const dir = await window.api.fileMonitor.browseDirectory()
    if (!dir) return

    const result = await window.api.fileMonitor.start(dir)
    if (result.success) {
      await loadWatchedDirs()
    }
  }

  async function handleStopWatching(dir: string) {
    await window.api.fileMonitor.stop(dir)
    await loadWatchedDirs()
  }

  function handleClearEvents() {
    window.api.fileMonitor.clear()
    setEvents([])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gradient">File Monitor</h1>
          <p className="text-sm text-white/40 mt-1">
            Watch directories for real-time file changes
            {events.length > 0 && (
              <span className="text-white/30"> &middot; {events.length} events captured</span>
            )}
          </p>
        </div>
        <button
          onClick={handleAddDirectory}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/20 text-sm text-[var(--accent-color)] hover:bg-[var(--accent-color)]/20 transition-all cursor-pointer"
        >
          <FolderPlus className="w-4 h-4" />
          Add Directory
        </button>
      </div>

      {/* Watched Directories */}
      <div className="bg-white/5 rounded-xl border border-white/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <FolderOpen className="w-4 h-4 text-white/40" />
          <h2 className="text-sm font-medium text-white/60">Watched Directories</h2>
        </div>

        {watchedDirs.length === 0 ? (
          <p className="text-sm text-white/25 py-4 text-center">
            No directories being watched. Click "Add Directory" to start monitoring.
          </p>
        ) : (
          <div className="space-y-2">
            {watchedDirs.map((dir) => (
              <div
                key={dir}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-white/5 group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FolderOpen className="w-4 h-4 text-[var(--accent-color)] shrink-0" />
                  <span className="text-sm text-white/70 truncate">{dir}</span>
                </div>
                <button
                  onClick={() => handleStopWatching(dir)}
                  className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                  title="Stop watching"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Event Feed */}
      <div className="bg-white/5 rounded-xl border border-white/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-white/40" />
            <h2 className="text-sm font-medium text-white/60">Event Feed</h2>
            {events.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-white/5 text-[11px] text-white/40 tabular-nums">
                {events.length}
              </span>
            )}
          </div>
          {events.length > 0 && (
            <button
              onClick={handleClearEvents}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/30 hover:text-white/60 hover:bg-white/5 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-white/20">
            <RefreshCw className="w-8 h-8 mb-3" />
            <p className="text-sm">No events yet</p>
            <p className="text-xs text-white/15 mt-1">
              File changes will appear here in real time
            </p>
          </div>
        ) : (
          <div
            ref={feedRef}
            className="space-y-1 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin"
          >
            {events.map((event, i) => (
              <div
                key={`${event.timestamp}-${event.path}-${i}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group"
              >
                {/* Icon */}
                <div className="shrink-0">
                  {event.type === 'rename' ? (
                    <FolderOpen className="w-4 h-4 text-amber-400/60" />
                  ) : (
                    <FileText className="w-4 h-4 text-blue-400/60" />
                  )}
                </div>

                {/* Filename + path */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/80 truncate">{event.filename}</p>
                  <p className="text-[11px] text-white/25 truncate">{event.path}</p>
                </div>

                {/* Badge */}
                <EventTypeBadge type={event.type} />

                {/* Size */}
                {event.sizeBytes != null && (
                  <span className="text-[11px] text-white/25 tabular-nums shrink-0 w-16 text-right">
                    {formatSize(event.sizeBytes)}
                  </span>
                )}

                {/* Timestamp */}
                <div className="flex items-center gap-1 shrink-0 text-white/25">
                  <Clock className="w-3 h-3" />
                  <span className="text-[11px] tabular-nums">{formatTime(event.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

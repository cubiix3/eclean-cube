import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  FileText
} from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'

interface HostEntry {
  ip: string
  hostname: string
  comment?: string
  enabled: boolean
  lineIndex: number
}

export default function HostsEditorPage() {
  const [entries, setEntries] = useState<HostEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newIp, setNewIp] = useState('')
  const [newHostname, setNewHostname] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [togglingLines, setTogglingLines] = useState<Set<number>>(new Set())
  const [deletingLines, setDeletingLines] = useState<Set<number>>(new Set())
  const addToast = useToastStore((s) => s.addToast)

  const fetchEntries = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await window.api.hosts.getEntries()
      setEntries(data)
    } catch {
      addToast({ type: 'error', title: 'Failed to load hosts', message: 'Could not read the hosts file' })
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const handleAdd = async () => {
    const ip = newIp.trim()
    const hostname = newHostname.trim()
    if (!ip || !hostname) return

    setIsAdding(true)
    try {
      const result = await window.api.hosts.add(ip, hostname)
      if (result.success) {
        addToast({ type: 'success', title: 'Entry added', message: `${ip} ${hostname}` })
        setNewIp('')
        setNewHostname('')
        await fetchEntries()
      } else {
        addToast({ type: 'error', title: 'Failed to add entry', message: result.error || 'Unknown error' })
      }
    } catch {
      addToast({ type: 'error', title: 'Failed to add entry', message: 'An unexpected error occurred' })
    }
    setIsAdding(false)
  }

  const handleToggle = async (lineIndex: number) => {
    setTogglingLines((prev) => new Set(prev).add(lineIndex))
    try {
      const result = await window.api.hosts.toggle(lineIndex)
      if (result.success) {
        setEntries((prev) =>
          prev.map((e) => (e.lineIndex === lineIndex ? { ...e, enabled: !e.enabled } : e))
        )
      } else {
        addToast({ type: 'error', title: 'Toggle failed', message: result.error || 'Unknown error' })
      }
    } catch {
      addToast({ type: 'error', title: 'Toggle failed', message: 'An unexpected error occurred' })
    }
    setTogglingLines((prev) => {
      const next = new Set(prev)
      next.delete(lineIndex)
      return next
    })
  }

  const handleDelete = async (lineIndex: number) => {
    setDeletingLines((prev) => new Set(prev).add(lineIndex))
    try {
      const result = await window.api.hosts.remove(lineIndex)
      if (result.success) {
        addToast({ type: 'success', title: 'Entry removed', message: 'Host entry deleted successfully' })
        await fetchEntries()
      } else {
        addToast({ type: 'error', title: 'Delete failed', message: result.error || 'Unknown error' })
      }
    } catch {
      addToast({ type: 'error', title: 'Delete failed', message: 'An unexpected error occurred' })
    }
    setDeletingLines((prev) => {
      const next = new Set(prev)
      next.delete(lineIndex)
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Hosts Editor</h1>
          <p className="text-sm text-white/40 mt-1">Manage your system hosts file</p>
        </div>
        <div className="glass rounded-2xl p-5 h-32 animate-pulse" />
        <div className="glass rounded-2xl p-5 h-64 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Hosts Editor</h1>
          <p className="text-sm text-white/40 mt-1">
            Manage your system hosts file
            {entries.length > 0 && (
              <span className="text-white/30"> &middot; {entries.length} entries</span>
            )}
          </p>
        </div>
        <button
          onClick={fetchEntries}
          className="p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-white/40" />
        </button>
      </div>

      {/* Add Entry Form */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-4 h-4 text-white/40" />
          <h2 className="text-sm font-medium text-white/60">Add New Entry</h2>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            placeholder="IP Address (e.g. 127.0.0.1)"
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-sm text-white placeholder-white/25 outline-none focus:border-[var(--accent-color)]/50 transition-colors"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <input
            type="text"
            value={newHostname}
            onChange={(e) => setNewHostname(e.target.value)}
            placeholder="Hostname (e.g. example.local)"
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-sm text-white placeholder-white/25 outline-none focus:border-[var(--accent-color)]/50 transition-colors"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={isAdding || !newIp.trim() || !newHostname.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            style={{ background: 'var(--accent-color)' }}
          >
            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </div>
      </div>

      {/* Entries List */}
      {entries.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <FileText className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40">No host entries found</p>
          <p className="text-xs text-white/25 mt-1">Add an entry above to get started</p>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="flex items-center gap-4 px-5 py-3 border-b border-white/5 text-xs text-white/30 font-medium uppercase tracking-wider">
            <span className="w-10 text-center">Status</span>
            <span className="w-40">IP Address</span>
            <span className="flex-1">Hostname</span>
            <span className="w-48">Comment</span>
            <span className="w-20 text-center">Actions</span>
          </div>

          {/* Table Body */}
          <div className="max-h-[480px] overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {entries.map((entry, index) => {
                const isToggling = togglingLines.has(entry.lineIndex)
                const isDeleting = deletingLines.has(entry.lineIndex)

                return (
                  <motion.div
                    key={entry.lineIndex}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8, height: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={`flex items-center gap-4 px-5 py-3 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors ${
                      !entry.enabled ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Toggle */}
                    <div className="w-10 flex justify-center">
                      <button
                        onClick={() => handleToggle(entry.lineIndex)}
                        disabled={isToggling}
                        className="cursor-pointer disabled:cursor-not-allowed transition-colors"
                        title={entry.enabled ? 'Disable' : 'Enable'}
                      >
                        {isToggling ? (
                          <Loader2 className="w-5 h-5 animate-spin text-white/40" />
                        ) : entry.enabled ? (
                          <ToggleRight className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-white/25" />
                        )}
                      </button>
                    </div>

                    {/* IP */}
                    <span className="w-40 text-sm text-white font-mono truncate">{entry.ip}</span>

                    {/* Hostname */}
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <Globe className="w-3.5 h-3.5 text-white/20 shrink-0" />
                      <span className="text-sm text-white/80 truncate">{entry.hostname}</span>
                    </div>

                    {/* Comment */}
                    <span className="w-48 text-xs text-white/25 truncate">
                      {entry.comment || '--'}
                    </span>

                    {/* Delete */}
                    <div className="w-20 flex justify-center">
                      <button
                        onClick={() => handleDelete(entry.lineIndex)}
                        disabled={isDeleting}
                        className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer disabled:cursor-not-allowed"
                        title="Delete entry"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
        <AlertCircle className="w-4 h-4 text-amber-400/60 shrink-0 mt-0.5" />
        <p className="text-xs text-white/30">
          Editing the hosts file requires administrator privileges. Changes take effect immediately for new connections.
        </p>
      </div>
    </div>
  )
}

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Loader2,
  Wrench,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  Database,
  Clock,
  Bug
} from 'lucide-react'

interface RegistryIssue {
  id: string
  path: string
  name: string
  valueName?: string
  type: 'orphaned_software' | 'broken_path' | 'empty_key' | 'obsolete_installer' | 'broken_firewall'
  description: string
  severity: 'safe' | 'moderate' | 'risky'
}

interface ScanResult {
  issues: RegistryIssue[]
  scannedKeys: number
  scanTimeMs: number
}

interface FixResult {
  fixed: number
  errors: string[]
}

const SEVERITY_CONFIG = {
  safe: { label: 'Safe', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
  moderate: { label: 'Moderate', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
  risky: { label: 'Risky', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' }
}

const TYPE_LABELS: Record<string, string> = {
  orphaned_software: 'Orphaned Software',
  broken_path: 'Broken Path',
  empty_key: 'Empty Key',
  obsolete_installer: 'Obsolete Cache',
  broken_firewall: 'Broken Firewall'
}

export default function RegistryCleanerPage() {
  const [isScanning, setIsScanning] = useState(false)
  const [isFixing, setIsFixing] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [fixResult, setFixResult] = useState<FixResult | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const issues = scanResult?.issues ?? []

  const handleScan = useCallback(async () => {
    setIsScanning(true)
    setScanResult(null)
    setFixResult(null)
    setSelectedIds(new Set())
    try {
      const result = await window.api.registry.scan()
      setScanResult(result)
      // Auto-select all safe issues
      const safeIds = new Set(result.issues.filter((i: any) => i.severity === 'safe').map((i: any) => i.id))
      setSelectedIds(safeIds)
    } catch (err) {
      console.error('Registry scan failed:', err)
    } finally {
      setIsScanning(false)
    }
  }, [])

  const handleFix = useCallback(async () => {
    if (selectedIds.size === 0) return
    const toFix = issues.filter((i) => selectedIds.has(i.id))
    setIsFixing(true)
    setFixResult(null)
    try {
      const result = await window.api.registry.fix(toFix)
      setFixResult(result)
      // Remove fixed issues from list
      if (scanResult) {
        const fixedIds = new Set(toFix.map((i) => i.id))
        setScanResult({
          ...scanResult,
          issues: scanResult.issues.filter((i) => !fixedIds.has(i.id))
        })
        setSelectedIds((prev) => {
          const next = new Set(prev)
          fixedIds.forEach((id) => next.delete(id))
          return next
        })
      }
    } catch (err) {
      console.error('Registry fix failed:', err)
    } finally {
      setIsFixing(false)
    }
  }, [selectedIds, issues, scanResult])

  const toggleIssue = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(issues.map((i) => i.id)))
    else setSelectedIds(new Set())
  }

  const allSelected = issues.length > 0 && selectedIds.size === issues.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Registry Cleaner</h1>
          <p className="text-sm text-white/40 mt-1">Find and fix broken registry entries</p>
        </div>
        <button
          onClick={handleScan}
          disabled={isScanning || isFixing}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          style={{ background: 'var(--accent-color)' }}
        >
          {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {isScanning ? 'Scanning...' : 'Scan Registry'}
        </button>
      </div>

      {/* Scan Progress */}
      <AnimatePresence>
        {isScanning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-xl p-6"
          >
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-white/60" />
              <p className="text-sm text-white/60">Scanning registry keys...</p>
              <div className="w-full max-w-xs h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'var(--accent-color)' }}
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 8, ease: 'linear' }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Bar */}
      <AnimatePresence>
        {scanResult && !isScanning && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-white/40" />
                <span className="text-sm text-white/60"><span className="text-white font-medium">{scanResult.scannedKeys.toLocaleString()}</span> keys scanned</span>
              </div>
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4 text-white/40" />
                <span className="text-sm text-white/60"><span className="text-white font-medium">{scanResult.issues.length}</span> issue{scanResult.issues.length !== 1 ? 's' : ''} found</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-white/40" />
                <span className="text-sm text-white/60"><span className="text-white font-medium">{(scanResult.scanTimeMs / 1000).toFixed(1)}s</span></span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fix Result */}
      <AnimatePresence>
        {fixResult && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {fixResult.errors.length === 0 ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <AlertCircle className="w-5 h-5 text-amber-400" />}
              <span className="text-sm text-white/80">
                Fixed {fixResult.fixed} issue{fixResult.fixed !== 1 ? 's' : ''}
                {fixResult.errors.length > 0 && ` (${fixResult.errors.length} failed)`}
              </span>
            </div>
            <button onClick={() => setFixResult(null)} className="text-xs text-white/40 hover:text-white/60 cursor-pointer">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!scanResult && !isScanning && (
        <div className="glass rounded-2xl p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-sm">Click "Scan Registry" to find broken or obsolete registry entries</p>
        </div>
      )}

      {/* Issues List */}
      {scanResult && !isScanning && issues.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => toggleAll(e.target.checked)}
                className="w-3.5 h-3.5 rounded"
              />
              <span className="text-xs text-white/50">{selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}</span>
            </label>
            <button
              onClick={handleFix}
              disabled={isFixing || selectedIds.size === 0}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              style={{ background: selectedIds.size > 0 ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)' }}
            >
              {isFixing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />}
              {isFixing ? 'Fixing...' : `Fix Selected (${selectedIds.size})`}
            </button>
          </div>
          <div className="max-h-[480px] overflow-y-auto">
            {issues.map((issue, index) => {
              const sev = SEVERITY_CONFIG[issue.severity]
              return (
                <motion.label
                  key={issue.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.03] last:border-0 cursor-pointer hover:bg-white/[0.02] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(issue.id)}
                    onChange={() => toggleIssue(issue.id)}
                    className="w-3.5 h-3.5 rounded shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm text-white font-medium truncate">{issue.name}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${sev.bg} ${sev.border} ${sev.color}`}>{sev.label}</span>
                      <span className="text-[10px] text-white/30 px-1.5 py-0.5 rounded bg-white/5">{TYPE_LABELS[issue.type] || issue.type}</span>
                    </div>
                    <p className="text-xs text-white/40 truncate">{issue.description}</p>
                    <p className="text-[10px] text-white/20 truncate mt-0.5 font-mono">{issue.path}</p>
                  </div>
                  {issue.severity === 'risky' && <AlertTriangle className="w-4 h-4 text-red-400/60 shrink-0" />}
                </motion.label>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Clean State */}
      {scanResult && !isScanning && issues.length === 0 && !fixResult && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-2xl p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-400/60 mx-auto mb-4" />
          <p className="text-white/60 text-sm font-medium">Your registry is clean</p>
          <p className="text-white/30 text-xs mt-1">No broken or obsolete entries found</p>
        </motion.div>
      )}
    </div>
  )
}

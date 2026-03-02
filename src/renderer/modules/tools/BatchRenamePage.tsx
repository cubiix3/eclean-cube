import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderOpen,
  FileText,
  ArrowRight,
  Loader2,
  RefreshCw,
  Regex,
  Play,
  CheckCircle2,
  AlertCircle,
  Pencil
} from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'

interface PreviewEntry {
  original: string
  renamed: string
  path: string
}

interface RenameResult {
  renamed: number
  errors: string[]
}

export default function BatchRenamePage() {
  const [directory, setDirectory] = useState('')
  const [pattern, setPattern] = useState('')
  const [replacement, setReplacement] = useState('')
  const [useRegex, setUseRegex] = useState(false)
  const [preview, setPreview] = useState<PreviewEntry[]>([])
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameResult, setRenameResult] = useState<RenameResult | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const addToast = useToastStore((s) => s.addToast)

  const handleBrowse = async () => {
    const dir = await window.api.rename.browse()
    if (dir) {
      setDirectory(dir)
      setPreview([])
      setRenameResult(null)
    }
  }

  const loadPreview = useCallback(async () => {
    if (!directory || !pattern) {
      setPreview([])
      return
    }
    setIsLoadingPreview(true)
    try {
      const data = await window.api.rename.preview(directory, pattern, replacement, useRegex)
      setPreview(data)
    } catch {
      setPreview([])
    }
    setIsLoadingPreview(false)
  }, [directory, pattern, replacement, useRegex])

  // Debounced preview
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      loadPreview()
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [loadPreview])

  const handleRename = async () => {
    if (preview.length === 0) return
    setIsRenaming(true)
    setRenameResult(null)
    try {
      const renames = preview.map(({ original, renamed }) => ({ original, renamed }))
      const result = await window.api.rename.execute(directory, renames)
      setRenameResult(result)
      if (result.errors.length === 0) {
        addToast({
          type: 'success',
          title: 'Rename complete',
          message: `${result.renamed} file${result.renamed !== 1 ? 's' : ''} renamed successfully`
        })
      } else {
        addToast({
          type: 'warning',
          title: 'Rename partially complete',
          message: `${result.renamed} renamed, ${result.errors.length} failed`
        })
      }
      // Refresh preview to show current state
      await loadPreview()
    } catch {
      addToast({ type: 'error', title: 'Rename failed', message: 'An unexpected error occurred' })
    }
    setIsRenaming(false)
  }

  const changedFiles = preview.filter((e) => e.original !== e.renamed)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Batch Rename</h1>
        <p className="text-sm text-white/40 mt-1">Rename multiple files at once with pattern matching</p>
      </div>

      {/* Configuration */}
      <div className="glass rounded-2xl p-5 space-y-4">
        {/* Directory Picker */}
        <div className="space-y-1.5">
          <label className="text-xs text-white/40 font-medium">Directory</label>
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 min-w-0">
              <FolderOpen className="w-4 h-4 text-white/25 shrink-0" />
              <span className={`text-sm truncate ${directory ? 'text-white/80' : 'text-white/25'}`}>
                {directory || 'No directory selected'}
              </span>
            </div>
            <button
              onClick={handleBrowse}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all cursor-pointer"
              style={{ background: 'var(--accent-color)' }}
            >
              <FolderOpen className="w-4 h-4" />
              Browse
            </button>
          </div>
        </div>

        {/* Pattern + Replacement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-white/40 font-medium">Find Pattern</label>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder={useRegex ? 'e.g. (\\d+)_(.+)' : 'e.g. old_prefix'}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-sm text-white placeholder-white/25 outline-none focus:border-[var(--accent-color)]/50 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-white/40 font-medium">Replace With</label>
            <input
              type="text"
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              placeholder={useRegex ? 'e.g. $2_$1' : 'e.g. new_prefix'}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-sm text-white placeholder-white/25 outline-none focus:border-[var(--accent-color)]/50 transition-colors"
            />
          </div>
        </div>

        {/* Regex Toggle + Rename Button */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setUseRegex(!useRegex)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
              useRegex
                ? 'bg-[var(--accent-color)]/10 border-[var(--accent-color)]/20 text-[var(--accent-color)]'
                : 'bg-white/5 border-white/8 text-white/40 hover:text-white/60'
            }`}
          >
            <Regex className="w-3.5 h-3.5" />
            {useRegex ? 'Regex Enabled' : 'Use Regex'}
          </button>

          <button
            onClick={handleRename}
            disabled={isRenaming || changedFiles.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            style={{ background: 'var(--accent-color)' }}
          >
            {isRenaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Rename All ({changedFiles.length})
          </button>
        </div>
      </div>

      {/* Rename Result */}
      <AnimatePresence>
        {renameResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              {renameResult.errors.length === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400" />
              )}
              <span className="text-sm text-white/80">
                Renamed {renameResult.renamed} file{renameResult.renamed !== 1 ? 's' : ''}
                {renameResult.errors.length > 0 && ` (${renameResult.errors.length} failed)`}
              </span>
            </div>
            <button
              onClick={() => setRenameResult(null)}
              className="text-xs text-white/40 hover:text-white/60 cursor-pointer"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Table */}
      {!directory ? (
        <div className="glass rounded-2xl p-12 text-center">
          <FolderOpen className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40">Select a directory to begin</p>
          <p className="text-xs text-white/25 mt-1">Files will be previewed before renaming</p>
        </div>
      ) : isLoadingPreview ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-white/30 mx-auto mb-3" />
          <p className="text-sm text-white/40">Loading preview...</p>
        </div>
      ) : preview.length === 0 && pattern ? (
        <div className="glass rounded-2xl p-12 text-center">
          <FileText className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40">No files match the pattern</p>
        </div>
      ) : preview.length > 0 ? (
        <div className="glass rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-white/40" />
              <h2 className="text-sm font-medium text-white/60">
                Preview
                <span className="text-white/30 ml-2">
                  {changedFiles.length} of {preview.length} files will change
                </span>
              </h2>
            </div>
            <button
              onClick={loadPreview}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              title="Refresh preview"
            >
              <RefreshCw className="w-3.5 h-3.5 text-white/30" />
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {preview.map((entry, index) => {
              const isChanged = entry.original !== entry.renamed
              return (
                <motion.div
                  key={`${entry.path}-${index}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.015 }}
                  className={`flex items-center gap-3 px-5 py-3 border-b border-white/[0.03] last:border-0 ${
                    isChanged ? 'bg-[var(--accent-color)]/[0.03]' : ''
                  }`}
                >
                  <FileText className={`w-4 h-4 shrink-0 ${isChanged ? 'text-[var(--accent-color)]/60' : 'text-white/15'}`} />
                  <span className={`text-sm truncate min-w-0 flex-1 ${isChanged ? 'text-white/50 line-through' : 'text-white/40'}`}>
                    {entry.original}
                  </span>
                  {isChanged && (
                    <>
                      <ArrowRight className="w-4 h-4 text-[var(--accent-color)]/40 shrink-0" />
                      <span className="text-sm text-white font-medium truncate min-w-0 flex-1">
                        {entry.renamed}
                      </span>
                    </>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

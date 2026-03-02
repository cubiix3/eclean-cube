import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  FolderOpen,
  Trash2,
  Loader2,
  Copy,
  CheckSquare,
  Square,
  ChevronDown,
  AlertTriangle,
  FileWarning
} from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'
import { formatSize, formatDate } from '@/utils/format'

interface DuplicateFile {
  path: string
  modified: string
}

interface DuplicateGroup {
  name: string
  size: number
  files: DuplicateFile[]
}

function truncatePath(p: string, maxLen: number = 60): string {
  if (p.length <= maxLen) return p
  const parts = p.split('\\')
  if (parts.length <= 3) return p
  return `${parts[0]}\\...\\${parts.slice(-2).join('\\')}`
}

const MIN_SIZE_OPTIONS = [
  { label: '1 MB', value: 1 },
  { label: '10 MB', value: 10 },
  { label: '50 MB', value: 50 },
  { label: '100 MB', value: 100 }
]

export default function DuplicateFinder() {
  const [directory, setDirectory] = useState('C:\\Users')
  const [minSizeMB, setMinSizeMB] = useState(1)
  const [isScanning, setIsScanning] = useState(false)
  const [groups, setGroups] = useState<DuplicateGroup[]>([])
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [hasScanned, setHasScanned] = useState(false)

  const addToast = useToastStore((s) => s.addToast)

  const handleBrowse = useCallback(async () => {
    try {
      const dir = await (window.api as any).duplicate.browseDirectory()
      if (dir) setDirectory(dir)
    } catch {
      // ignore
    }
  }, [])

  const handleScan = useCallback(async () => {
    setIsScanning(true)
    setGroups([])
    setSelectedPaths(new Set())
    setHasScanned(false)
    try {
      const result = await (window.api as any).duplicate.find(directory, minSizeMB)
      setGroups(result || [])
      setHasScanned(true)
      if (result && result.length > 0) {
        const totalFiles = result.reduce((s: number, g: DuplicateGroup) => s + g.files.length, 0)
        addToast({
          type: 'info',
          title: `Found ${result.length} duplicate groups (${totalFiles} files)`
        })
        // Auto-select all duplicates (keep first, select rest)
        const autoSelected = new Set<string>()
        for (const group of result) {
          for (let i = 1; i < group.files.length; i++) {
            autoSelected.add(group.files[i].path)
          }
        }
        setSelectedPaths(autoSelected)
      } else {
        addToast({ type: 'success', title: 'No duplicate files found' })
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Scan failed',
        message: err?.message || 'An unexpected error occurred'
      })
    }
    setIsScanning(false)
  }, [directory, minSizeMB, addToast])

  const togglePath = useCallback((path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const selectAllDuplicates = useCallback(() => {
    const allDuplicates = new Set<string>()
    for (const group of groups) {
      for (let i = 1; i < group.files.length; i++) {
        allDuplicates.add(group.files[i].path)
      }
    }
    setSelectedPaths(allDuplicates)
  }, [groups])

  const deselectAll = useCallback(() => {
    setSelectedPaths(new Set())
  }, [])

  const handleDelete = useCallback(async () => {
    if (selectedPaths.size === 0) return
    setIsDeleting(true)
    setShowConfirm(false)
    try {
      const result = await (window.api as any).duplicate.delete(Array.from(selectedPaths))
      addToast({
        type: 'success',
        title: `Deleted ${result.deleted} duplicate files`,
        message: result.errors.length > 0 ? `${result.errors.length} errors occurred` : undefined
      })
      // Remove deleted files from groups
      setGroups((prev) =>
        prev
          .map((g) => ({
            ...g,
            files: g.files.filter((f) => !selectedPaths.has(f.path))
          }))
          .filter((g) => g.files.length > 1)
      )
      setSelectedPaths(new Set())
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Delete failed',
        message: err?.message || 'An unexpected error occurred'
      })
    }
    setIsDeleting(false)
  }, [selectedPaths, addToast])

  // Summary calculations
  const totalDuplicateFiles = groups.reduce((s, g) => s + g.files.length - 1, 0)
  const totalWastedBytes = groups.reduce((s, g) => s + g.size * (g.files.length - 1), 0)
  const selectedCount = selectedPaths.size
  const selectedBytes = groups.reduce((s, g) => {
    const selectedInGroup = g.files.filter((f) => selectedPaths.has(f.path)).length
    return s + g.size * selectedInGroup
  }, 0)

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Directory Input */}
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
            <FolderOpen className="w-4 h-4 text-white/40 shrink-0" />
            <input
              type="text"
              value={directory}
              onChange={(e) => setDirectory(e.target.value)}
              placeholder="Directory to scan..."
              className="flex-1 bg-transparent text-sm text-white/80 outline-none placeholder:text-white/20"
            />
          </div>
          <button
            onClick={handleBrowse}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/60 hover:text-white/80 hover:bg-white/10 transition-colors cursor-pointer"
          >
            Browse
          </button>
        </div>

        {/* Min Size Selector */}
        <div className="relative">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70">
            <span className="text-white/40 text-xs">Min:</span>
            <select
              value={minSizeMB}
              onChange={(e) => setMinSizeMB(Number(e.target.value))}
              className="bg-transparent text-white/80 outline-none appearance-none cursor-pointer pr-5"
            >
              {MIN_SIZE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#1a1a2e] text-white">
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-white/40 absolute right-3" />
          </div>
        </div>

        {/* Scan Button */}
        <button
          onClick={handleScan}
          disabled={isScanning || !directory}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-sm text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isScanning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          {isScanning ? 'Scanning...' : 'Scan'}
        </button>
      </div>

      {/* Loading State */}
      {isScanning && (
        <div className="glass rounded-2xl p-8 text-center">
          <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Scanning for duplicate files...</p>
          <p className="text-white/30 text-xs mt-1">This may take a while for large directories</p>
        </div>
      )}

      {/* Empty State */}
      {!isScanning && hasScanned && groups.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <FileWarning className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-sm">
            No duplicate files found in the selected directory
          </p>
        </div>
      )}

      {/* Initial State */}
      {!isScanning && !hasScanned && groups.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <Copy className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-sm">
            Select a directory and click "Scan" to find duplicate files
          </p>
        </div>
      )}

      {/* Summary & Actions */}
      {groups.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className="text-xs text-white/40">
              Found <span className="text-white/70 font-medium">{groups.length}</span> duplicate
              groups, <span className="text-white/70 font-medium">{totalDuplicateFiles}</span>{' '}
              extra files,{' '}
              <span className="text-amber-400 font-medium">{formatSize(totalWastedBytes)}</span>{' '}
              wasted
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAllDuplicates}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/70 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Select All Duplicates
            </button>
            <button
              onClick={deselectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/70 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" />
              Deselect All
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={selectedCount === 0 || isDeleting}
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              Delete Selected ({selectedCount} files, {formatSize(selectedBytes)})
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl p-6 max-w-md w-full mx-4"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Delete Duplicates?</h3>
                  <p className="text-white/40 text-xs mt-0.5">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-white/60 mb-6">
                You are about to permanently delete{' '}
                <span className="text-white font-medium">{selectedCount} files</span> (
                {formatSize(selectedBytes)}). Make sure you have verified which copies to keep.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white/70 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors cursor-pointer"
                >
                  Delete {selectedCount} Files
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <div className="space-y-3 max-h-[calc(100vh-380px)] overflow-y-auto pr-1">
        <AnimatePresence>
          {groups.map((group, gIdx) => (
            <motion.div
              key={group.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: gIdx * 0.03 }}
              className="glass rounded-2xl overflow-hidden"
            >
              {/* Group Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <Copy className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="text-sm text-white/80 font-medium">{group.name}</span>
                    <span className="text-xs text-white/40 ml-3">
                      {formatSize(group.size)} each &middot; {group.files.length} copies
                    </span>
                  </div>
                </div>
                <span className="text-xs text-amber-400/70">
                  {formatSize(group.size * (group.files.length - 1))} wasted
                </span>
              </div>

              {/* File List */}
              <div>
                {group.files.map((file, fIdx) => {
                  const isOriginal = fIdx === 0
                  const isSelected = selectedPaths.has(file.path)
                  return (
                    <div
                      key={file.path}
                      className={`flex items-center gap-3 px-4 py-2 text-sm border-b border-white/[0.03] last:border-0 ${
                        isSelected ? 'bg-red-500/5' : 'hover:bg-white/[0.02]'
                      } transition-colors`}
                    >
                      <button
                        onClick={() => togglePath(file.path)}
                        className="shrink-0 cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-red-400" />
                        ) : (
                          <Square className="w-4 h-4 text-white/20" />
                        )}
                      </button>
                      <span
                        className="flex-1 text-white/50 text-xs font-mono truncate"
                        title={file.path}
                      >
                        {truncatePath(file.path)}
                      </span>
                      <span className="text-white/30 text-xs shrink-0">
                        {formatDate(file.modified)}
                      </span>
                      {isOriginal && (
                        <span className="text-xs text-green-400/60 bg-green-400/10 px-2 py-0.5 rounded-full shrink-0">
                          Original
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

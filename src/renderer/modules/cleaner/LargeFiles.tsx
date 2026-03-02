import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  HardDrive,
  FolderOpen,
  Trash2,
  Loader2,
  FileWarning,
  ArrowUpDown,
  ChevronDown
} from 'lucide-react'
import { useCleanerStore } from '@/stores/cleanerStore'
import { formatSize, formatDate } from '@/utils/format'

function truncatePath(p: string, maxLen: number = 50): string {
  if (p.length <= maxLen) return p
  const parts = p.split('\\')
  if (parts.length <= 3) return p
  return `${parts[0]}\\...\\${parts.slice(-2).join('\\')}`
}

type SortKey = 'size' | 'name' | 'modified'
type SortDir = 'asc' | 'desc'

export default function LargeFiles() {
  const {
    largeFiles,
    isFindingLarge,
    selectedDrive,
    drives,
    findLargeFiles,
    setSelectedDrive,
    deleteLargeFile
  } = useCleanerStore()

  const [sortKey, setSortKey] = useState<SortKey>('size')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [deletingPath, setDeletingPath] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  const sortedFiles = [...largeFiles].sort((a, b) => {
    let cmp = 0
    switch (sortKey) {
      case 'size':
        cmp = a.size - b.size
        break
      case 'name':
        cmp = a.name.localeCompare(b.name)
        break
      case 'modified':
        cmp = new Date(a.modified).getTime() - new Date(b.modified).getTime()
        break
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  const handleDelete = async (filePath: string) => {
    setDeletingPath(filePath)
    await deleteLargeFile(filePath)
    setDeletingPath(null)
    setConfirmDelete(null)
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Drive Selector */}
        <div className="relative">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70">
            <HardDrive className="w-4 h-4" />
            <select
              value={selectedDrive}
              onChange={(e) => setSelectedDrive(e.target.value)}
              className="bg-transparent text-white/80 outline-none appearance-none cursor-pointer pr-5"
            >
              {drives.map((d) => (
                <option key={d} value={d} className="bg-[#1a1a2e] text-white">
                  {d}:
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-white/40 absolute right-3" />
          </div>
        </div>

        <button
          onClick={findLargeFiles}
          disabled={isFindingLarge}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-sm text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isFindingLarge ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          {isFindingLarge ? 'Scanning...' : 'Find Large Files'}
        </button>

        {largeFiles.length > 0 && (
          <span className="text-xs text-white/40 ml-auto">
            {largeFiles.length} file{largeFiles.length !== 1 ? 's' : ''} found
          </span>
        )}
      </div>

      {/* Loading Skeleton */}
      {isFindingLarge && (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="glass rounded-xl p-4 animate-pulse flex gap-4">
              <div className="h-4 bg-white/5 rounded w-1/4" />
              <div className="h-4 bg-white/5 rounded w-1/3" />
              <div className="h-4 bg-white/5 rounded w-16" />
              <div className="h-4 bg-white/5 rounded w-20" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isFindingLarge && largeFiles.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <FileWarning className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-sm">
            Select a drive and click "Find Large Files" to search for files larger than 100 MB
          </p>
        </div>
      )}

      {/* Results Table */}
      {!isFindingLarge && sortedFiles.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_1.5fr_100px_110px_90px] gap-2 px-4 py-3 border-b border-white/5 text-xs text-white/40">
            <button
              onClick={() => handleSort('name')}
              className="flex items-center gap-1 cursor-pointer hover:text-white/60 transition-colors text-left"
            >
              Name
              {sortKey === 'name' && <ArrowUpDown className="w-3 h-3" />}
            </button>
            <span>Path</span>
            <button
              onClick={() => handleSort('size')}
              className="flex items-center gap-1 cursor-pointer hover:text-white/60 transition-colors text-left"
            >
              Size
              {sortKey === 'size' && <ArrowUpDown className="w-3 h-3" />}
            </button>
            <button
              onClick={() => handleSort('modified')}
              className="flex items-center gap-1 cursor-pointer hover:text-white/60 transition-colors text-left"
            >
              Modified
              {sortKey === 'modified' && <ArrowUpDown className="w-3 h-3" />}
            </button>
            <span className="text-right">Actions</span>
          </div>

          {/* Rows */}
          <div className="max-h-[calc(100vh-340px)] overflow-y-auto">
            <AnimatePresence>
              {sortedFiles.map((file, index) => (
                <motion.div
                  key={file.path}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10, height: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`grid grid-cols-[1fr_1.5fr_100px_110px_90px] gap-2 px-4 py-2.5 items-center text-sm border-b border-white/[0.03] ${
                    index % 2 === 0 ? 'bg-white/[0.01]' : ''
                  } hover:bg-white/[0.04] transition-colors`}
                >
                  <span className="text-white/80 truncate" title={file.name}>
                    {file.name}
                  </span>
                  <span
                    className="text-white/40 text-xs truncate font-mono"
                    title={file.path}
                  >
                    {truncatePath(file.path)}
                  </span>
                  <span className="text-white/70 font-mono text-xs">
                    {formatSize(file.size)}
                  </span>
                  <span className="text-white/40 text-xs">{formatDate(file.modified)}</span>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => window.api.cleaner.openFolder(file.path)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors cursor-pointer"
                      title="Open folder"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                    </button>
                    {confirmDelete === file.path ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(file.path)}
                          disabled={deletingPath === file.path}
                          className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer disabled:opacity-40"
                        >
                          {deletingPath === file.path ? '...' : 'Yes'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-2 py-1 rounded text-xs text-white/40 hover:text-white/60 transition-colors cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(file.path)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors cursor-pointer"
                        title="Delete file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  )
}

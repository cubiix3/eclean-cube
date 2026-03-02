import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldAlert,
  Upload,
  X,
  FileWarning,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2
} from 'lucide-react'
import { useCleanerStore, ShredderFile } from '@/stores/cleanerStore'

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

export default function FileShredder() {
  const {
    shredderFiles,
    isShredding,
    shredResult,
    addShredderFiles,
    removeShredderFile,
    clearShredderFiles,
    shredFiles,
    clearShredResult
  } = useCleanerStore()

  const [isDragging, setIsDragging] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files: ShredderFile[] = []
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i]
        files.push({
          path: (file as any).path || file.name,
          name: file.name,
          size: file.size
        })
      }
      if (files.length > 0) {
        addShredderFiles(files)
      }
    },
    [addShredderFiles]
  )

  const handleBrowse = async () => {
    try {
      const filePaths = await window.api.cleaner.openFileDialog()
      if (filePaths.length > 0) {
        // We get back paths but not sizes; we'll show 0 for size from dialog
        // In real use, the main process could return sizes too
        const files: ShredderFile[] = filePaths.map((p) => {
          const parts = p.split('\\')
          return {
            path: p,
            name: parts[parts.length - 1] || p,
            size: 0
          }
        })
        addShredderFiles(files)
      }
    } catch {
      // User cancelled dialog
    }
  }

  const handleShred = () => {
    setShowConfirm(true)
  }

  const confirmShred = async () => {
    setShowConfirm(false)
    await shredFiles()
  }

  const totalSize = shredderFiles.reduce((sum, f) => sum + f.size, 0)

  return (
    <div className="space-y-4">
      {/* Warning Banner */}
      <div className="glass rounded-xl p-4 border-l-4 border-red-500/60">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-red-400">Secure File Shredder</h3>
            <p className="text-xs text-white/50 mt-1">
              Files shredded with this tool are overwritten with random data 3 times before
              deletion. This makes recovery extremely difficult. Use with caution -- this action
              cannot be undone.
            </p>
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 ${
          isDragging
            ? 'border-red-400/50 bg-red-500/5'
            : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
        } ${shredderFiles.length > 0 ? 'p-4' : 'p-12'}`}
      >
        {shredderFiles.length === 0 ? (
          <div className="text-center">
            <Upload
              className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-red-400/60' : 'text-white/20'}`}
            />
            <p className="text-sm text-white/40 mb-2">
              {isDragging ? 'Drop files here...' : 'Drag & drop files here to shred'}
            </p>
            <p className="text-xs text-white/25 mb-4">or</p>
            <button
              onClick={handleBrowse}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              Browse Files
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* File List Header */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50">
                {shredderFiles.length} file{shredderFiles.length !== 1 ? 's' : ''} selected
                {totalSize > 0 && ` (${formatSize(totalSize)})`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBrowse}
                  className="text-xs text-white/40 hover:text-white/60 transition-colors cursor-pointer"
                >
                  + Add more
                </button>
                <button
                  onClick={clearShredderFiles}
                  className="text-xs text-white/40 hover:text-red-400 transition-colors cursor-pointer"
                >
                  Clear all
                </button>
              </div>
            </div>

            {/* File List */}
            <AnimatePresence>
              {shredderFiles.map((file) => (
                <motion.div
                  key={file.path}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors"
                >
                  <FileWarning className="w-4 h-4 text-red-400/60 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 truncate">{file.name}</p>
                    <p className="text-xs text-white/30 truncate font-mono">{file.path}</p>
                  </div>
                  {file.size > 0 && (
                    <span className="text-xs text-white/40 font-mono flex-shrink-0">
                      {formatSize(file.size)}
                    </span>
                  )}
                  <button
                    onClick={() => removeShredderFile(file.path)}
                    className="p-1 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors cursor-pointer flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Drop overlay when dragging with existing files */}
            {isDragging && (
              <div className="absolute inset-0 rounded-2xl bg-red-500/5 border-2 border-dashed border-red-400/50 flex items-center justify-center">
                <p className="text-sm text-red-400/60">Drop to add files</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Shred Button */}
      {shredderFiles.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleShred}
            disabled={isShredding}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-sm text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isShredding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {isShredding
              ? 'Shredding...'
              : `Shred ${shredderFiles.length} file${shredderFiles.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {/* Shredding Progress */}
      <AnimatePresence>
        {isShredding && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="glass rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-red-400 animate-spin" />
              <div className="flex-1">
                <p className="text-sm text-white/70">
                  Securely shredding files...
                </p>
                <p className="text-xs text-white/40 mt-1">
                  Overwriting with random data (3 passes)
                </p>
              </div>
            </div>
            <div className="mt-3 w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 10, ease: 'linear' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shred Result */}
      <AnimatePresence>
        {shredResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="glass rounded-xl p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {shredResult.errors.length === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                )}
                <div>
                  <p className="text-sm text-white/80">
                    {shredResult.success.length} file
                    {shredResult.success.length !== 1 ? 's' : ''} securely shredded
                    {shredResult.errors.length > 0 &&
                      `, ${shredResult.errors.length} error${shredResult.errors.length !== 1 ? 's' : ''}`}
                  </p>
                  {shredResult.errors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {shredResult.errors.map((err, i) => (
                        <p key={i} className="text-xs text-red-400/70">
                          {err}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={clearShredResult}
                className="text-xs text-white/40 hover:text-white/60 transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Dialog */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass rounded-2xl p-6 max-w-md w-full mx-4 border border-red-500/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Confirm Shredding</h3>
                  <p className="text-xs text-white/40">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-sm text-white/60 mb-6">
                You are about to permanently destroy{' '}
                <span className="text-white font-medium">
                  {shredderFiles.length} file{shredderFiles.length !== 1 ? 's' : ''}
                </span>
                . The files will be overwritten with random data 3 times before deletion, making
                recovery virtually impossible. Are you sure you want to proceed?
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmShred}
                  className="px-4 py-2 rounded-xl bg-red-600 text-sm text-white font-medium hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Shred Files
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

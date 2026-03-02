import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HardDrive, FolderTree, Loader2, ChevronDown } from 'lucide-react'

interface DiskTreeNode {
  name: string
  path: string
  size: number
  children?: DiskTreeNode[]
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

export default function DiskTreePage() {
  const [drives, setDrives] = useState<string[]>([])
  const [selectedDrive, setSelectedDrive] = useState<string>('')
  const [isScanning, setIsScanning] = useState(false)
  const [result, setResult] = useState<DiskTreeNode | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    window.api.diskTree.getDrives().then((d: string[]) => {
      setDrives(d)
      if (d.length > 0) setSelectedDrive(d[0])
    })
  }, [])

  const handleScan = async () => {
    if (!selectedDrive) return
    setIsScanning(true)
    setResult(null)
    try {
      const data = await window.api.diskTree.scan(selectedDrive)
      setResult(data)
    } catch (err) {
      console.error('Disk tree scan failed:', err)
    } finally {
      setIsScanning(false)
    }
  }

  const maxChildSize = result?.children
    ? Math.max(...result.children.map((c) => c.size), 1)
    : 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Disk Space Analyzer</h1>
          <p className="text-sm text-white/40 mt-1">Visualize what takes up space on your drives</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Drive Selector */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass text-sm text-white/80 hover:bg-white/[0.08] transition-colors cursor-pointer min-w-[100px]"
            >
              <HardDrive size={14} className="text-white/40" />
              <span>{selectedDrive || 'Drive'}</span>
              <ChevronDown size={14} className={`text-white/40 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full mt-1 right-0 z-10 glass rounded-xl overflow-hidden min-w-[100px]"
                >
                  {drives.map((drive) => (
                    <button
                      key={drive}
                      onClick={() => {
                        setSelectedDrive(drive)
                        setDropdownOpen(false)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer ${
                        selectedDrive === drive
                          ? 'text-white bg-white/10'
                          : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                      }`}
                    >
                      {drive}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Scan Button */}
          <button
            onClick={handleScan}
            disabled={isScanning || !selectedDrive}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            style={{ background: 'var(--accent-color)' }}
          >
            {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderTree className="w-4 h-4" />}
            {isScanning ? 'Scanning...' : 'Scan Drive'}
          </button>
        </div>
      </div>

      {/* Scanning State */}
      <AnimatePresence>
        {isScanning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-xl p-8"
          >
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-white/60" />
              <p className="text-sm text-white/60">Analyzing disk usage for {selectedDrive}...</p>
              <div className="w-full max-w-xs h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'var(--accent-color)' }}
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 15, ease: 'linear' }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!result && !isScanning && (
        <div className="glass rounded-2xl p-12 text-center">
          <FolderTree className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-sm">Select a drive and click "Scan Drive" to analyze disk usage</p>
        </div>
      )}

      {/* Results */}
      {result && !isScanning && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Total Size Header */}
          <motion.div
            className="glass rounded-xl p-4"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                <HardDrive size={18} className="text-white/50" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white">{result.name}</h3>
                <p className="text-xs text-white/40">{result.path}</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-white">{formatSize(result.size)}</span>
                <p className="text-xs text-white/40">Total scanned</p>
              </div>
            </div>
          </motion.div>

          {/* Bar Chart */}
          <div className="glass rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5">
              <span className="text-xs text-white/50 uppercase tracking-wider">
                Folder breakdown &middot; {result.children?.length ?? 0} items
              </span>
            </div>
            <div className="max-h-[480px] overflow-y-auto">
              {result.children && result.children.length > 0 ? (
                [...result.children]
                  .sort((a, b) => b.size - a.size)
                  .map((child, index) => {
                    const ratio = child.size / maxChildSize
                    const isLargest = child.size === maxChildSize

                    return (
                      <motion.div
                        key={child.path}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="px-4 py-3 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-white font-medium truncate mr-4">{child.name}</span>
                          <span className="text-xs text-white/60 shrink-0">{formatSize(child.size)}</span>
                        </div>
                        <div className="w-full h-5 bg-white/[0.03] rounded-md overflow-hidden">
                          <motion.div
                            className="h-full rounded-md"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(ratio * 100, 1)}%` }}
                            transition={{ duration: 0.6, delay: index * 0.02, ease: 'easeOut' }}
                            style={{
                              background: isLargest
                                ? 'var(--accent-color)'
                                : `rgba(255, 255, 255, ${0.04 + ratio * 0.12})`
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-white/20 font-mono truncate">{child.path}</span>
                          <span className="text-[10px] text-white/30 shrink-0">{(ratio * 100).toFixed(1)}%</span>
                        </div>
                      </motion.div>
                    )
                  })
              ) : (
                <div className="p-8 text-center text-white/30 text-sm">No subfolders found</div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

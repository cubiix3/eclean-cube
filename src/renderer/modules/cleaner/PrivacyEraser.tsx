import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  Clock,
  Cookie,
  Database,
  Key,
  MonitorX,
  Loader2,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
  Globe
} from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'
import { formatSize } from '@/utils/format'

const DATA_TYPES = [
  { key: 'history', label: 'History', icon: Clock },
  { key: 'cookies', label: 'Cookies', icon: Cookie },
  { key: 'cache', label: 'Cache', icon: Database },
  { key: 'sessions', label: 'Sessions', icon: MonitorX },
  { key: 'passwords', label: 'Passwords', icon: Key }
]

const BROWSER_ICONS: Record<string, string> = {
  Chrome: 'Cr',
  Edge: 'Ed',
  Firefox: 'Ff',
  Brave: 'Br',
  Opera: 'Op'
}

export default function PrivacyEraser() {
  const [browsers, setBrowsers] = useState<BrowserDataInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isErasing, setIsErasing] = useState(false)
  const [selectedBrowsers, setSelectedBrowsers] = useState<Set<string>>(new Set())
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set())
  const [showConfirm, setShowConfirm] = useState(false)
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    loadBrowserData()
  }, [])

  async function loadBrowserData() {
    setIsLoading(true)
    try {
      const data = await window.api.privacy.getBrowserData()
      setBrowsers(data)
    } catch {
      setBrowsers([])
    }
    setIsLoading(false)
  }

  function toggleBrowser(name: string) {
    setSelectedBrowsers((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  function toggleType(key: string) {
    setSelectedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  function selectAll() {
    setSelectedBrowsers(new Set(browsers.map((b) => b.name)))
    setSelectedTypes(new Set(DATA_TYPES.filter((t) => t.key !== 'passwords').map((t) => t.key)))
  }

  function deselectAll() {
    setSelectedBrowsers(new Set())
    setSelectedTypes(new Set())
  }

  async function handleErase() {
    setShowConfirm(false)
    setIsErasing(true)
    try {
      const result = await window.api.privacy.erase(
        Array.from(selectedBrowsers),
        Array.from(selectedTypes)
      )
      addToast({
        type: 'success',
        title: `Privacy data erased`,
        message: `${result.cleaned} items removed${result.errors.length > 0 ? `, ${result.errors.length} errors` : ''}`
      })
      // Refresh
      await loadBrowserData()
      setSelectedBrowsers(new Set())
      setSelectedTypes(new Set())
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erasure failed',
        message: err?.message || 'Unknown error'
      })
    }
    setIsErasing(false)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-white/30 animate-spin mb-3" />
        <p className="text-sm text-white/40">Scanning for browser data...</p>
      </div>
    )
  }

  if (browsers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Shield className="w-12 h-12 text-white/20 mb-3" />
        <p className="text-sm text-white/40">No browser data detected</p>
      </div>
    )
  }

  const canErase = selectedBrowsers.size > 0 && selectedTypes.size > 0

  return (
    <div className="space-y-6">
      {/* Browser Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {browsers.map((browser, i) => {
          const isSelected = selectedBrowsers.has(browser.name)
          return (
            <motion.button
              key={browser.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => toggleBrowser(browser.name)}
              className={`glass rounded-2xl p-4 text-left transition-all cursor-pointer ${
                isSelected
                  ? 'ring-2 ring-blue-500/50 bg-blue-500/5'
                  : 'hover:bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    isSelected
                      ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white'
                      : 'bg-white/5 text-white/50'
                  }`}
                >
                  {BROWSER_ICONS[browser.name] || browser.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{browser.name}</p>
                  <p className="text-xs text-white/30">{formatSize(browser.dataSize)}</p>
                </div>
                {isSelected ? (
                  <CheckSquare className="w-5 h-5 text-blue-400" />
                ) : (
                  <Square className="w-5 h-5 text-white/20" />
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {browser.hasHistory && (
                  <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-white/40">
                    History
                  </span>
                )}
                {browser.hasCookies && (
                  <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-white/40">
                    Cookies
                  </span>
                )}
                {browser.hasCache && (
                  <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-white/40">
                    Cache
                  </span>
                )}
                {browser.hasSessions && (
                  <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-white/40">
                    Sessions
                  </span>
                )}
                {browser.hasPasswords && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-[10px] text-amber-400/60">
                    Passwords
                  </span>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Data Type Selection */}
      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">
          Data Types to Erase
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {DATA_TYPES.map((dt) => {
            const Icon = dt.icon
            const isSelected = selectedTypes.has(dt.key)
            const isPasswordType = dt.key === 'passwords'
            return (
              <button
                key={dt.key}
                onClick={() => toggleType(dt.key)}
                className={`flex items-center gap-2.5 rounded-xl p-3 transition-all cursor-pointer ${
                  isSelected
                    ? isPasswordType
                      ? 'bg-red-500/10 ring-1 ring-red-500/30'
                      : 'bg-blue-500/10 ring-1 ring-blue-500/30'
                    : 'bg-white/[0.03] hover:bg-white/[0.05]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isSelected
                      ? isPasswordType
                        ? 'text-red-400'
                        : 'text-blue-400'
                      : 'text-white/30'
                  }`}
                />
                <span
                  className={`text-sm ${
                    isSelected
                      ? isPasswordType
                        ? 'text-red-300'
                        : 'text-white'
                      : 'text-white/40'
                  }`}
                >
                  {dt.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="px-4 py-2 rounded-xl bg-white/5 text-sm text-white/50 hover:bg-white/10 transition-colors cursor-pointer"
          >
            Select All
          </button>
          <button
            onClick={deselectAll}
            className="px-4 py-2 rounded-xl bg-white/5 text-sm text-white/50 hover:bg-white/10 transition-colors cursor-pointer"
          >
            Deselect All
          </button>
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          disabled={!canErase || isErasing}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            canErase && !isErasing
              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/20'
              : 'bg-white/5 text-white/20 cursor-not-allowed'
          }`}
        >
          {isErasing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Erasing...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              Erase Selected
            </>
          )}
        </button>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 rounded-xl bg-amber-500/5 border border-amber-500/10 p-4">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-amber-300/80 font-medium">Warning</p>
          <p className="text-xs text-white/30 mt-1">
            Selected browsers will be forcefully closed during the erasure process. Make sure to save
            any open work before proceeding. Password erasure is permanent and cannot be undone.
          </p>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl p-6 max-w-md w-full mx-4 border border-white/10"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Confirm Erasure</h3>
                  <p className="text-sm text-white/40">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-white/60 mb-2">
                You are about to erase data from{' '}
                <span className="text-white font-medium">{selectedBrowsers.size}</span> browser(s):
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {Array.from(selectedBrowsers).map((b) => (
                  <span
                    key={b}
                    className="px-2 py-0.5 rounded bg-white/5 text-xs text-white/60"
                  >
                    {b}
                  </span>
                ))}
              </div>
              <p className="text-sm text-white/60 mb-2">Data types:</p>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {Array.from(selectedTypes).map((t) => (
                  <span
                    key={t}
                    className={`px-2 py-0.5 rounded text-xs ${
                      t === 'passwords'
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-white/5 text-white/60'
                    }`}
                  >
                    {t}
                  </span>
                ))}
              </div>
              {selectedTypes.has('passwords') && (
                <div className="flex items-start gap-2 rounded-lg bg-red-500/5 border border-red-500/10 p-3 mb-4">
                  <Key className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300/70">
                    You have selected password erasure. This will permanently delete saved login
                    data.
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-sm text-white/60 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleErase}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-sm text-white font-medium hover:from-red-600 hover:to-red-700 transition-all cursor-pointer"
                >
                  Erase Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

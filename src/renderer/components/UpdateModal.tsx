import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Rocket, ArrowDownCircle, Loader2 } from 'lucide-react'

interface UpdateInfo {
  status: 'available' | 'downloading' | 'ready'
  version?: string
  percent?: number
}

export default function UpdateModal() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    window.api.updater.onStatus((data: any) => {
      if (data.status === 'available') {
        setUpdate({ status: 'available', version: data.version })
        setDismissed(false)
      } else if (data.status === 'downloading') {
        setUpdate({ status: 'downloading', version: data.version, percent: data.percent })
      } else if (data.status === 'ready') {
        setUpdate({ status: 'ready', version: data.version })
      }
    })
  }, [])

  const visible = update && !dismissed

  async function handleDownload() {
    try {
      await window.api.updater.download()
    } catch {
      // error handled by updater status
    }
  }

  function handleInstall() {
    window.api.updater.install()
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="w-[420px] glass rounded-2xl border border-white/10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--accent-color)' }}
                >
                  <ArrowDownCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Update Available</h2>
                  <p className="text-xs text-white/40">cleanonx v{update.version}</p>
                </div>
              </div>
              {update.status === 'available' && (
                <button
                  onClick={() => setDismissed(true)}
                  className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="px-5 pb-5">
              {update.status === 'available' && (
                <>
                  <p className="text-sm text-white/50 mb-5">
                    A new version of cleanonx is available. Would you like to download and install it?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDismissed(true)}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/50 hover:bg-white/10 transition-all cursor-pointer"
                    >
                      Later
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all cursor-pointer"
                      style={{ background: 'var(--accent-color)' }}
                    >
                      <Download className="w-4 h-4" />
                      Download Update
                    </button>
                  </div>
                </>
              )}

              {update.status === 'downloading' && (
                <>
                  <p className="text-sm text-white/50 mb-3">
                    Downloading update...
                  </p>
                  <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden mb-2">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: 'var(--accent-color)' }}
                      initial={{ width: '0%' }}
                      animate={{ width: `${update.percent ?? 0}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/40">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="text-xs">Downloading...</span>
                    </div>
                    <span className="text-xs text-white/40 tabular-nums">{update.percent ?? 0}%</span>
                  </div>
                </>
              )}

              {update.status === 'ready' && (
                <>
                  <p className="text-sm text-white/50 mb-5">
                    The update has been downloaded. Restart cleanonx to apply the update.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDismissed(true)}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/50 hover:bg-white/10 transition-all cursor-pointer"
                    >
                      Later
                    </button>
                    <button
                      onClick={handleInstall}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/20 border border-green-500/30 text-sm font-medium text-green-400 hover:bg-green-500/30 transition-all cursor-pointer"
                    >
                      <Rocket className="w-4 h-4" />
                      Restart & Install
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

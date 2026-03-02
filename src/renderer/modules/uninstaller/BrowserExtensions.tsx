import { useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  RefreshCw,
  Chrome,
  Globe,
  ExternalLink,
  Puzzle
} from 'lucide-react'
import { useUninstallerStore } from '@/stores/uninstallerStore'

function BrowserIcon({ browser }: { browser: string }) {
  switch (browser.toLowerCase()) {
    case 'chrome':
      return <Chrome className="w-5 h-5 text-blue-400" />
    case 'edge':
      return <Globe className="w-5 h-5 text-cyan-400" />
    case 'firefox':
      return <Globe className="w-5 h-5 text-orange-400" />
    default:
      return <Globe className="w-5 h-5 text-white/40" />
  }
}

function getBrowserGradient(browser: string): string {
  switch (browser.toLowerCase()) {
    case 'chrome':
      return 'from-blue-500/20 to-green-500/20'
    case 'edge':
      return 'from-cyan-500/20 to-blue-500/20'
    case 'firefox':
      return 'from-orange-500/20 to-red-500/20'
    default:
      return 'from-white/10 to-white/5'
  }
}

export default function BrowserExtensions() {
  const {
    extensions,
    isLoadingExtensions,
    fetchExtensions,
    openExtensionsPage
  } = useUninstallerStore()

  useEffect(() => {
    fetchExtensions()
  }, [])

  const grouped = useMemo(() => {
    const groups: Record<string, UninstallerBrowserExtension[]> = {}
    for (const ext of extensions) {
      if (!groups[ext.browser]) groups[ext.browser] = []
      groups[ext.browser].push(ext)
    }
    return groups
  }, [extensions])

  const browsers = Object.keys(grouped)

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-white/40">
          <span className="text-white font-medium">{extensions.length}</span> extensions found across{' '}
          <span className="text-white font-medium">{browsers.length}</span> browsers
        </span>
        <button
          onClick={fetchExtensions}
          disabled={isLoadingExtensions}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40 cursor-pointer"
        >
          {isLoadingExtensions ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Refresh
        </button>
      </div>

      {/* Loading Skeleton */}
      {isLoadingExtensions && extensions.length === 0 && (
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-6 w-32 bg-white/10 rounded animate-pulse" />
              <div className="glass rounded-2xl p-4 space-y-3 animate-pulse">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/10 rounded-lg" />
                    <div className="flex-1 h-4 bg-white/5 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoadingExtensions && extensions.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <Puzzle className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-sm">
            No browser extensions found. Make sure Chrome, Edge, or Firefox is installed.
          </p>
        </div>
      )}

      {/* Grouped by Browser */}
      <AnimatePresence>
        {browsers.map((browser) => (
          <motion.div
            key={browser}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            {/* Browser Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrowserIcon browser={browser} />
                <h3 className="text-white font-medium">{browser}</h3>
                <span className="text-xs text-white/30 px-2 py-0.5 rounded-full bg-white/5">
                  {grouped[browser].length}
                </span>
              </div>
              <button
                onClick={() => openExtensionsPage(browser)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3 h-3" />
                Open Extensions Page
              </button>
            </div>

            {/* Extension List */}
            <div className="glass rounded-2xl overflow-hidden">
              {grouped[browser].map((ext, idx) => (
                <div
                  key={`${ext.browser}-${ext.id}`}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors ${
                    idx < grouped[browser].length - 1 ? 'border-b border-white/[0.03]' : ''
                  }`}
                >
                  {/* Extension Icon */}
                  <div
                    className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getBrowserGradient(browser)} flex items-center justify-center flex-shrink-0`}
                  >
                    <Puzzle className="w-4 h-4 text-white/60" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">
                      {ext.name.startsWith('__MSG_') ? ext.id : ext.name}
                    </p>
                    {ext.description && (
                      <p className="text-xs text-white/30 truncate">{ext.description}</p>
                    )}
                  </div>

                  <span className="text-xs text-white/30 flex-shrink-0">v{ext.version}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

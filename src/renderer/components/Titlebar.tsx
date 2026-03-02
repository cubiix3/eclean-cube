import { useState, useEffect } from 'react'
import { Minus, Square, X, Copy, ShieldAlert } from 'lucide-react'

export default function Titlebar() {
  const [isMaximized, setIsMaximized] = useState(false)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    window.api.window.isMaximized().then(setIsMaximized)
    window.api.window.onMaximizeChange(setIsMaximized)
    window.api.system.isAdmin().then(setIsAdmin).catch(() => setIsAdmin(false))
  }, [])

  return (
    <div
      className="h-10 flex items-center justify-between bg-[#0a0a0f] select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* App title + admin status */}
      <div className="pl-4 flex items-center gap-2">
        <span className="text-xs text-white/40 font-medium tracking-wider uppercase">
          eclean
        </span>
        {isAdmin === false && (
          <div className="relative group" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <ShieldAlert size={12} className="text-amber-400/60" />
            <div className="absolute left-0 top-full mt-1 px-2 py-1 bg-[#1a1a2e] border border-white/10 rounded-lg text-[10px] text-white/50 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              Some features require admin privileges.
              <br />
              Right-click eclean.exe and Run as administrator.
            </div>
          </div>
        )}
      </div>

      {/* Window controls */}
      <div
        className="flex h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => window.api.window.minimize()}
          className="w-12 h-full flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <Minus size={14} className="text-white/60" />
        </button>
        <button
          onClick={() => window.api.window.maximize()}
          className="w-12 h-full flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          {isMaximized ? (
            <Copy size={12} className="text-white/60" />
          ) : (
            <Square size={12} className="text-white/60" />
          )}
        </button>
        <button
          onClick={() => window.api.window.close()}
          className="w-12 h-full flex items-center justify-center hover:bg-red-500/80 transition-colors"
        >
          <X size={14} className="text-white/60" />
        </button>
      </div>
    </div>
  )
}

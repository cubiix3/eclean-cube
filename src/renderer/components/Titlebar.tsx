import { useState, useEffect } from 'react'
import { Minus, Square, X, Copy } from 'lucide-react'

export default function Titlebar() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.api.window.isMaximized().then(setIsMaximized)
    window.api.window.onMaximizeChange(setIsMaximized)
  }, [])

  return (
    <div
      className="h-10 flex items-center justify-between bg-[#0a0a0f] select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* App title */}
      <div className="pl-4 text-xs text-white/40 font-medium tracking-wider uppercase">
        eclean
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

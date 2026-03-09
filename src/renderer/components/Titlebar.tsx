import { useState, useEffect, useRef } from 'react'
import { Minus, Square, X, Copy, ShieldAlert, PanelTopDashed, Bell, CheckCheck, Trash2, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react'
import { useToastStore, type NotificationEntry } from '@/stores/toastStore'
import { motion, AnimatePresence } from 'framer-motion'

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case 'success': return <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
    case 'error': return <AlertCircle className="w-3.5 h-3.5 text-red-400" />
    case 'warning': return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
    default: return <Info className="w-3.5 h-3.5 text-blue-400" />
  }
}

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const notifications = useToastStore((s) => s.notifications)
  const markAllRead = useToastStore((s) => s.markAllRead)
  const clearNotifications = useToastStore((s) => s.clearNotifications)

  useEffect(() => { markAllRead() }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      className="absolute right-12 top-10 w-80 max-h-96 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Notifications</span>
        <div className="flex gap-2">
          <button onClick={() => { clearNotifications(); onClose() }} className="text-[10px] text-white/30 hover:text-white/50 cursor-pointer flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> Clear
          </button>
        </div>
      </div>
      <div className="overflow-y-auto max-h-80">
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-white/20 text-xs">No notifications</div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className="flex items-start gap-2.5 px-4 py-2.5 border-b border-white/[0.03] hover:bg-white/[0.02]">
              <div className="mt-0.5"><NotificationIcon type={n.type} /></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/80 font-medium truncate">{n.title}</p>
                {n.message && <p className="text-[10px] text-white/30 truncate">{n.message}</p>}
                <p className="text-[10px] text-white/20 mt-0.5">{new Date(n.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  )
}

export default function Titlebar() {
  const [isMaximized, setIsMaximized] = useState(false)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [showNotifs, setShowNotifs] = useState(false)
  const addToast = useToastStore((s) => s.addToast)
  const unreadCount = useToastStore((s) => s.unreadCount)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.api.window.isMaximized().then(setIsMaximized)
    window.api.window.onMaximizeChange(setIsMaximized)
    window.api.system.isAdmin().then(setIsAdmin).catch(() => setIsAdmin(false))
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowNotifs(false)
      }
    }
    if (showNotifs) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showNotifs])

  const handleOpenWidget = async () => {
    try {
      const isOpen = await window.api.widget.isOpen()
      if (isOpen) {
        await window.api.widget.close()
        addToast({ type: 'info', title: 'Mini widget closed' })
      } else {
        await window.api.widget.open()
        addToast({ type: 'success', title: 'Mini widget opened' })
      }
    } catch {
      addToast({ type: 'error', title: 'Failed to toggle mini widget' })
    }
  }

  return (
    <div
      className="h-10 flex items-center justify-between bg-[#0a0a0f] select-none relative"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="pl-4 flex items-center gap-2">
        <span className="text-xs text-white/40 font-medium tracking-wider uppercase">cleanonx</span>
        {isAdmin === false && (
          <div className="relative group" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <ShieldAlert size={12} className="text-amber-400/60" />
            <div className="absolute left-0 top-full mt-1 px-2 py-1 bg-[#1a1a2e] border border-white/10 rounded-lg text-[10px] text-white/50 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              Some features require admin privileges.
              <br />
              Right-click cleanonx.exe and Run as administrator.
            </div>
          </div>
        )}
      </div>

      <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} ref={panelRef}>
        {/* Notification Bell */}
        <button
          onClick={() => setShowNotifs(!showNotifs)}
          className="w-10 h-full flex items-center justify-center hover:bg-white/10 transition-colors relative cursor-pointer"
          title="Notifications"
        >
          <Bell size={13} className="text-white/40" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full text-[8px] font-bold text-white flex items-center justify-center" style={{ background: 'var(--accent-color)' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        <AnimatePresence>{showNotifs && <NotificationPanel onClose={() => setShowNotifs(false)} />}</AnimatePresence>

        <button onClick={handleOpenWidget} className="w-10 h-full flex items-center justify-center hover:bg-white/10 transition-colors relative group cursor-pointer" title="Mini Widget">
          <PanelTopDashed size={13} className="text-white/40 group-hover:text-blue-400 transition-colors" />
        </button>
        <button onClick={() => window.api.window.minimize()} className="w-12 h-full flex items-center justify-center hover:bg-white/10 transition-colors">
          <Minus size={14} className="text-white/60" />
        </button>
        <button onClick={() => window.api.window.maximize()} className="w-12 h-full flex items-center justify-center hover:bg-white/10 transition-colors">
          {isMaximized ? <Copy size={12} className="text-white/60" /> : <Square size={12} className="text-white/60" />}
        </button>
        <button onClick={() => window.api.window.close()} className="w-12 h-full flex items-center justify-center hover:bg-red-500/80 transition-colors">
          <X size={14} className="text-white/60" />
        </button>
      </div>
    </div>
  )
}

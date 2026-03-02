import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useToastStore, type Toast as ToastType } from '@/stores/toastStore'

const ICON_MAP = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info
}

const COLOR_MAP = {
  success: {
    border: 'border-green-500/30',
    icon: 'text-green-400',
    progress: 'bg-green-500',
    bg: 'from-green-500/10 to-transparent'
  },
  error: {
    border: 'border-red-500/30',
    icon: 'text-red-400',
    progress: 'bg-red-500',
    bg: 'from-red-500/10 to-transparent'
  },
  warning: {
    border: 'border-amber-500/30',
    icon: 'text-amber-400',
    progress: 'bg-amber-500',
    bg: 'from-amber-500/10 to-transparent'
  },
  info: {
    border: 'border-blue-500/30',
    icon: 'text-blue-400',
    progress: 'bg-blue-500',
    bg: 'from-blue-500/10 to-transparent'
  }
}

export default function Toast({ toast }: { toast: ToastType }) {
  const removeToast = useToastStore((s) => s.removeToast)
  const duration = toast.duration ?? 4000
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const start = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)
      if (remaining <= 0) {
        clearInterval(interval)
        removeToast(toast.id)
      }
    }, 30)

    return () => clearInterval(interval)
  }, [toast.id, duration, removeToast])

  const Icon = ICON_MAP[toast.type]
  const colors = COLOR_MAP[toast.type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`relative w-80 rounded-xl overflow-hidden border ${colors.border} bg-[#1a1a2e]/95 backdrop-blur-xl shadow-2xl shadow-black/40`}
    >
      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-r ${colors.bg} pointer-events-none`} />

      {/* Content */}
      <div className="relative flex items-start gap-3 p-4">
        <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${colors.icon}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">{toast.title}</p>
          {toast.message && (
            <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{toast.message}</p>
          )}
        </div>
        <button
          onClick={() => removeToast(toast.id)}
          className="shrink-0 p-1 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-[2px] w-full bg-white/5">
        <motion.div
          className={`h-full ${colors.progress}`}
          style={{ width: `${progress}%` }}
          transition={{ duration: 0 }}
        />
      </div>
    </motion.div>
  )
}

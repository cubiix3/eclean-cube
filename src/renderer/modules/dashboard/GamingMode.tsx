import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gamepad2, Zap, X, Cpu, MemoryStick, BatteryCharging } from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'

interface GamingResult {
  killedProcesses: number
  freedRAM: number
  powerPlan: string
}

export default function GamingMode() {
  const [isActive, setIsActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<GamingResult | null>(null)
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    window.api.gaming.isActive().then(setIsActive)
  }, [])

  const handleActivate = async () => {
    setIsLoading(true)
    try {
      const res = await window.api.gaming.activate()
      setIsActive(true)
      setResult(res)
      addToast({
        type: 'success',
        title: 'Gaming Mode Activated',
        message: `Killed ${res.killedProcesses} processes, freed ${res.freedRAM} MB RAM`
      })
    } catch {
      addToast({
        type: 'error',
        title: 'Gaming Mode Failed',
        message: 'Could not activate gaming mode'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeactivate = async () => {
    setIsLoading(true)
    try {
      await window.api.gaming.deactivate()
      setIsActive(false)
      setResult(null)
      addToast({
        type: 'info',
        title: 'Gaming Mode Deactivated',
        message: 'System restored to normal settings'
      })
    } catch {
      addToast({
        type: 'error',
        title: 'Deactivation Failed',
        message: 'Could not deactivate gaming mode'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      className={`glass rounded-2xl p-6 relative overflow-hidden ${
        isActive ? 'border-green-500/30' : ''
      }`}
      style={
        isActive
          ? { borderColor: 'rgba(34, 197, 94, 0.3)', boxShadow: '0 0 30px rgba(34, 197, 94, 0.08)' }
          : undefined
      }
    >
      {/* Glow effect when active */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(34, 197, 94, 0.06) 0%, transparent 70%)'
            }}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                isActive
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-white/5 text-white/50'
              }`}
            >
              <Gamepad2 size={20} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Gaming Mode</h3>
              <p className="text-xs text-white/40">
                {isActive ? 'System optimized for gaming' : 'One-click performance boost'}
              </p>
            </div>
          </div>

          {/* Status badge */}
          <div
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              isActive
                ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                : 'bg-white/5 text-white/30 border border-white/5'
            }`}
          >
            {isActive ? 'ACTIVE' : 'OFF'}
          </div>
        </div>

        {/* Stats when active */}
        <AnimatePresence>
          {isActive && result && (
            <motion.div
              className="grid grid-cols-3 gap-3 mb-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="rounded-lg bg-white/5 p-3 text-center">
                <Cpu size={14} className="mx-auto mb-1 text-green-400/70" />
                <div className="text-lg font-bold text-white">{result.killedProcesses}</div>
                <div className="text-[10px] text-white/30 uppercase">Killed</div>
              </div>
              <div className="rounded-lg bg-white/5 p-3 text-center">
                <MemoryStick size={14} className="mx-auto mb-1 text-green-400/70" />
                <div className="text-lg font-bold text-white">{result.freedRAM}</div>
                <div className="text-[10px] text-white/30 uppercase">MB Freed</div>
              </div>
              <div className="rounded-lg bg-white/5 p-3 text-center">
                <BatteryCharging size={14} className="mx-auto mb-1 text-green-400/70" />
                <div className="text-xs font-bold text-white mt-1">{result.powerPlan}</div>
                <div className="text-[10px] text-white/30 uppercase mt-0.5">Plan</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action button */}
        {isActive ? (
          <motion.button
            onClick={handleDeactivate}
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
            ) : (
              <>
                <X size={14} />
                Deactivate Gaming Mode
              </>
            )}
          </motion.button>
        ) : (
          <motion.button
            onClick={handleActivate}
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/20 text-green-400 text-sm font-medium hover:from-green-500/30 hover:to-emerald-500/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            animate={
              isLoading
                ? {}
                : {
                    boxShadow: [
                      '0 0 0px rgba(34, 197, 94, 0)',
                      '0 0 15px rgba(34, 197, 94, 0.15)',
                      '0 0 0px rgba(34, 197, 94, 0)'
                    ]
                  }
            }
            transition={
              isLoading
                ? {}
                : { boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' } }
            }
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
            ) : (
              <>
                <Zap size={14} />
                Activate Gaming Mode
              </>
            )}
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}

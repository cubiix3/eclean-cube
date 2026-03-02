import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  Loader2,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Battery,
  BatteryCharging,
  BatteryFull
} from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'

interface PowerPlan {
  guid: string
  name: string
  isActive: boolean
}

const PLAN_ICONS: Record<string, typeof Zap> = {
  balanced: Battery,
  'power saver': BatteryCharging,
  'high performance': BatteryFull,
  ultimate: Zap
}

function getPlanIcon(name: string) {
  const lower = name.toLowerCase()
  for (const [key, Icon] of Object.entries(PLAN_ICONS)) {
    if (lower.includes(key)) return Icon
  }
  return Zap
}

export default function PowerPlanPage() {
  const [plans, setPlans] = useState<PowerPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activatingGuid, setActivatingGuid] = useState<string | null>(null)
  const [deletingGuid, setDeletingGuid] = useState<string | null>(null)
  const addToast = useToastStore((s) => s.addToast)

  const fetchPlans = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await window.api.power.getPlans()
      setPlans(data)
    } catch {
      addToast({ type: 'error', title: 'Failed to load plans', message: 'Could not enumerate power plans' })
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  const handleSetActive = async (guid: string) => {
    setActivatingGuid(guid)
    try {
      const result = await window.api.power.setActive(guid)
      if (result.success) {
        setPlans((prev) =>
          prev.map((p) => ({ ...p, isActive: p.guid === guid }))
        )
        const plan = plans.find((p) => p.guid === guid)
        addToast({ type: 'success', title: 'Plan activated', message: plan?.name || guid })
      } else {
        addToast({ type: 'error', title: 'Activation failed', message: result.error || 'Unknown error' })
      }
    } catch {
      addToast({ type: 'error', title: 'Activation failed', message: 'An unexpected error occurred' })
    }
    setActivatingGuid(null)
  }

  const handleDelete = async (guid: string) => {
    setDeletingGuid(guid)
    try {
      const result = await window.api.power.delete(guid)
      if (result.success) {
        addToast({ type: 'success', title: 'Plan deleted', message: 'Power plan removed successfully' })
        await fetchPlans()
      } else {
        addToast({ type: 'error', title: 'Delete failed', message: result.error || 'Unknown error' })
      }
    } catch {
      addToast({ type: 'error', title: 'Delete failed', message: 'An unexpected error occurred' })
    }
    setDeletingGuid(null)
  }

  const activePlan = plans.find((p) => p.isActive)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Power Plans</h1>
          <p className="text-sm text-white/40 mt-1">Manage Windows power plans</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="glass rounded-2xl p-5 h-40 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Power Plans</h1>
          <p className="text-sm text-white/40 mt-1">
            Manage Windows power plans
            {activePlan && (
              <span className="text-white/30"> &middot; Active: {activePlan.name}</span>
            )}
          </p>
        </div>
        <button
          onClick={fetchPlans}
          className="p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-white/40" />
        </button>
      </div>

      {/* Plans Grid */}
      {plans.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Zap className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40">No power plans found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {plans.map((plan, index) => {
              const Icon = getPlanIcon(plan.name)
              const isBusy = activatingGuid === plan.guid || deletingGuid === plan.guid

              return (
                <motion.div
                  key={plan.guid}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ delay: index * 0.06 }}
                  className={`glass rounded-2xl p-5 space-y-4 transition-all cursor-pointer ${
                    plan.isActive
                      ? 'ring-1 ring-[var(--accent-color)]/40 bg-[var(--accent-color)]/5'
                      : 'hover:bg-white/[0.02]'
                  }`}
                  onClick={() => !plan.isActive && !isBusy && handleSetActive(plan.guid)}
                >
                  {/* Plan Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          plan.isActive ? 'bg-[var(--accent-color)]/15' : 'bg-white/5'
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 ${
                            plan.isActive ? 'text-[var(--accent-color)]' : 'text-white/40'
                          }`}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{plan.name}</p>
                        <p className="text-[11px] text-white/25 font-mono mt-0.5 truncate max-w-[160px]">
                          {plan.guid}
                        </p>
                      </div>
                    </div>

                    {plan.isActive && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Active
                      </span>
                    )}
                  </div>

                  {/* Radio Indicator */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        plan.isActive
                          ? 'border-[var(--accent-color)]'
                          : 'border-white/15'
                      }`}
                    >
                      {plan.isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ background: 'var(--accent-color)' }}
                        />
                      )}
                      {activatingGuid === plan.guid && (
                        <Loader2 className="w-3 h-3 animate-spin text-white/40" />
                      )}
                    </div>
                    <span className="text-xs text-white/40">
                      {plan.isActive
                        ? 'Currently active'
                        : activatingGuid === plan.guid
                          ? 'Activating...'
                          : 'Click to activate'}
                    </span>
                  </div>

                  {/* Delete Button (non-active only) */}
                  {!plan.isActive && (
                    <div className="pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(plan.guid)
                        }}
                        disabled={isBusy}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed w-full justify-center border border-white/[0.04]"
                      >
                        {deletingGuid === plan.guid ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        Delete Plan
                      </button>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

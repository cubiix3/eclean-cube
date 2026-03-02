import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { HardDrive, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'

export default function DiskHealth() {
  const [disks, setDisks] = useState<DiskHealthInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const addToast = useToastStore((s) => s.addToast)

  const fetchDiskHealth = async () => {
    setIsLoading(true)
    try {
      const data = await window.api.hardware.getDiskHealth()
      setDisks(data)
    } catch {
      addToast({
        type: 'error',
        title: 'Failed to load disk health',
        message: 'Could not retrieve S.M.A.R.T. data'
      })
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchDiskHealth()
  }, [])

  const healthyCount = disks.filter((d) => d.healthStatus === 'Healthy' && !d.predictFailure).length
  const issueCount = disks.length - healthyCount

  const formatSize = (bytes: number): string => {
    if (bytes <= 0) return 'Unknown'
    const gb = bytes / 1073741824
    if (gb >= 1000) return `${(gb / 1024).toFixed(1)} TB`
    return `${Math.round(gb)} GB`
  }

  const getHealthColor = (status: DiskHealthInfo['healthStatus'], predictFailure: boolean) => {
    if (predictFailure) return { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/20' }
    switch (status) {
      case 'Healthy':
        return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/20' }
      case 'Warning':
        return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/20' }
      case 'Unhealthy':
        return { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/20' }
      default:
        return { bg: 'bg-white/5', text: 'text-white/40', border: 'border-white/10' }
    }
  }

  const getHealthIcon = (status: DiskHealthInfo['healthStatus'], predictFailure: boolean) => {
    if (predictFailure) return <XCircle className="w-5 h-5 text-red-400" />
    switch (status) {
      case 'Healthy':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />
      case 'Warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />
      case 'Unhealthy':
        return <XCircle className="w-5 h-5 text-red-400" />
      default:
        return <HardDrive className="w-5 h-5 text-white/40" />
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="glass rounded-2xl p-5 animate-pulse h-16" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="glass rounded-2xl p-5 h-32 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {issueCount === 0 ? (
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-white">
                {issueCount === 0
                  ? 'All disks healthy'
                  : `${issueCount} disk${issueCount > 1 ? 's' : ''} need${issueCount === 1 ? 's' : ''} attention`}
              </p>
              <p className="text-xs text-white/40 mt-0.5">
                {disks.length} disk{disks.length !== 1 ? 's' : ''} detected
              </p>
            </div>
          </div>
          <button
            onClick={fetchDiskHealth}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-white/40" />
          </button>
        </div>
      </motion.div>

      {/* Disk Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {disks.map((disk, index) => {
          const colors = getHealthColor(disk.healthStatus, disk.predictFailure)
          return (
            <motion.div
              key={disk.name + index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center shrink-0`}>
                  {getHealthIcon(disk.healthStatus, disk.predictFailure)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-white truncate">{disk.name}</p>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${colors.bg} ${colors.text} border ${colors.border}`}
                    >
                      {disk.predictFailure ? 'Failing' : disk.healthStatus}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      {disk.mediaType}
                    </span>
                    <span>{formatSize(disk.size)}</span>
                  </div>

                  {disk.predictFailure && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-400 leading-relaxed">
                          This disk may fail soon! Back up your data immediately.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {disks.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center">
          <HardDrive className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40">No disk health data available</p>
          <p className="text-xs text-white/25 mt-1">
            S.M.A.R.T. data may require administrator privileges
          </p>
        </div>
      )}
    </div>
  )
}

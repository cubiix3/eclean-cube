import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts'
import {
  Wifi,
  ArrowDown,
  ArrowUp,
  Globe,
  Activity,
  TrendingUp,
  Loader2
} from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'

interface NetworkAdapterStats {
  name: string
  bytesReceivedPerSec: number
  bytesSentPerSec: number
  currentBandwidth: number
}

interface ConnectionInfo {
  connections: number
  publicIP: string
}

interface ChartPoint {
  timestamp: number
  download: number
  upload: number
}

function formatRate(bytesPerSec: number): string {
  if (bytesPerSec >= 1048576) return `${(bytesPerSec / 1048576).toFixed(2)} MB/s`
  if (bytesPerSec >= 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`
  return `${bytesPerSec.toFixed(0)} B/s`
}

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes.toFixed(0)} B`
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}

function RateTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1e1e2e] border border-white/10 rounded-lg p-2 text-xs">
      <p className="text-white/40 mb-1">{formatTime(label)}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {formatRate(entry.value || 0)}
        </p>
      ))}
    </div>
  )
}

export default function NetworkMonitor() {
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [adapters, setAdapters] = useState<NetworkAdapterStats[]>([])
  const [connInfo, setConnInfo] = useState<ConnectionInfo | null>(null)
  const [isLoadingConn, setIsLoadingConn] = useState(false)
  const [peakDownload, setPeakDownload] = useState(0)
  const [peakUpload, setPeakUpload] = useState(0)
  const [totalDownloaded, setTotalDownloaded] = useState(0)
  const [totalUploaded, setTotalUploaded] = useState(0)
  const intervalRef = useRef<number | null>(null)
  const addToast = useToastStore((s) => s.addToast)

  // Start streaming
  useEffect(() => {
    ;(window.api as any).network.startMonitor()
    ;(window.api as any).network.onStats((stats: NetworkAdapterStats[]) => {
      setAdapters(stats)
      const totalRecv = stats.reduce((s, a) => s + a.bytesReceivedPerSec, 0)
      const totalSent = stats.reduce((s, a) => s + a.bytesSentPerSec, 0)

      const point: ChartPoint = {
        timestamp: Date.now(),
        download: totalRecv,
        upload: totalSent
      }

      setChartData((prev) => {
        const next = [...prev, point]
        if (next.length > 60) next.shift()
        return next
      })

      setPeakDownload((prev) => Math.max(prev, totalRecv))
      setPeakUpload((prev) => Math.max(prev, totalSent))
      setTotalDownloaded((prev) => prev + totalRecv)
      setTotalUploaded((prev) => prev + totalSent)
    })

    return () => {
      ;(window.api as any).network.stopMonitor()
      ;(window.api as any).network.removeStatsListener()
    }
  }, [])

  // Load connection info
  const fetchConnectionInfo = useCallback(async () => {
    setIsLoadingConn(true)
    try {
      const info = await (window.api as any).network.getConnectionInfo()
      setConnInfo(info)
    } catch {
      addToast({ type: 'error', title: 'Failed to fetch connection info' })
    }
    setIsLoadingConn(false)
  }, [addToast])

  useEffect(() => {
    fetchConnectionInfo()
  }, [fetchConnectionInfo])

  const latestDown = chartData.length > 0 ? chartData[chartData.length - 1].download : 0
  const latestUp = chartData.length > 0 ? chartData[chartData.length - 1].upload : 0

  return (
    <div className="space-y-4">
      {/* Current Speed Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="glass rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center">
              <ArrowDown className="w-4 h-4 text-green-400" />
            </div>
            <span className="text-xs text-white/40 uppercase tracking-wider">Download</span>
          </div>
          <p className="text-xl font-bold text-green-400">{formatRate(latestDown)}</p>
          <p className="text-xs text-white/30 mt-1">Peak: {formatRate(peakDownload)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <ArrowUp className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-xs text-white/40 uppercase tracking-wider">Upload</span>
          </div>
          <p className="text-xl font-bold text-blue-400">{formatRate(latestUp)}</p>
          <p className="text-xs text-white/30 mt-1">Peak: {formatRate(peakUpload)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-xs text-white/40 uppercase tracking-wider">Connections</span>
          </div>
          <p className="text-xl font-bold text-purple-400">
            {isLoadingConn ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              connInfo?.connections ?? '--'
            )}
          </p>
          <p className="text-xs text-white/30 mt-1">Active TCP</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Globe className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="text-xs text-white/40 uppercase tracking-wider">Public IP</span>
          </div>
          <p className="text-lg font-bold text-cyan-400 font-mono">
            {isLoadingConn ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              connInfo?.publicIP ?? '--'
            )}
          </p>
          <button
            onClick={fetchConnectionInfo}
            className="text-xs text-white/30 mt-1 hover:text-white/50 transition-colors cursor-pointer"
          >
            Refresh
          </button>
        </motion.div>
      </div>

      {/* Live Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white/40" />
            </div>
            <h3 className="text-sm text-white/40 uppercase tracking-wider">
              Bandwidth (last 60s)
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-white/40">Download</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-white/40">Upload</span>
            </div>
          </div>
        </div>
        <div className="h-[220px]">
          {chartData.length < 2 ? (
            <div className="h-full flex items-center justify-center text-white/20 text-sm">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Collecting data...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatTime}
                  stroke="rgba(255,255,255,0.1)"
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="rgba(255,255,255,0.1)"
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                  width={60}
                  tickFormatter={(v) => formatRate(v)}
                />
                <Tooltip content={<RateTooltip />} />
                <Line
                  type="monotone"
                  dataKey="download"
                  name="Download"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, fill: '#22c55e' }}
                />
                <Line
                  type="monotone"
                  dataKey="upload"
                  name="Upload"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      {/* Session Stats & Adapter Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Session Totals */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
              <Wifi className="w-4 h-4 text-white/40" />
            </div>
            <h3 className="text-sm text-white/40 uppercase tracking-wider">Session Totals</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">Total Downloaded</span>
              <span className="text-sm text-green-400 font-mono">
                {formatBytes(totalDownloaded)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">Total Uploaded</span>
              <span className="text-sm text-blue-400 font-mono">
                {formatBytes(totalUploaded)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">Peak Download</span>
              <span className="text-sm text-green-400/70 font-mono">
                {formatRate(peakDownload)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">Peak Upload</span>
              <span className="text-sm text-blue-400/70 font-mono">
                {formatRate(peakUpload)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Per-Adapter Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white/40" />
            </div>
            <h3 className="text-sm text-white/40 uppercase tracking-wider">Network Adapters</h3>
          </div>
          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
            {adapters.length === 0 ? (
              <p className="text-white/20 text-sm text-center py-4">Waiting for data...</p>
            ) : (
              adapters
                .filter(
                  (a) => a.bytesReceivedPerSec > 0 || a.bytesSentPerSec > 0 || a.currentBandwidth > 0
                )
                .map((adapter, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/60 truncate" title={adapter.name}>
                        {adapter.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
                      <span className="text-green-400/70">
                        <ArrowDown className="w-3 h-3 inline mr-0.5" />
                        {formatRate(adapter.bytesReceivedPerSec)}
                      </span>
                      <span className="text-blue-400/70">
                        <ArrowUp className="w-3 h-3 inline mr-0.5" />
                        {formatRate(adapter.bytesSentPerSec)}
                      </span>
                    </div>
                  </div>
                ))
            )}
            {adapters.length > 0 &&
              adapters.filter(
                (a) => a.bytesReceivedPerSec > 0 || a.bytesSentPerSec > 0 || a.currentBandwidth > 0
              ).length === 0 && (
                <p className="text-white/20 text-sm text-center py-4">
                  No active adapters detected
                </p>
              )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

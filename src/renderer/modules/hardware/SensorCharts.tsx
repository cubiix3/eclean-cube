import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts'
import { Cpu, MemoryStick, Wifi, HardDrive } from 'lucide-react'

interface Props {
  data: DetailedSensors[]
}

const CORE_COLORS = [
  '#3b82f6', '#a855f7', '#22c55e', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
  '#f97316', '#6366f1', '#14b8a6', '#e11d48',
  '#8b5cf6', '#10b981', '#f43f5e', '#0ea5e9'
]

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1e1e2e] border border-white/10 rounded-lg p-2 text-xs max-h-48 overflow-auto">
      <p className="text-white/40 mb-1">{formatTime(label)}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
        </p>
      ))}
    </div>
  )
}

function formatRate(bytesPerSec: number): string {
  if (bytesPerSec >= 1048576) return `${(bytesPerSec / 1048576).toFixed(1)} MB/s`
  if (bytesPerSec >= 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`
  return `${bytesPerSec.toFixed(0)} B/s`
}

function RateTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1e1e2e] border border-white/10 rounded-lg p-2 text-xs max-h-48 overflow-auto">
      <p className="text-white/40 mb-1">{formatTime(label)}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {formatRate(entry.value || 0)}
        </p>
      ))}
    </div>
  )
}

function ChartCard({
  icon,
  title,
  children
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
          {icon}
        </div>
        <h3 className="text-sm text-white/40 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="h-[180px]">{children}</div>
    </div>
  )
}

function WaitingMessage() {
  return (
    <div className="h-full flex items-center justify-center text-white/20 text-sm">
      Collecting data...
    </div>
  )
}

export default function SensorCharts({ data }: Props) {
  // Build CPU core chart data
  const coreCount = data.length > 0 ? data[data.length - 1].cpuCores.length : 0
  const cpuChartData = data.map((d) => {
    const point: any = { timestamp: d.timestamp }
    d.cpuCores.forEach((core, i) => {
      point[`core${i}`] = core.usage
    })
    return point
  })

  // Build memory chart data
  const memChartData = data.map((d) => ({
    timestamp: d.timestamp,
    used: d.ramUsedGB,
    available: d.ramAvailGB
  }))

  // Build network chart data: aggregate all adapters
  const netChartData = data.map((d) => {
    const totalRecv = d.netAdapters.reduce((s, a) => s + a.recvBytesPerSec, 0)
    const totalSent = d.netAdapters.reduce((s, a) => s + a.sentBytesPerSec, 0)
    return { timestamp: d.timestamp, download: totalRecv, upload: totalSent }
  })

  // Build disk I/O chart data: aggregate all disks
  const diskChartData = data.map((d) => {
    const totalRead = d.diskIO.reduce((s, a) => s + a.readBytesPerSec, 0)
    const totalWrite = d.diskIO.reduce((s, a) => s + a.writeBytesPerSec, 0)
    return { timestamp: d.timestamp, read: totalRead, write: totalWrite }
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* CPU Cores */}
      <ChartCard
        icon={<Cpu size={14} className="text-blue-400" />}
        title="CPU Cores"
      >
        {data.length < 2 ? (
          <WaitingMessage />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cpuChartData}>
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatTime}
                stroke="rgba(255,255,255,0.1)"
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                stroke="rgba(255,255,255,0.1)"
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                width={35}
              />
              <Tooltip content={<CustomTooltip />} />
              {Array.from({ length: coreCount }, (_, i) => (
                <Line
                  key={i}
                  type="monotone"
                  dataKey={`core${i}`}
                  name={`Core ${i}`}
                  stroke={CORE_COLORS[i % CORE_COLORS.length]}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Memory */}
      <ChartCard
        icon={<MemoryStick size={14} className="text-purple-400" />}
        title="Memory"
      >
        {data.length < 2 ? (
          <WaitingMessage />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={memChartData}>
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
                width={35}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="used"
                name="Used (GB)"
                stroke="#a855f7"
                fill="rgba(168,85,247,0.15)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="available"
                name="Available (GB)"
                stroke="#6366f1"
                fill="rgba(99,102,241,0.08)"
                strokeWidth={1.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Network */}
      <ChartCard
        icon={<Wifi size={14} className="text-cyan-400" />}
        title="Network"
      >
        {data.length < 2 ? (
          <WaitingMessage />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={netChartData}>
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
                width={50}
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
      </ChartCard>

      {/* Disk I/O */}
      <ChartCard
        icon={<HardDrive size={14} className="text-amber-400" />}
        title="Disk I/O"
      >
        {data.length < 2 ? (
          <WaitingMessage />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={diskChartData}>
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
                width={50}
                tickFormatter={(v) => formatRate(v)}
              />
              <Tooltip content={<RateTooltip />} />
              <Line
                type="monotone"
                dataKey="read"
                name="Read"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: '#3b82f6' }}
              />
              <Line
                type="monotone"
                dataKey="write"
                name="Write"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: '#f59e0b' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  )
}

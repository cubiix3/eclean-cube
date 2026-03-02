import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

interface SensorDataPoint {
  timestamp: number
  cpu: number
  ram: number
}

interface Props {
  data: SensorDataPoint[]
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1e1e2e] border border-white/10 rounded-lg p-2 text-xs">
      <p className="text-white/40 mb-1">{formatTime(label)}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {entry.value}%
        </p>
      ))}
    </div>
  )
}

export default function LiveCharts({ data }: Props) {
  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-sm text-white/40 uppercase tracking-wider mb-4">Live Performance</h3>
      <div className="h-[200px]">
        {data.length < 2 ? (
          <div className="h-full flex items-center justify-center text-white/20 text-sm">Collecting data...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="timestamp" tickFormatter={formatTime} stroke="rgba(255,255,255,0.1)" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.1)" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} width={35} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="cpu" name="CPU" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: '#3b82f6' }} />
              <Line type="monotone" dataKey="ram" name="RAM" stroke="#a855f7" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: '#a855f7' }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="flex gap-4 mt-3 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="text-xs text-white/40">CPU</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          <span className="text-xs text-white/40">RAM</span>
        </div>
      </div>
    </div>
  )
}

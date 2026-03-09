import { motion } from 'framer-motion'
import { Cpu, MemoryStick, MonitorSpeaker, HardDrive } from 'lucide-react'

interface OverviewData {
  cpu: { name: string; usage: number; temp: number | null }
  ram: { total: number; used: number; percent: number }
  gpu: { name: string; usage: number | null; temp: number | null }
  disk: { total: number; used: number; percent: number }
}

interface Props {
  data: OverviewData | null
  isLoading: boolean
}

function getBarColor(percent: number): string {
  if (percent >= 85) return 'from-red-500 to-red-400'
  if (percent >= 60) return 'from-amber-500 to-amber-400'
  return 'from-blue-500 to-cyan-400'
}

interface BarProps {
  icon: React.ReactNode
  label: string
  sublabel: string
  percent: number
  detail: string
}

function UsageBar({ icon, label, sublabel, percent, detail }: BarProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1.5">
          <div>
            <span className="text-sm text-white font-medium">{label}</span>
            <span className="text-xs text-white/30 ml-2">{sublabel}</span>
          </div>
          <span className="text-sm text-white/60">{detail}</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${getBarColor(percent)}`}
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  )
}

export default function SystemOverview({ data, isLoading }: Props) {
  if (isLoading || !data) {
    return (
      <div className="glass rounded-2xl p-6">
        <h3 className="text-sm text-white/40 uppercase tracking-wider mb-6">System Overview</h3>
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-sm text-white/40 uppercase tracking-wider mb-6">System Overview</h3>
      <div className="space-y-5">
        <UsageBar icon={<Cpu size={18} className="text-blue-400" />} label="CPU" sublabel={`${data.cpu.usage}%`} percent={data.cpu.usage} detail={data.cpu.temp ? `${data.cpu.temp}°C` : ''} />
        <UsageBar icon={<MemoryStick size={18} className="text-purple-400" />} label="RAM" sublabel={`${data.ram.used} / ${data.ram.total} GB`} percent={data.ram.percent} detail={`${data.ram.percent}%`} />
        <UsageBar icon={<MonitorSpeaker size={18} className="text-green-400" />} label="GPU" sublabel={(data.gpu.name || 'Unknown GPU').substring(0, 30)} percent={data.gpu.usage || 0} detail={data.gpu.temp ? `${data.gpu.temp}°C` : ''} />
        <UsageBar icon={<HardDrive size={18} className="text-amber-400" />} label="Disk" sublabel={`${data.disk.used} / ${data.disk.total} GB`} percent={data.disk.percent} detail={`${data.disk.percent}%`} />
      </div>
    </div>
  )
}

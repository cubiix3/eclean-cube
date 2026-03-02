import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cpu,
  Monitor,
  MemoryStick,
  HardDrive,
  Wifi,
  CircuitBoard,
  ChevronDown
} from 'lucide-react'

interface Props {
  data: HardwareInfo
}

interface InfoCardProps {
  icon: React.ReactNode
  title: string
  summary: string
  children: React.ReactNode
}

function InfoCard({ icon, title, summary, children }: InfoCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="glass rounded-2xl overflow-hidden cursor-pointer transition-colors hover:bg-white/[0.07]"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-4 p-5">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-xs text-white/40 truncate mt-0.5">{summary}</p>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={16} className="text-white/30" />
        </motion.div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-0 border-t border-white/5">
              <div className="pt-4 space-y-2">{children}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-white/40">{label}</span>
      <span className="text-xs text-white/70 font-mono">{value}</span>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

export default function SystemInfo({ data }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* CPU */}
      <InfoCard
        icon={<Cpu size={18} className="text-blue-400" />}
        title="Processor"
        summary={data.cpu.name}
      >
        <DetailRow label="Cores / Threads" value={`${data.cpu.cores}C / ${data.cpu.threads}T`} />
        <DetailRow label="Base Clock" value={`${data.cpu.baseClockMHz} MHz`} />
        <DetailRow label="Max Clock" value={`${data.cpu.maxClockMHz} MHz`} />
        <DetailRow label="L2 Cache" value={`${data.cpu.l2CacheKB} KB`} />
        <DetailRow label="L3 Cache" value={`${data.cpu.l3CacheKB} KB`} />
      </InfoCard>

      {/* GPU(s) */}
      {data.gpu.map((gpu, i) => (
        <InfoCard
          key={i}
          icon={<Monitor size={18} className="text-green-400" />}
          title={data.gpu.length > 1 ? `GPU ${i + 1}` : 'Graphics'}
          summary={gpu.name}
        >
          <DetailRow label="Name" value={gpu.name} />
          <DetailRow label="VRAM" value={formatBytes(gpu.vramBytes)} />
          <DetailRow label="Driver Version" value={gpu.driverVersion} />
        </InfoCard>
      ))}

      {/* RAM */}
      <InfoCard
        icon={<MemoryStick size={18} className="text-purple-400" />}
        title="Memory"
        summary={`${data.ram.totalGB} GB Total`}
      >
        <DetailRow label="Total" value={`${data.ram.totalGB} GB`} />
        {data.ram.modules.map((mod, i) => (
          <div key={i} className="mt-2 pt-2 border-t border-white/5 space-y-2">
            <p className="text-xs text-white/50 font-medium">Module {i + 1} - {mod.slot}</p>
            <DetailRow label="Capacity" value={`${mod.capacityGB} GB`} />
            <DetailRow label="Speed" value={`${mod.speedMHz} MHz`} />
            <DetailRow label="Manufacturer" value={mod.manufacturer} />
          </div>
        ))}
      </InfoCard>

      {/* Storage */}
      {data.storage.map((disk, i) => (
        <InfoCard
          key={i}
          icon={<HardDrive size={18} className="text-amber-400" />}
          title={data.storage.length > 1 ? `Disk ${i + 1}` : 'Storage'}
          summary={`${disk.model} (${disk.sizeGB.toFixed(0)} GB)`}
        >
          <DetailRow label="Model" value={disk.model} />
          <DetailRow label="Size" value={`${disk.sizeGB.toFixed(1)} GB`} />
          <DetailRow label="Media Type" value={disk.mediaType} />
          <DetailRow label="Interface" value={disk.interface} />
        </InfoCard>
      ))}

      {/* Network */}
      {data.network.map((adapter, i) => (
        <InfoCard
          key={i}
          icon={<Wifi size={18} className="text-cyan-400" />}
          title={data.network.length > 1 ? `Network ${i + 1}` : 'Network'}
          summary={adapter.name}
        >
          <DetailRow label="Name" value={adapter.name} />
          <DetailRow label="MAC Address" value={adapter.mac} />
          {adapter.ip.map((ip, j) => (
            <DetailRow key={j} label={`IP Address ${j + 1}`} value={ip} />
          ))}
          <DetailRow label="DHCP" value={adapter.dhcp ? 'Enabled' : 'Disabled'} />
        </InfoCard>
      ))}

      {/* Motherboard */}
      <InfoCard
        icon={<CircuitBoard size={18} className="text-rose-400" />}
        title="Motherboard"
        summary={`${data.motherboard.manufacturer} ${data.motherboard.model}`}
      >
        <DetailRow label="Manufacturer" value={data.motherboard.manufacturer} />
        <DetailRow label="Model" value={data.motherboard.model} />
        <DetailRow label="BIOS Version" value={data.motherboard.biosVersion} />
      </InfoCard>

      {/* OS */}
      <InfoCard
        icon={<Monitor size={18} className="text-indigo-400" />}
        title="Operating System"
        summary={data.os.name}
      >
        <DetailRow label="Name" value={data.os.name} />
        <DetailRow label="Version" value={data.os.version} />
        <DetailRow label="Build" value={data.os.build} />
        <DetailRow label="Architecture" value={data.os.arch} />
      </InfoCard>
    </div>
  )
}

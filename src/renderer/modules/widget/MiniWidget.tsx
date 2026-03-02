import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, Cpu, MemoryStick, Thermometer } from 'lucide-react'

interface WidgetData {
  cpu: number
  ram: number
  cpuTemp: number | null
  gpuTemp: number | null
}

export default function MiniWidget() {
  const [data, setData] = useState<WidgetData>({
    cpu: 0,
    ram: 0,
    cpuTemp: null,
    gpuTemp: null
  })
  const isDragging = useRef(false)

  useEffect(() => {
    // Start sensor stream for live data
    window.api.system.startSensorStream()
    window.api.system.onSensorData((sensorData) => {
      setData((prev) => ({
        ...prev,
        cpu: sensorData.cpu,
        ram: sensorData.ram
      }))
    })

    // Get initial overview for temps
    const fetchOverview = async () => {
      try {
        const overview = await window.api.system.getOverview()
        setData((prev) => ({
          ...prev,
          cpu: overview.cpu.usage,
          ram: overview.ram.percent,
          cpuTemp: overview.cpu.temp,
          gpuTemp: overview.gpu.temp
        }))
      } catch {
        // Silently handle
      }
    }
    fetchOverview()
    const interval = setInterval(fetchOverview, 10000)

    return () => {
      clearInterval(interval)
      window.api.system.stopSensorStream()
    }
  }, [])

  const handleClose = () => {
    window.api.widget.close()
  }

  const getBarColor = (value: number) => {
    if (value < 50) return 'from-emerald-500 to-emerald-400'
    if (value < 80) return 'from-amber-500 to-amber-400'
    return 'from-red-500 to-red-400'
  }

  // Make widget draggable via mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-close]')) return
    isDragging.current = true
    const startX = e.screenX
    const startY = e.screenY

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return
      const deltaX = ev.screenX - startX
      const deltaY = ev.screenY - startY
      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        // Use window movement - for frameless windows we need native drag
      }
    }

    const handleMouseUp = () => {
      isDragging.current = false
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="w-full h-full select-none"
      onMouseDown={handleMouseDown}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="w-full h-full rounded-xl bg-[#0d0d15]/90 backdrop-blur-xl border border-white/10 p-2.5 flex flex-col gap-1.5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-semibold text-white/40 uppercase tracking-widest">
            eclean
          </span>
          <button
            data-close
            onClick={handleClose}
            className="w-4 h-4 rounded flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <X className="w-2.5 h-2.5 text-white/40" />
          </button>
        </div>

        {/* CPU */}
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3 h-3 text-blue-400 shrink-0" />
          <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${getBarColor(data.cpu)}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(data.cpu, 100)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <span className="text-[10px] text-white/70 font-mono w-7 text-right">
            {data.cpu}%
          </span>
        </div>

        {/* RAM */}
        <div className="flex items-center gap-1.5">
          <MemoryStick className="w-3 h-3 text-purple-400 shrink-0" />
          <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${getBarColor(data.ram)}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(data.ram, 100)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <span className="text-[10px] text-white/70 font-mono w-7 text-right">
            {data.ram}%
          </span>
        </div>

        {/* Temperature row */}
        <div className="flex items-center gap-2 mt-auto">
          <Thermometer className="w-3 h-3 text-orange-400 shrink-0" />
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-white/50">
              CPU{' '}
              <span className="text-white/70 font-mono">
                {data.cpuTemp !== null && data.cpuTemp > 0 ? `${Math.round(data.cpuTemp)}°` : '--'}
              </span>
            </span>
            <span className="text-white/50">
              GPU{' '}
              <span className="text-white/70 font-mono">
                {data.gpuTemp !== null && data.gpuTemp > 0 ? `${Math.round(data.gpuTemp)}°` : '--'}
              </span>
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

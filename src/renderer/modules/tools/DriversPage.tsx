import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cpu,
  Search,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Monitor,
  Wifi,
  HardDrive,
  Usb,
  Keyboard,
  ChevronDown
} from 'lucide-react'

interface DriverInfo {
  deviceName: string
  driverVersion: string
  driverDate: string
  manufacturer: string
  deviceClass: string
  status: string
  isSigned: boolean
}

const CLASS_ICONS: Record<string, React.ReactNode> = {
  Display: <Monitor size={16} />,
  Net: <Wifi size={16} />,
  DiskDrive: <HardDrive size={16} />,
  USB: <Usb size={16} />,
  Keyboard: <Keyboard size={16} />,
  Processor: <Cpu size={16} />
}

function formatDriverDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<DriverInfo[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [hasScanned, setHasScanned] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const handleScan = async () => {
    setIsScanning(true)
    setDrivers([])
    try {
      const data = await window.api.drivers.scan()
      setDrivers(data)
      setHasScanned(true)
    } catch (err) {
      console.error('Driver scan failed:', err)
    } finally {
      setIsScanning(false)
    }
  }

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return drivers
    const q = searchQuery.toLowerCase()
    return drivers.filter(
      (d) =>
        d.deviceName.toLowerCase().includes(q) ||
        d.manufacturer.toLowerCase().includes(q) ||
        d.deviceClass.toLowerCase().includes(q)
    )
  }, [drivers, searchQuery])

  const grouped = useMemo(() => {
    const groups: Record<string, DriverInfo[]> = {}
    for (const driver of filtered) {
      const key = driver.deviceClass || 'Other'
      if (!groups[key]) groups[key] = []
      groups[key].push(driver)
    }
    // Sort groups by name, put "Other" last
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === 'Other') return 1
      if (b === 'Other') return -1
      return a.localeCompare(b)
    })
  }, [filtered])

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  const unsignedCount = drivers.filter((d) => !d.isSigned).length
  const totalCount = filtered.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Drivers</h1>
          <p className="text-sm text-white/40 mt-1">Scan and review installed device drivers</p>
        </div>
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          style={{ background: 'var(--accent-color)' }}
        >
          {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {isScanning ? 'Scanning...' : 'Scan Drivers'}
        </button>
      </div>

      {/* Scanning State */}
      <AnimatePresence>
        {isScanning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-xl p-8"
          >
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-white/60" />
              <p className="text-sm text-white/60">Scanning installed drivers...</p>
              <div className="w-full max-w-xs h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'var(--accent-color)' }}
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 10, ease: 'linear' }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!hasScanned && !isScanning && (
        <div className="glass rounded-2xl p-12 text-center">
          <Cpu className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-sm">Click "Scan Drivers" to analyze your installed drivers</p>
        </div>
      )}

      {/* Results */}
      {hasScanned && !isScanning && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Stats Bar */}
          <div className="glass rounded-xl p-4 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-white/40" />
              <span className="text-sm text-white/60">
                <span className="text-white font-medium">{drivers.length}</span> drivers found
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-400/60" />
              <span className="text-sm text-white/60">
                <span className="text-white font-medium">{drivers.length - unsignedCount}</span> signed
              </span>
            </div>
            {unsignedCount > 0 && (
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400/60" />
                <span className="text-sm text-amber-400/80">
                  <span className="font-medium">{unsignedCount}</span> unsigned
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-white/40">
              {grouped.length} categories
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by device name, manufacturer, or class..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-white/20 transition-colors"
            />
            {searchQuery && (
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-white/30">
                {totalCount} result{totalCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Grouped Driver List */}
          {grouped.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center text-white/30 text-sm">
              No drivers match your search
            </div>
          ) : (
            grouped.map(([className, classDrivers], groupIdx) => {
              const isCollapsed = collapsedGroups.has(className)
              const classUnsigned = classDrivers.filter((d) => !d.isSigned).length

              return (
                <motion.div
                  key={className}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: groupIdx * 0.03 }}
                  className="glass rounded-xl overflow-hidden"
                >
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(className)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 shrink-0">
                      {CLASS_ICONS[className] || <Cpu size={16} />}
                    </div>
                    <div className="flex-1 text-left">
                      <span className="text-sm font-semibold text-white">{className}</span>
                      <span className="text-xs text-white/30 ml-2">{classDrivers.length} driver{classDrivers.length !== 1 ? 's' : ''}</span>
                    </div>
                    {classUnsigned > 0 && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
                        {classUnsigned} unsigned
                      </span>
                    )}
                    <ChevronDown
                      size={16}
                      className={`text-white/30 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                    />
                  </button>

                  {/* Driver Rows */}
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-white/[0.03]">
                          {classDrivers.map((driver, driverIdx) => (
                            <motion.div
                              key={`${driver.deviceName}-${driverIdx}`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: driverIdx * 0.015 }}
                              className="flex items-center gap-4 px-4 py-3 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-sm text-white font-medium truncate">{driver.deviceName}</span>
                                  {driver.isSigned ? (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-400/10 text-green-400 border border-green-400/20 shrink-0 flex items-center gap-0.5">
                                      <ShieldCheck size={8} />
                                      Signed
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 shrink-0 flex items-center gap-0.5">
                                      <ShieldAlert size={8} />
                                      Unsigned
                                    </span>
                                  )}
                                  {driver.status && driver.status !== 'OK' && (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-400/10 text-red-400 border border-red-400/20 shrink-0">
                                      {driver.status}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-white/40">
                                  <span>{driver.manufacturer}</span>
                                  <span className="text-white/20">v{driver.driverVersion}</span>
                                  <span className="text-white/20">{formatDriverDate(driver.driverDate)}</span>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })
          )}
        </motion.div>
      )}
    </div>
  )
}

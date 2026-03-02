import { useEffect, useRef, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  RefreshCw,
  X,
  ArrowUpDown,
  Cpu,
  MemoryStick,
  Type,
  ToggleLeft,
  ToggleRight
} from 'lucide-react'
import { useProcessStore } from '@/stores/processStore'

export default function ProcessManager() {
  const {
    processes,
    isLoading,
    searchQuery,
    sortBy,
    sortDir,
    autoRefresh,
    processCount,
    fetchProcesses,
    killProcess,
    setSearchQuery,
    setSortBy,
    toggleAutoRefresh
  } = useProcessStore()

  const [confirmKill, setConfirmKill] = useState<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetchProcesses()
  }, [])

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchProcesses()
      }, 3000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [autoRefresh])

  const filtered = useMemo(() => {
    let list = [...processes]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.pid.toString().includes(q)
      )
    }

    list.sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortBy === 'cpu') cmp = a.cpu - b.cpu
      else if (sortBy === 'ram') cmp = a.ram - b.ram
      return sortDir === 'asc' ? cmp : -cmp
    })

    return list
  }, [processes, searchQuery, sortBy, sortDir])

  const totalCPU = useMemo(
    () => processes.reduce((sum, p) => sum + p.cpu, 0),
    [processes]
  )
  const totalRAM = useMemo(
    () => processes.reduce((sum, p) => sum + p.ram, 0),
    [processes]
  )

  const cpuColor = (v: number) =>
    v < 10 ? 'text-emerald-400' : v < 50 ? 'text-yellow-400' : 'text-red-400'
  const ramColor = (v: number) =>
    v < 100 ? 'text-emerald-400' : v < 500 ? 'text-yellow-400' : 'text-red-400'

  const handleKill = (pid: number, name: string) => {
    if (confirmKill === pid) {
      killProcess(pid, name)
      setConfirmKill(null)
    } else {
      setConfirmKill(pid)
      setTimeout(() => setConfirmKill(null), 3000)
    }
  }

  const SortButton = ({
    label,
    field,
    icon: Icon
  }: {
    label: string
    field: 'name' | 'cpu' | 'ram'
    icon: React.ElementType
  }) => (
    <button
      onClick={() => setSortBy(field)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
        sortBy === field
          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          : 'bg-white/5 text-white/50 hover:text-white/70 hover:bg-white/10 border border-white/5'
      }`}
    >
      <Icon size={13} />
      {label}
      {sortBy === field && (
        <ArrowUpDown size={11} className="ml-0.5 opacity-60" />
      )}
    </button>
  )

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-xl p-4 border border-white/5">
          <div className="text-xs text-white/40 mb-1">Total Processes</div>
          <div className="text-2xl font-bold text-white">{processCount}</div>
        </div>
        <div className="glass rounded-xl p-4 border border-white/5">
          <div className="text-xs text-white/40 mb-1">Total CPU Time</div>
          <div className={`text-2xl font-bold ${cpuColor(totalCPU / (processes.length || 1))}`}>
            {totalCPU.toFixed(1)}s
          </div>
        </div>
        <div className="glass rounded-xl p-4 border border-white/5">
          <div className="text-xs text-white/40 mb-1">Total RAM Usage</div>
          <div className={`text-2xl font-bold ${ramColor(totalRAM / (processes.length || 1))}`}>
            {totalRAM >= 1024 ? `${(totalRAM / 1024).toFixed(1)} GB` : `${totalRAM.toFixed(0)} MB`}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search processes..."
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>

        {/* Sort Buttons */}
        <SortButton label="Name" field="name" icon={Type} />
        <SortButton label="CPU%" field="cpu" icon={Cpu} />
        <SortButton label="RAM" field="ram" icon={MemoryStick} />

        {/* Auto Refresh Toggle */}
        <button
          onClick={toggleAutoRefresh}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
            autoRefresh
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              : 'bg-white/5 text-white/50 hover:text-white/70 border-white/5'
          }`}
        >
          {autoRefresh ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
          Auto-refresh
        </button>

        {/* Manual Refresh */}
        <button
          onClick={fetchProcesses}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-white/50 hover:text-white/70 hover:bg-white/10 border border-white/5 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Process Table */}
      <div className="glass rounded-xl border border-white/5 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_80px_90px_100px_120px_50px] gap-2 px-4 py-3 border-b border-white/5 text-xs font-medium text-white/40 uppercase tracking-wider">
          <div>Process</div>
          <div>PID</div>
          <div>CPU</div>
          <div>RAM</div>
          <div>Status</div>
          <div></div>
        </div>

        {/* Table Body */}
        <div className="max-h-[calc(100vh-420px)] overflow-y-auto">
          {isLoading && processes.length === 0 ? (
            // Loading skeleton
            <div className="divide-y divide-white/5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_80px_90px_100px_120px_50px] gap-2 px-4 py-3"
                >
                  <div className="h-4 bg-white/5 rounded animate-pulse w-32" />
                  <div className="h-4 bg-white/5 rounded animate-pulse w-12" />
                  <div className="h-4 bg-white/5 rounded animate-pulse w-14" />
                  <div className="h-4 bg-white/5 rounded animate-pulse w-16" />
                  <div className="h-4 bg-white/5 rounded animate-pulse w-20" />
                  <div className="h-4 bg-white/5 rounded animate-pulse w-6" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-12 text-center text-white/30 text-sm">
              {searchQuery ? 'No processes match your search' : 'No processes found'}
            </div>
          ) : (
            <AnimatePresence>
              {filtered.map((proc) => (
                <motion.div
                  key={proc.pid}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-[1fr_80px_90px_100px_120px_50px] gap-2 px-4 py-2.5 border-b border-white/[0.03] hover:bg-white/5 transition-colors items-center"
                >
                  {/* Process Name */}
                  <div className="font-mono text-sm text-white/80 truncate">{proc.name}</div>

                  {/* PID */}
                  <div className="text-xs text-white/40 font-mono">{proc.pid}</div>

                  {/* CPU */}
                  <div className={`text-sm font-medium font-mono ${cpuColor(proc.cpu)}`}>
                    {proc.cpu.toFixed(1)}
                  </div>

                  {/* RAM */}
                  <div className={`text-sm font-medium font-mono ${ramColor(proc.ram)}`}>
                    {proc.ram >= 1024
                      ? `${(proc.ram / 1024).toFixed(1)} GB`
                      : `${proc.ram.toFixed(1)} MB`}
                  </div>

                  {/* Status Badge */}
                  <div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        proc.status === 'Responding'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : proc.status === 'Not Responding'
                            ? 'bg-red-500/15 text-red-400'
                            : 'bg-white/10 text-white/40'
                      }`}
                    >
                      {proc.status}
                    </span>
                  </div>

                  {/* Kill Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleKill(proc.pid, proc.name)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                        confirmKill === proc.pid
                          ? 'bg-red-500/30 text-red-400 border border-red-500/50'
                          : 'text-white/20 hover:text-red-400 hover:bg-red-500/10'
                      }`}
                      title={confirmKill === proc.pid ? 'Click again to confirm' : 'Kill process'}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-xs text-white/30 text-center">
        Showing {filtered.length} of {processes.length} processes
        {autoRefresh && ' \u00b7 Auto-refreshing every 3s'}
      </div>
    </div>
  )
}

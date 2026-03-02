import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cloud,
  Globe,
  Shield,
  Lock,
  Loader2,
  Wifi,
  Activity,
  Check
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { useBoosterStore, DNS_PRESETS } from '@/stores/boosterStore'

const PRESET_ICONS: Record<string, React.ReactNode> = {
  cloud: <Cloud className="w-5 h-5" />,
  globe: <Globe className="w-5 h-5" />,
  shield: <Shield className="w-5 h-5" />,
  lock: <Lock className="w-5 h-5" />
}

const PRESET_GRADIENTS: Record<string, string> = {
  Cloudflare: 'from-orange-500 to-amber-400',
  Google: 'from-blue-500 to-cyan-400',
  OpenDNS: 'from-green-500 to-emerald-400',
  Quad9: 'from-purple-500 to-pink-400'
}

function getLatencyColor(latency: number): string {
  if (latency < 0) return '#ef4444'
  if (latency < 30) return '#22c55e'
  if (latency < 60) return '#eab308'
  return '#ef4444'
}

export default function DnsOptimizer() {
  const {
    dnsConfigs,
    isLoadingDNS,
    isApplyingDNS,
    dnsLatencyResults,
    isTestingDNS,
    selectedDNSPreset,
    fetchDNS,
    applyDNS,
    testAllDNS
  } = useBoosterStore()

  useEffect(() => {
    fetchDNS()
  }, [])

  const primaryInterface = dnsConfigs.length > 0 ? dnsConfigs[0] : null

  return (
    <div className="space-y-6">
      {/* Current DNS Card */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">Current DNS Configuration</h3>
              <p className="text-xs text-white/40">
                {primaryInterface ? primaryInterface.interfaceAlias : 'Loading...'}
              </p>
            </div>
          </div>
          {isLoadingDNS && <Loader2 className="w-4 h-4 text-white/40 animate-spin" />}
        </div>

        {primaryInterface ? (
          <div className="flex flex-wrap gap-2">
            {primaryInterface.serverAddresses.map((addr, i) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white font-mono"
              >
                {addr}
              </span>
            ))}
          </div>
        ) : (
          !isLoadingDNS && (
            <p className="text-sm text-white/30">No DNS configuration detected.</p>
          )
        )}
      </div>

      {/* DNS Preset Grid */}
      <div>
        <h3 className="text-sm font-medium text-white/60 mb-3">DNS Presets</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {DNS_PRESETS.map((preset) => {
            const isActive = selectedDNSPreset === preset.name
            const gradient = PRESET_GRADIENTS[preset.name] || 'from-gray-500 to-gray-400'

            return (
              <motion.div
                key={preset.name}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`glass rounded-xl p-4 cursor-pointer transition-all ${
                  isActive
                    ? 'border-white/20 ring-1 ring-white/10'
                    : 'hover:border-white/15'
                }`}
                onClick={() => {
                  if (primaryInterface && !isApplyingDNS) {
                    applyDNS(
                      primaryInterface.interfaceIndex,
                      preset.primary,
                      preset.secondary,
                      preset.name
                    )
                  }
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}
                  >
                    {PRESET_ICONS[preset.icon]}
                  </div>
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"
                    >
                      <Check className="w-3 h-3 text-white" />
                    </motion.div>
                  )}
                </div>
                <h4 className="text-sm font-medium text-white mb-1">{preset.name}</h4>
                <p className="text-xs text-white/40 font-mono">{preset.primary}</p>
                <p className="text-xs text-white/30 font-mono">{preset.secondary}</p>

                {isApplyingDNS && isActive && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 text-white/40 animate-spin" />
                    <span className="text-xs text-white/40">Applying...</span>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Latency Test */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-400 flex items-center justify-center text-white">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">Latency Test</h3>
              <p className="text-xs text-white/40">Ping each DNS server and compare response times</p>
            </div>
          </div>
          <button
            onClick={testAllDNS}
            disabled={isTestingDNS}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-400 text-sm text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
          >
            {isTestingDNS ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Activity className="w-4 h-4" />
            )}
            {isTestingDNS ? 'Testing...' : 'Test All'}
          </button>
        </div>

        <AnimatePresence>
          {dnsLatencyResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={dnsLatencyResults.map((r) => ({
                    name: r.name,
                    latency: r.latency < 0 ? 0 : r.latency,
                    failed: r.latency < 0
                  }))}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                >
                  <XAxis
                    type="number"
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    unit="ms"
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15,15,30,0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '12px'
                    }}
                    formatter={(value: number, _name: string, props: any) => [
                      props.payload.failed ? 'Failed' : `${value}ms`,
                      'Latency'
                    ]}
                  />
                  <Bar dataKey="latency" radius={[0, 4, 4, 0]} barSize={20}>
                    {dnsLatencyResults.map((entry, index) => (
                      <Cell key={index} fill={getLatencyColor(entry.latency)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-2 justify-center">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="text-xs text-white/40">&lt; 30ms</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  <span className="text-xs text-white/40">&lt; 60ms</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-xs text-white/40">&gt; 60ms</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {dnsLatencyResults.length === 0 && !isTestingDNS && (
          <p className="text-sm text-white/30 text-center py-4">
            Click "Test All" to measure DNS latency.
          </p>
        )}
      </div>
    </div>
  )
}

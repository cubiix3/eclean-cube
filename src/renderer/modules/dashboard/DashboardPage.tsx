import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useDashboardStore } from '@/stores/dashboardStore'
import HealthScore from './HealthScore'
import SystemOverview from './SystemOverview'
import QuickActions from './QuickActions'
import GamingMode from './GamingMode'
import LiveCharts from './LiveCharts'
import RecentActivity from './RecentActivity'
import SmartRecommendations from './SmartRecommendations'

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' }
  })
}

export default function DashboardPage() {
  const { overview, sensorHistory, healthScore, isLoading, fetchOverview, addSensorData } =
    useDashboardStore()

  // Send health score to tray whenever it changes
  useEffect(() => {
    if (healthScore > 0) {
      window.api.tray.updateHealthScore(healthScore)
    }
  }, [healthScore])

  useEffect(() => {
    fetchOverview()
    const refreshInterval = setInterval(fetchOverview, 30000)
    window.api.system.startSensorStream()
    window.api.system.onSensorData((data) => {
      addSensorData(data)
    })
    return () => {
      clearInterval(refreshInterval)
      window.api.system.stopSensorStream()
      window.api.system.removeSensorListener()
    }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gradient">Dashboard</h1>
        <p className="text-sm text-white/40 mt-1">Your system at a glance</p>
      </div>
      <div className="grid grid-cols-12 gap-6">
        <motion.div className="col-span-4" custom={0} initial="hidden" animate="visible" variants={cardVariants}>
          <HealthScore score={healthScore} isLoading={isLoading} />
        </motion.div>
        <motion.div className="col-span-8 space-y-6" custom={1} initial="hidden" animate="visible" variants={cardVariants}>
          <QuickActions />
          <GamingMode />
          <SystemOverview data={overview} isLoading={isLoading} />
        </motion.div>
      </div>
      <div className="grid grid-cols-12 gap-6">
        <motion.div className="col-span-7" custom={2} initial="hidden" animate="visible" variants={cardVariants}>
          <LiveCharts data={sensorHistory} />
        </motion.div>
        <motion.div className="col-span-5" custom={3} initial="hidden" animate="visible" variants={cardVariants}>
          <RecentActivity />
        </motion.div>
      </div>
      <motion.div custom={4} initial="hidden" animate="visible" variants={cardVariants}>
        <SmartRecommendations />
      </motion.div>
    </div>
  )
}

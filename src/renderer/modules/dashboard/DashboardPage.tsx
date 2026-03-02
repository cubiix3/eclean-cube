import { useEffect } from 'react'
import { useDashboardStore } from '@/stores/dashboardStore'
import HealthScore from './HealthScore'
import SystemOverview from './SystemOverview'
import QuickActions from './QuickActions'
import LiveCharts from './LiveCharts'
import RecentActivity from './RecentActivity'

export default function DashboardPage() {
  const { overview, sensorHistory, healthScore, isLoading, fetchOverview, addSensorData } =
    useDashboardStore()

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
    }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-white/40 mt-1">Your system at a glance</p>
      </div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4">
          <HealthScore score={healthScore} isLoading={isLoading} />
        </div>
        <div className="col-span-8 space-y-6">
          <QuickActions />
          <SystemOverview data={overview} isLoading={isLoading} />
        </div>
      </div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-7">
          <LiveCharts data={sensorHistory} />
        </div>
        <div className="col-span-5">
          <RecentActivity />
        </div>
      </div>
    </div>
  )
}

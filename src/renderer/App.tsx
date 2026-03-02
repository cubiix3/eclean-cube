import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Titlebar from './components/Titlebar'
import Sidebar from './components/Sidebar'
import ParticleBackground from './components/ParticleBackground'
import PageTransition from './components/PageTransition'
import ToastContainer from './components/ToastContainer'
import ErrorBoundary from './components/ErrorBoundary'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useToastStore } from './stores/toastStore'
import { useSettingsStore } from './stores/settingsStore'

const DashboardPage = lazy(() => import('./modules/dashboard/DashboardPage'))
const HardwarePage = lazy(() => import('./modules/hardware/HardwarePage'))
const CleanerPage = lazy(() => import('./modules/cleaner/CleanerPage'))
const BoosterPage = lazy(() => import('./modules/booster/BoosterPage'))
const OptimizerPage = lazy(() => import('./modules/optimizer/OptimizerPage'))
const UninstallerPage = lazy(() => import('./modules/uninstaller/UninstallerPage'))
const ProcessPage = lazy(() => import('./modules/process/ProcessPage'))
const BenchmarkPage = lazy(() => import('./modules/benchmark/BenchmarkPage'))
const SettingsPage = lazy(() => import('./modules/settings/SettingsPage'))
const RegistryCleanerPage = lazy(() => import('./modules/registry/RegistryCleanerPage'))
const DiskMaintenancePage = lazy(() => import('./modules/disk/DiskMaintenancePage'))
const FileMonitorPage = lazy(() => import('./modules/monitor/FileMonitorPage'))
const LogViewerPage = lazy(() => import('./modules/logs/LogViewerPage'))
const DiskTreePage = lazy(() => import('./modules/tools/DiskTreePage'))
const SpeedTestPage = lazy(() => import('./modules/tools/SpeedTestPage'))
const ContextMenuPage = lazy(() => import('./modules/tools/ContextMenuPage'))
const RestorePointPage = lazy(() => import('./modules/tools/RestorePointPage'))
const DriversPage = lazy(() => import('./modules/tools/DriversPage'))
const HostsEditorPage = lazy(() => import('./modules/tools/HostsEditorPage'))
const PowerPlanPage = lazy(() => import('./modules/tools/PowerPlanPage'))
const BatchRenamePage = lazy(() => import('./modules/tools/BatchRenamePage'))
const UpdatesPage = lazy(() => import('./modules/tools/UpdatesPage'))
const StartupAnalyzerPage = lazy(() => import('./modules/tools/StartupAnalyzerPage'))
const MiniWidget = lazy(() => import('./modules/widget/MiniWidget'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
    </div>
  )
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '59, 130, 246'
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
}

function MainLayout() {
  useKeyboardShortcuts()
  const addToast = useToastStore((s) => s.addToast)
  const accentColor = useSettingsStore((s) => s.settings.appearance.accentColor)
  const theme = useSettingsStore((s) => s.settings.appearance.theme)
  const fetchSettings = useSettingsStore((s) => s.fetchSettings)

  // Load settings on mount
  useEffect(() => {
    fetchSettings()
  }, [])

  // Apply accent color and theme as CSS custom properties
  useEffect(() => {
    document.documentElement.style.setProperty('--accent-color', accentColor)
    document.documentElement.style.setProperty('--accent-rgb', hexToRgb(accentColor))
  }, [accentColor])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme || 'dark')
  }, [theme])

  useEffect(() => {
    window.api.auto.onCleanResult((data) => {
      addToast({
        type: 'success',
        title: 'Auto-cleanup complete',
        message: `${data.cleaned} items cleaned on startup`
      })
    })
    window.api.auto.onOptimizeResult((data) => {
      addToast({
        type: 'success',
        title: 'Auto-optimization complete',
        message: `${data.applied} tweaks applied on startup`
      })
    })
  }, [])

  return (
    <div className="flex h-screen w-screen" style={{ background: 'var(--bg-primary, #0a0a0f)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Titlebar />
        <main className="flex-1 overflow-auto p-6 relative">
          <ParticleBackground />
          <div className="relative z-10">
            <Suspense fallback={<PageLoader />}>
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/" element={<PageTransition><ErrorBoundary><DashboardPage /></ErrorBoundary></PageTransition>} />
                  <Route path="/optimizer" element={<PageTransition><ErrorBoundary><OptimizerPage /></ErrorBoundary></PageTransition>} />
                  <Route path="/cleaner" element={<PageTransition><ErrorBoundary><CleanerPage /></ErrorBoundary></PageTransition>} />
                  <Route path="/hardware" element={<PageTransition><ErrorBoundary><HardwarePage /></ErrorBoundary></PageTransition>} />
                  <Route path="/booster" element={<PageTransition><ErrorBoundary><BoosterPage /></ErrorBoundary></PageTransition>} />
                  <Route path="/uninstaller" element={<PageTransition><ErrorBoundary><UninstallerPage /></ErrorBoundary></PageTransition>} />
                  <Route path="/process" element={<PageTransition><ErrorBoundary><ProcessPage /></ErrorBoundary></PageTransition>} />
                  <Route path="/benchmark" element={<PageTransition><ErrorBoundary><BenchmarkPage /></ErrorBoundary></PageTransition>} />
                  <Route path="/settings" element={<PageTransition><ErrorBoundary><SettingsPage /></ErrorBoundary></PageTransition>} />
                  <Route path="/registry" element={<PageTransition><ErrorBoundary><RegistryCleanerPage /></ErrorBoundary></PageTransition>} />
                  <Route path="/disk" element={<PageTransition><ErrorBoundary><DiskMaintenancePage /></ErrorBoundary></PageTransition>} />
                  <Route path="/monitor" element={<PageTransition><ErrorBoundary><FileMonitorPage /></ErrorBoundary></PageTransition>} />
                  <Route path="/logs" element={<PageTransition><ErrorBoundary><LogViewerPage /></ErrorBoundary></PageTransition>} />
                  <Route path="/treemap" element={<PageTransition><ErrorBoundary><DiskTreePage /></ErrorBoundary></PageTransition>} />
                  <Route path="/speedtest" element={<PageTransition><ErrorBoundary><SpeedTestPage /></ErrorBoundary></PageTransition>} />
                  <Route path="/contextmenu" element={<PageTransition><ErrorBoundary><ContextMenuPage /></ErrorBoundary></PageTransition>} />
                  <Route path="/restore" element={<PageTransition><ErrorBoundary><RestorePointPage /></ErrorBoundary></PageTransition>} />
                  <Route path="/drivers" element={<PageTransition><ErrorBoundary><DriversPage /></ErrorBoundary></PageTransition>} />
                  <Route path="/hosts" element={<PageTransition><ErrorBoundary><HostsEditorPage /></ErrorBoundary></PageTransition>} />
                  <Route path="/power" element={<PageTransition><ErrorBoundary><PowerPlanPage /></ErrorBoundary></PageTransition>} />
                  <Route path="/rename" element={<PageTransition><ErrorBoundary><BatchRenamePage /></ErrorBoundary></PageTransition>} />
                  <Route path="/updates" element={<PageTransition><ErrorBoundary><UpdatesPage /></ErrorBoundary></PageTransition>} />
                  <Route path="/startupanalyzer" element={<PageTransition><ErrorBoundary><StartupAnalyzerPage /></ErrorBoundary></PageTransition>} />
                </Routes>
              </AnimatePresence>
            </Suspense>
          </div>
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}

function WidgetLayout() {
  return (
    <div className="w-screen h-screen">
      <Suspense fallback={null}>
        <MiniWidget />
      </Suspense>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/widget" element={<WidgetLayout />} />
        <Route path="/*" element={<MainLayout />} />
      </Routes>
    </HashRouter>
  )
}

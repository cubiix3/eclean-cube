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

const DashboardPage = lazy(() => import('./modules/dashboard/DashboardPage'))
const HardwarePage = lazy(() => import('./modules/hardware/HardwarePage'))
const CleanerPage = lazy(() => import('./modules/cleaner/CleanerPage'))
const BoosterPage = lazy(() => import('./modules/booster/BoosterPage'))
const OptimizerPage = lazy(() => import('./modules/optimizer/OptimizerPage'))
const UninstallerPage = lazy(() => import('./modules/uninstaller/UninstallerPage'))
const ProcessPage = lazy(() => import('./modules/process/ProcessPage'))
const BenchmarkPage = lazy(() => import('./modules/benchmark/BenchmarkPage'))
const SettingsPage = lazy(() => import('./modules/settings/SettingsPage'))
const MiniWidget = lazy(() => import('./modules/widget/MiniWidget'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
    </div>
  )
}

function MainLayout() {
  useKeyboardShortcuts()
  const addToast = useToastStore((s) => s.addToast)

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
    <div className="flex h-screen w-screen bg-[#0a0a0f]">
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

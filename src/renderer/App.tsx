import { HashRouter, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Titlebar from './components/Titlebar'
import Sidebar from './components/Sidebar'
import PageTransition from './components/PageTransition'

// Placeholder pages
function OptimizerPage() {
  return <PageTransition><div className="text-white text-xl">Optimizer</div></PageTransition>
}
function CleanerPage() {
  return <PageTransition><div className="text-white text-xl">Cleaner</div></PageTransition>
}
function HardwarePage() {
  return <PageTransition><div className="text-white text-xl">Your PC</div></PageTransition>
}
function BoosterPage() {
  return <PageTransition><div className="text-white text-xl">Booster</div></PageTransition>
}
function UninstallerPage() {
  return <PageTransition><div className="text-white text-xl">Uninstaller</div></PageTransition>
}
function DashboardPage() {
  return <PageTransition><div className="text-white text-xl">Dashboard - Coming Soon</div></PageTransition>
}

export default function App() {
  return (
    <HashRouter>
      <div className="flex h-screen w-screen bg-[#0a0a0f]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Titlebar />
          <main className="flex-1 overflow-auto p-6">
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/optimizer" element={<OptimizerPage />} />
                <Route path="/cleaner" element={<CleanerPage />} />
                <Route path="/hardware" element={<HardwarePage />} />
                <Route path="/booster" element={<BoosterPage />} />
                <Route path="/uninstaller" element={<UninstallerPage />} />
              </Routes>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </HashRouter>
  )
}

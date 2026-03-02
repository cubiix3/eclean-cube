import { HashRouter, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Titlebar from './components/Titlebar'
import Sidebar from './components/Sidebar'
import PageTransition from './components/PageTransition'
import DashboardPage from './modules/dashboard/DashboardPage'
import HardwarePage from './modules/hardware/HardwarePage'
import CleanerPage from './modules/cleaner/CleanerPage'
import BoosterPage from './modules/booster/BoosterPage'

// Placeholder pages
function OptimizerPage() {
  return <PageTransition><div className="text-white text-xl">Optimizer</div></PageTransition>
}
function UninstallerPage() {
  return <PageTransition><div className="text-white text-xl">Uninstaller</div></PageTransition>
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
                <Route path="/" element={<PageTransition><DashboardPage /></PageTransition>} />
                <Route path="/optimizer" element={<OptimizerPage />} />
                <Route path="/cleaner" element={<PageTransition><CleanerPage /></PageTransition>} />
                <Route path="/hardware" element={<PageTransition><HardwarePage /></PageTransition>} />
                <Route path="/booster" element={<PageTransition><BoosterPage /></PageTransition>} />
                <Route path="/uninstaller" element={<UninstallerPage />} />
              </Routes>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </HashRouter>
  )
}

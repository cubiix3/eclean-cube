import {
  LayoutDashboard,
  Sliders,
  Trash2,
  Cpu,
  Rocket,
  PackageX,
  type LucideIcon
} from 'lucide-react'
import { useNavigationStore, type ModuleId } from '@/stores/navigationStore'
import { useNavigate } from 'react-router-dom'

interface NavItem {
  id: ModuleId
  icon: LucideIcon
  label: string
  path: string
}

const navItems: NavItem[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { id: 'optimizer', icon: Sliders, label: 'Optimizer', path: '/optimizer' },
  { id: 'cleaner', icon: Trash2, label: 'Cleaner', path: '/cleaner' },
  { id: 'hardware', icon: Cpu, label: 'Your PC', path: '/hardware' },
  { id: 'booster', icon: Rocket, label: 'Booster', path: '/booster' },
  { id: 'uninstaller', icon: PackageX, label: 'Uninstaller', path: '/uninstaller' }
]

export default function Sidebar() {
  const { activeModule, setActiveModule } = useNavigationStore()
  const navigate = useNavigate()

  const handleNav = (item: NavItem) => {
    setActiveModule(item.id)
    navigate(item.path)
  }

  return (
    <div className="w-[70px] h-full bg-[#16161f] flex flex-col items-center py-4 border-r border-white/5">
      {/* Logo */}
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mb-8">
        <span className="text-white font-bold text-sm">e</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-1">
        {navItems.map((item) => {
          const isActive = activeModule === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item)}
              className={`
                relative w-12 h-12 rounded-xl flex items-center justify-center
                transition-all duration-200 group
                ${isActive
                  ? 'bg-gradient-to-br from-blue-500/20 to-cyan-400/20 text-blue-400'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }
              `}
              title={item.label}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-gradient-to-b from-blue-500 to-cyan-400 rounded-r-full" />
              )}
              <Icon size={20} />

              {/* Tooltip */}
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#1e1e2e] text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-white/10">
                {item.label}
              </div>
            </button>
          )
        })}
      </nav>

      {/* Version */}
      <div className="text-[10px] text-white/20 mt-4">v1.0.0</div>
    </div>
  )
}

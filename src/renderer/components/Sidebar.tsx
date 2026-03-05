import {
  LayoutDashboard,
  Sliders,
  Trash2,
  Cpu,
  Rocket,
  PackageX,
  Activity,
  Gauge,
  Settings,
  Database,
  HardDrive,
  Eye,
  FileText,
  PieChart,
  Wifi,
  MousePointer2,
  Shield,
  CircuitBoard,
  Globe,
  Zap,
  FileEdit,
  Download,
  Timer,
  type LucideIcon
} from 'lucide-react'
import { useNavigationStore, type ModuleId } from '@/stores/navigationStore'
import { useSettingsStore } from '@/stores/settingsStore'
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
  { id: 'uninstaller', icon: PackageX, label: 'Uninstaller', path: '/uninstaller' },
  { id: 'process', icon: Activity, label: 'Processes', path: '/process' },
  { id: 'benchmark', icon: Gauge, label: 'Benchmark', path: '/benchmark' },
  { id: 'registry', icon: Database, label: 'Registry', path: '/registry' },
  { id: 'disk', icon: HardDrive, label: 'Disk Tools', path: '/disk' },
  { id: 'treemap', icon: PieChart, label: 'Disk Map', path: '/treemap' },
  { id: 'speedtest', icon: Wifi, label: 'Speed Test', path: '/speedtest' },
  { id: 'contextmenu', icon: MousePointer2, label: 'Context Menu', path: '/contextmenu' },
  { id: 'restore', icon: Shield, label: 'Restore Points', path: '/restore' },
  { id: 'drivers', icon: CircuitBoard, label: 'Drivers', path: '/drivers' },
  { id: 'hosts', icon: Globe, label: 'Hosts Editor', path: '/hosts' },
  { id: 'power', icon: Zap, label: 'Power Plans', path: '/power' },
  { id: 'rename', icon: FileEdit, label: 'Batch Rename', path: '/rename' },
  { id: 'updates', icon: Download, label: 'Updates', path: '/updates' },
  { id: 'startupanalyzer', icon: Timer, label: 'Boot Analyzer', path: '/startupanalyzer' },
  { id: 'monitor', icon: Eye, label: 'File Monitor', path: '/monitor' },
  { id: 'logs', icon: FileText, label: 'Logs', path: '/logs' }
]

const settingsItem: NavItem = {
  id: 'settings',
  icon: Settings,
  label: 'Settings',
  path: '/settings'
}

const sections = [
  { label: null, items: navItems.slice(0, 1) },
  { label: 'Tools', items: navItems.slice(1, 6) },
  { label: 'Monitor', items: navItems.slice(6, 8) },
  { label: 'System', items: navItems.slice(8) },
]

export default function Sidebar() {
  const { activeModule, setActiveModule } = useNavigationStore()
  const accentColor = useSettingsStore((s) => s.settings.appearance.accentColor)
  const navigate = useNavigate()

  const handleNav = (item: NavItem) => {
    setActiveModule(item.id)
    navigate(item.path)
  }

  const renderNavButton = (item: NavItem) => {
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
            ? ''
            : 'text-white/40 hover:text-white/70 hover:bg-white/5'
          }
        `}
        style={isActive ? {
          background: `${accentColor}20`,
          color: accentColor,
          boxShadow: `0 0 12px ${accentColor}15`
        } : undefined}
        title={item.label}
      >
        {isActive && (
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
            style={{ background: accentColor }}
          />
        )}
        <Icon size={20} />

        {/* Tooltip */}
        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#1e1e2e] text-white text-xs rounded-lg
          opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100
          pointer-events-none transition-all duration-200 whitespace-nowrap z-50
          border border-white/10 shadow-lg shadow-black/20">
          {item.label}
        </div>
      </button>
    )
  }

  return (
    <div className="w-[70px] h-full bg-[#16161f] flex flex-col items-center py-4 border-r border-white/5">
      {/* Logo */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-6"
        style={{
          background: `linear-gradient(135deg, ${accentColor}, #06b6d4)`,
          boxShadow: `0 0 12px ${accentColor}30`
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-0.5 overflow-y-auto overflow-x-hidden py-1">
        {sections.map((section, si) => (
          <div key={si} className="w-full flex flex-col items-center">
            {section.label && (
              <div className="text-[9px] text-white/15 uppercase tracking-widest mb-1 mt-3 first:mt-0">
                {section.label}
              </div>
            )}
            {section.items.map(renderNavButton)}
          </div>
        ))}
      </nav>

      {/* Settings (separated at bottom) */}
      <div className="flex flex-col items-center gap-3 mt-4 pt-4 border-t border-white/5">
        {renderNavButton(settingsItem)}

        {/* Version */}
        <div className="text-[10px] text-white/20">v1.0.0</div>
      </div>
    </div>
  )
}

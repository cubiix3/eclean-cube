import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNavigationStore } from '@/stores/navigationStore'
import type { ModuleId } from '@/stores/navigationStore'

interface ShortcutRoute {
  key: string
  module: ModuleId
  path: string
}

const routes: ShortcutRoute[] = [
  { key: '1', module: 'dashboard', path: '/' },
  { key: '2', module: 'optimizer', path: '/optimizer' },
  { key: '3', module: 'cleaner', path: '/cleaner' },
  { key: '4', module: 'hardware', path: '/hardware' },
  { key: '5', module: 'booster', path: '/booster' },
  { key: '6', module: 'uninstaller', path: '/uninstaller' },
  { key: '7', module: 'process', path: '/process' },
  { key: '8', module: 'benchmark', path: '/benchmark' },
  { key: '9', module: 'settings', path: '/settings' }
]

export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const setActiveModule = useNavigationStore((s) => s.setActiveModule)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+1-9 for module navigation
      if (e.ctrlKey && !e.shiftKey && !e.altKey) {
        const route = routes.find((r) => r.key === e.key)
        if (route) {
          e.preventDefault()
          setActiveModule(route.module)
          navigate(route.path)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate, setActiveModule])
}

export { routes as shortcutRoutes }

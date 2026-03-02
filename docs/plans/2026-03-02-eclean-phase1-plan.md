# eclean Phase 1: App Shell + Dashboard — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a working Electron + React app with frameless dark-themed window, icon sidebar navigation, and a fully functional Dashboard with health score, system overview, live charts, quick actions, and recent activity.

**Architecture:** Electron main process handles system data via PowerShell/WMI and exposes it over IPC. React renderer with Zustand stores consumes data and renders the UI. electron-vite bundles everything with hot reload.

**Tech Stack:** Electron, React 18, TypeScript, electron-vite, Zustand, Tailwind CSS, recharts, framer-motion, react-router-dom

**Design Reference:** `docs/plans/2026-03-02-eclean-design.md`

---

### Task 1: Initialize Electron + React Project with electron-vite

**Files:**
- Create: `package.json`
- Create: `electron.vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tsconfig.web.json`

**Step 1: Initialize npm project and install core dependencies**

Run:
```bash
cd /c/Users/Maxi/Desktop/CleanProjekt
npm init -y
npm install electron electron-vite react react-dom react-router-dom zustand recharts framer-motion lucide-react
npm install -D typescript @types/react @types/react-dom tailwindcss @tailwindcss/vite postcss autoprefixer vite
```

**Step 2: Create electron-vite config**

Create `electron.vite.config.ts`:
```ts
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
```

Note: If `@vitejs/plugin-react` is not installed, install it:
```bash
npm install -D @vitejs/plugin-react
```

**Step 3: Create TypeScript configs**

Create `tsconfig.json`:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.web.json" }
  ]
}
```

Create `tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ESNext",
    "outDir": "./out",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["electron-vite/node"]
  },
  "include": ["src/main/**/*", "src/preload/**/*", "electron.vite.config.ts"]
}
```

Create `tsconfig.web.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ESNext",
    "jsx": "react-jsx",
    "outDir": "./out",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/renderer/*"]
    },
    "types": ["electron-vite/client"]
  },
  "include": ["src/renderer/**/*"]
}
```

**Step 4: Add scripts to package.json**

Update `package.json` — set `"main": "./out/main/index.js"` and add scripts:
```json
{
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview"
  }
}
```

**Step 5: Commit**

```bash
git init
git add package.json package-lock.json electron.vite.config.ts tsconfig.json tsconfig.node.json tsconfig.web.json docs/
git commit -m "chore: initialize electron-vite project with React, TypeScript, Tailwind"
```

---

### Task 2: Create Electron Main Process (Frameless Window)

**Files:**
- Create: `src/main/index.ts`
- Create: `src/preload/index.ts`

**Step 1: Create the main process entry**

Create `src/main/index.ts`:
```ts
import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0a0a0f',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Window control IPC handlers
ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.on('window:close', () => mainWindow?.close())
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized())

app.whenReady().then(() => {
  createWindow()
})

app.on('window-all-closed', () => {
  app.quit()
})
```

Note: Install `@electron-toolkit/utils`:
```bash
npm install @electron-toolkit/utils
```

**Step 2: Create preload script**

Create `src/preload/index.ts`:
```ts
import { contextBridge, ipcRenderer } from 'electron'

const api = {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximizeChange: (callback: (maximized: boolean) => void) => {
      ipcRenderer.on('window:maximized', () => callback(true))
      ipcRenderer.on('window:unmaximized', () => callback(false))
    }
  }
}

contextBridge.exposeInMainWorld('api', api)
```

**Step 3: Create type declaration for preload API**

Create `src/shared/types.d.ts`:
```ts
interface WindowAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  onMaximizeChange: (callback: (maximized: boolean) => void) => void
}

interface ElectronAPI {
  window: WindowAPI
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}

export {}
```

**Step 4: Commit**

```bash
git add src/main/ src/preload/ src/shared/
git commit -m "feat: create Electron main process with frameless window and IPC"
```

---

### Task 3: Create React Renderer Entry + Tailwind Setup

**Files:**
- Create: `src/renderer/index.html`
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/App.tsx`
- Create: `src/renderer/styles/globals.css`

**Step 1: Create HTML entry point**

Create `src/renderer/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>eclean</title>
  </head>
  <body class="bg-[#0a0a0f] text-white overflow-hidden">
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

**Step 2: Create global styles with Tailwind**

Create `src/renderer/styles/globals.css`:
```css
@import "tailwindcss";

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Glassmorphism utility */
.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.glass-hover:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.12);
}

/* Disable text selection on UI elements */
.no-drag {
  -webkit-app-region: no-drag;
}
```

**Step 3: Create React entry**

Create `src/renderer/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

**Step 4: Create App shell placeholder**

Create `src/renderer/App.tsx`:
```tsx
import { HashRouter } from 'react-router-dom'

export default function App() {
  return (
    <HashRouter>
      <div className="flex h-screen w-screen">
        <div className="w-[70px] bg-[#16161f] flex-shrink-0">
          {/* Sidebar placeholder */}
        </div>
        <div className="flex-1 flex flex-col">
          <div className="h-10 bg-[#0a0a0f]">
            {/* Titlebar placeholder */}
          </div>
          <div className="flex-1 overflow-auto p-6">
            <h1 className="text-2xl font-bold text-white">eclean is running!</h1>
          </div>
        </div>
      </div>
    </HashRouter>
  )
}
```

**Step 5: Test that the app starts**

Run:
```bash
npm run dev
```
Expected: Electron window opens with dark background and "eclean is running!" text.

**Step 6: Commit**

```bash
git add src/renderer/
git commit -m "feat: create React renderer with Tailwind CSS and app shell placeholder"
```

---

### Task 4: Build Custom Titlebar Component

**Files:**
- Create: `src/renderer/components/Titlebar.tsx`
- Modify: `src/renderer/App.tsx`

**Step 1: Create Titlebar component**

Create `src/renderer/components/Titlebar.tsx`:
```tsx
import { useState, useEffect } from 'react'
import { Minus, Square, X, Copy } from 'lucide-react'

export default function Titlebar() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.api.window.isMaximized().then(setIsMaximized)
    window.api.window.onMaximizeChange(setIsMaximized)
  }, [])

  return (
    <div
      className="h-10 flex items-center justify-between bg-[#0a0a0f] select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* App title */}
      <div className="pl-4 text-xs text-white/40 font-medium tracking-wider uppercase">
        eclean
      </div>

      {/* Window controls */}
      <div
        className="flex h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => window.api.window.minimize()}
          className="w-12 h-full flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <Minus size={14} className="text-white/60" />
        </button>
        <button
          onClick={() => window.api.window.maximize()}
          className="w-12 h-full flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          {isMaximized ? (
            <Copy size={12} className="text-white/60" />
          ) : (
            <Square size={12} className="text-white/60" />
          )}
        </button>
        <button
          onClick={() => window.api.window.close()}
          className="w-12 h-full flex items-center justify-center hover:bg-red-500/80 transition-colors"
        >
          <X size={14} className="text-white/60" />
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Wire Titlebar into App.tsx**

Replace the titlebar placeholder in `src/renderer/App.tsx` with the Titlebar component import and usage.

**Step 3: Test**

Run `npm run dev`. Verify: custom titlebar with working minimize/maximize/close buttons, draggable title area, close button turns red on hover.

**Step 4: Commit**

```bash
git add src/renderer/components/Titlebar.tsx src/renderer/App.tsx
git commit -m "feat: add custom frameless titlebar with window controls"
```

---

### Task 5: Build Sidebar Navigation

**Files:**
- Create: `src/renderer/components/Sidebar.tsx`
- Create: `src/renderer/stores/navigationStore.ts`
- Modify: `src/renderer/App.tsx`

**Step 1: Create navigation store**

Create `src/renderer/stores/navigationStore.ts`:
```ts
import { create } from 'zustand'

export type ModuleId = 'dashboard' | 'optimizer' | 'cleaner' | 'hardware' | 'booster' | 'uninstaller'

interface NavigationState {
  activeModule: ModuleId
  setActiveModule: (module: ModuleId) => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeModule: 'dashboard',
  setActiveModule: (module) => set({ activeModule: module })
}))
```

**Step 2: Create Sidebar component**

Create `src/renderer/components/Sidebar.tsx`:
```tsx
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
import { useNavigate, useLocation } from 'react-router-dom'

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
```

**Step 3: Update App.tsx with Sidebar and Routes**

Replace `src/renderer/App.tsx`:
```tsx
import { HashRouter, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Titlebar from './components/Titlebar'
import Sidebar from './components/Sidebar'

// Placeholder pages
function DashboardPage() {
  return <div className="text-white text-xl">Dashboard</div>
}
function OptimizerPage() {
  return <div className="text-white text-xl">Optimizer</div>
}
function CleanerPage() {
  return <div className="text-white text-xl">Cleaner</div>
}
function HardwarePage() {
  return <div className="text-white text-xl">Your PC</div>
}
function BoosterPage() {
  return <div className="text-white text-xl">Booster</div>
}
function UninstallerPage() {
  return <div className="text-white text-xl">Uninstaller</div>
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
```

**Step 4: Test**

Run `npm run dev`. Verify: sidebar icons visible, clicking navigates between pages, active indicator shows, tooltips appear on hover.

**Step 5: Commit**

```bash
git add src/renderer/
git commit -m "feat: add sidebar navigation with Zustand store and route setup"
```

---

### Task 6: Create Page Transition Wrapper

**Files:**
- Create: `src/renderer/components/PageTransition.tsx`
- Modify: `src/renderer/App.tsx`

**Step 1: Create PageTransition component**

Create `src/renderer/components/PageTransition.tsx`:
```tsx
import { motion } from 'framer-motion'

interface Props {
  children: React.ReactNode
}

export default function PageTransition({ children }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="h-full"
    >
      {children}
    </motion.div>
  )
}
```

**Step 2: Wrap each route page with PageTransition in App.tsx**

Each route element becomes e.g. `<PageTransition><DashboardPage /></PageTransition>`.

**Step 3: Test**

Run `npm run dev`. Verify smooth fade+slide transitions between pages.

**Step 4: Commit**

```bash
git add src/renderer/components/PageTransition.tsx src/renderer/App.tsx
git commit -m "feat: add page transition animations with framer-motion"
```

---

### Task 7: PowerShell Service Layer for System Data

**Files:**
- Create: `src/main/services/powershell.ts`
- Create: `src/main/services/systemInfo.ts`
- Create: `src/main/ipc/system.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/shared/types.d.ts`

**Step 1: Create PowerShell executor service**

Create `src/main/services/powershell.ts`:
```ts
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function runPowerShell(command: string): Promise<string> {
  const { stdout } = await execAsync(
    `powershell -NoProfile -NonInteractive -Command "${command.replace(/"/g, '\\"')}"`,
    { maxBuffer: 10 * 1024 * 1024 }
  )
  return stdout.trim()
}

export async function runPowerShellJSON<T>(command: string): Promise<T> {
  const result = await runPowerShell(`${command} | ConvertTo-Json -Depth 5`)
  return JSON.parse(result)
}
```

**Step 2: Create system info service**

Create `src/main/services/systemInfo.ts`:
```ts
import { runPowerShell, runPowerShellJSON } from './powershell'

export interface SystemOverview {
  cpu: { name: string; usage: number; temp: number | null }
  ram: { total: number; used: number; percent: number }
  gpu: { name: string; usage: number | null; temp: number | null }
  disk: { total: number; used: number; percent: number }
}

export async function getSystemOverview(): Promise<SystemOverview> {
  const [cpu, ram, disk, gpuName] = await Promise.all([
    getCpuInfo(),
    getRamInfo(),
    getDiskInfo(),
    getGpuName()
  ])
  return { cpu, ram, gpu: { name: gpuName, usage: null, temp: null }, disk }
}

async function getCpuInfo() {
  const name = await runPowerShell(
    "(Get-CimInstance Win32_Processor).Name"
  )
  const usage = await runPowerShell(
    "(Get-CimInstance Win32_Processor).LoadPercentage"
  )
  return {
    name: name || 'Unknown CPU',
    usage: parseInt(usage) || 0,
    temp: null
  }
}

async function getRamInfo() {
  const result = await runPowerShellJSON<{ TotalVisibleMemorySize: number; FreePhysicalMemory: number }>(
    "Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize, FreePhysicalMemory"
  )
  const totalGB = result.TotalVisibleMemorySize / 1024 / 1024
  const freeGB = result.FreePhysicalMemory / 1024 / 1024
  const usedGB = totalGB - freeGB
  return {
    total: Math.round(totalGB * 10) / 10,
    used: Math.round(usedGB * 10) / 10,
    percent: Math.round((usedGB / totalGB) * 100)
  }
}

async function getDiskInfo() {
  const result = await runPowerShellJSON<{ Size: number; FreeSpace: number } | Array<{ Size: number; FreeSpace: number }>>(
    "Get-CimInstance Win32_LogicalDisk -Filter \\\"DriveType=3\\\" | Select-Object Size, FreeSpace"
  )
  const disks = Array.isArray(result) ? result : [result]
  const totalGB = disks.reduce((s, d) => s + (d.Size || 0), 0) / 1024 / 1024 / 1024
  const freeGB = disks.reduce((s, d) => s + (d.FreeSpace || 0), 0) / 1024 / 1024 / 1024
  const usedGB = totalGB - freeGB
  return {
    total: Math.round(totalGB),
    used: Math.round(usedGB),
    percent: Math.round((usedGB / totalGB) * 100)
  }
}

async function getGpuName(): Promise<string> {
  const name = await runPowerShell(
    "(Get-CimInstance Win32_VideoController).Name"
  )
  return name || 'Unknown GPU'
}

export async function getCpuUsage(): Promise<number> {
  const usage = await runPowerShell(
    "(Get-CimInstance Win32_Processor).LoadPercentage"
  )
  return parseInt(usage) || 0
}

export async function getRamUsage(): Promise<number> {
  const result = await runPowerShellJSON<{ TotalVisibleMemorySize: number; FreePhysicalMemory: number }>(
    "Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize, FreePhysicalMemory"
  )
  const total = result.TotalVisibleMemorySize
  const free = result.FreePhysicalMemory
  return Math.round(((total - free) / total) * 100)
}
```

**Step 3: Create IPC handler for system data**

Create `src/main/ipc/system.ts`:
```ts
import { ipcMain, BrowserWindow } from 'electron'
import { getSystemOverview, getCpuUsage, getRamUsage } from '../services/systemInfo'

let sensorInterval: ReturnType<typeof setInterval> | null = null

export function registerSystemIPC(): void {
  ipcMain.handle('system:getOverview', async () => {
    return await getSystemOverview()
  })

  ipcMain.on('system:startSensorStream', (event) => {
    if (sensorInterval) clearInterval(sensorInterval)

    sensorInterval = setInterval(async () => {
      try {
        const [cpu, ram] = await Promise.all([getCpuUsage(), getRamUsage()])
        const window = BrowserWindow.fromWebContents(event.sender)
        if (window && !window.isDestroyed()) {
          event.sender.send('system:sensorData', {
            timestamp: Date.now(),
            cpu,
            ram
          })
        }
      } catch {
        // Silently handle if window closed
      }
    }, 2000)
  })

  ipcMain.on('system:stopSensorStream', () => {
    if (sensorInterval) {
      clearInterval(sensorInterval)
      sensorInterval = null
    }
  })
}
```

**Step 4: Register IPC in main process**

Add to `src/main/index.ts` (after imports):
```ts
import { registerSystemIPC } from './ipc/system'
```
Call `registerSystemIPC()` inside `app.whenReady().then()` before `createWindow()`.

**Step 5: Extend preload API**

Add to `src/preload/index.ts` api object:
```ts
system: {
  getOverview: () => ipcRenderer.invoke('system:getOverview'),
  startSensorStream: () => ipcRenderer.send('system:startSensorStream'),
  stopSensorStream: () => ipcRenderer.send('system:stopSensorStream'),
  onSensorData: (callback: (data: any) => void) => {
    ipcRenderer.on('system:sensorData', (_event, data) => callback(data))
  }
}
```

**Step 6: Update types**

Add to `src/shared/types.d.ts`:
```ts
interface SystemAPI {
  getOverview: () => Promise<SystemOverview>
  startSensorStream: () => void
  stopSensorStream: () => void
  onSensorData: (callback: (data: SensorData) => void) => void
}

interface SystemOverview {
  cpu: { name: string; usage: number; temp: number | null }
  ram: { total: number; used: number; percent: number }
  gpu: { name: string; usage: number | null; temp: number | null }
  disk: { total: number; used: number; percent: number }
}

interface SensorData {
  timestamp: number
  cpu: number
  ram: number
}
```

Add `system: SystemAPI` to `ElectronAPI`.

**Step 7: Test**

Run `npm run dev`, open DevTools (Ctrl+Shift+I), run in console:
```js
window.api.system.getOverview().then(console.log)
```
Expected: JSON object with CPU, RAM, GPU, Disk info.

**Step 8: Commit**

```bash
git add src/main/ src/preload/ src/shared/
git commit -m "feat: add PowerShell service layer with system info and sensor streaming IPC"
```

---

### Task 8: Dashboard — Zustand Store

**Files:**
- Create: `src/renderer/stores/dashboardStore.ts`

**Step 1: Create dashboard store**

Create `src/renderer/stores/dashboardStore.ts`:
```ts
import { create } from 'zustand'

interface SystemOverview {
  cpu: { name: string; usage: number; temp: number | null }
  ram: { total: number; used: number; percent: number }
  gpu: { name: string; usage: number | null; temp: number | null }
  disk: { total: number; used: number; percent: number }
}

interface SensorDataPoint {
  timestamp: number
  cpu: number
  ram: number
}

interface DashboardState {
  overview: SystemOverview | null
  sensorHistory: SensorDataPoint[]
  healthScore: number
  isLoading: boolean

  fetchOverview: () => Promise<void>
  addSensorData: (data: SensorDataPoint) => void
  calculateHealthScore: () => void
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  overview: null,
  sensorHistory: [],
  healthScore: 0,
  isLoading: true,

  fetchOverview: async () => {
    set({ isLoading: true })
    const overview = await window.api.system.getOverview()
    set({ overview, isLoading: false })
    get().calculateHealthScore()
  },

  addSensorData: (data) => {
    set((state) => {
      const history = [...state.sensorHistory, data]
      // Keep last 60 data points (2 minutes at 2s interval)
      if (history.length > 60) history.shift()
      return { sensorHistory: history }
    })
  },

  calculateHealthScore: () => {
    const { overview } = get()
    if (!overview) return

    let score = 100

    // Disk usage penalty: -30 if over 90%, -15 if over 75%
    if (overview.disk.percent > 90) score -= 30
    else if (overview.disk.percent > 75) score -= 15

    // RAM penalty: -20 if over 85%, -10 if over 70%
    if (overview.ram.percent > 85) score -= 20
    else if (overview.ram.percent > 70) score -= 10

    // CPU penalty: -15 if over 80%
    if (overview.cpu.usage > 80) score -= 15
    else if (overview.cpu.usage > 60) score -= 8

    set({ healthScore: Math.max(0, Math.min(100, score)) })
  }
}))
```

**Step 2: Commit**

```bash
git add src/renderer/stores/dashboardStore.ts
git commit -m "feat: add dashboard Zustand store with health score calculation"
```

---

### Task 9: Dashboard — Health Score Ring Component

**Files:**
- Create: `src/renderer/modules/dashboard/HealthScore.tsx`

**Step 1: Create animated health score ring**

Create `src/renderer/modules/dashboard/HealthScore.tsx`:
```tsx
import { motion } from 'framer-motion'

interface Props {
  score: number
  isLoading: boolean
}

function getScoreColor(score: number): string {
  if (score >= 70) return '#22c55e'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

function getScoreLabel(score: number): string {
  if (score >= 70) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Poor'
}

export default function HealthScore({ score, isLoading }: Props) {
  const radius = 80
  const strokeWidth = 8
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const color = getScoreColor(score)

  return (
    <div className="glass rounded-2xl p-6 flex flex-col items-center justify-center">
      <h3 className="text-sm text-white/40 uppercase tracking-wider mb-4">Health Score</h3>

      <div className="relative w-[200px] h-[200px]">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          {/* Background ring */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={strokeWidth}
          />
          {/* Progress ring */}
          <motion.circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}
          />
        </svg>

        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isLoading ? (
            <div className="text-white/30 text-sm">Scanning...</div>
          ) : (
            <>
              <motion.span
                className="text-5xl font-bold text-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {score}
              </motion.span>
              <span className="text-sm mt-1" style={{ color }}>
                {getScoreLabel(score)}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/modules/dashboard/
git commit -m "feat: add animated health score ring component"
```

---

### Task 10: Dashboard — System Overview Bars

**Files:**
- Create: `src/renderer/modules/dashboard/SystemOverview.tsx`

**Step 1: Create system overview component with progress bars**

Create `src/renderer/modules/dashboard/SystemOverview.tsx`:
```tsx
import { motion } from 'framer-motion'
import { Cpu, MemoryStick, MonitorSpeaker, HardDrive } from 'lucide-react'

interface OverviewData {
  cpu: { name: string; usage: number; temp: number | null }
  ram: { total: number; used: number; percent: number }
  gpu: { name: string; usage: number | null; temp: number | null }
  disk: { total: number; used: number; percent: number }
}

interface Props {
  data: OverviewData | null
  isLoading: boolean
}

function getBarColor(percent: number): string {
  if (percent >= 85) return 'from-red-500 to-red-400'
  if (percent >= 60) return 'from-amber-500 to-amber-400'
  return 'from-blue-500 to-cyan-400'
}

interface BarProps {
  icon: React.ReactNode
  label: string
  sublabel: string
  percent: number
  detail: string
}

function UsageBar({ icon, label, sublabel, percent, detail }: BarProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1.5">
          <div>
            <span className="text-sm text-white font-medium">{label}</span>
            <span className="text-xs text-white/30 ml-2">{sublabel}</span>
          </div>
          <span className="text-sm text-white/60">{detail}</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${getBarColor(percent)}`}
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  )
}

export default function SystemOverview({ data, isLoading }: Props) {
  if (isLoading || !data) {
    return (
      <div className="glass rounded-2xl p-6">
        <h3 className="text-sm text-white/40 uppercase tracking-wider mb-6">System Overview</h3>
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-sm text-white/40 uppercase tracking-wider mb-6">System Overview</h3>
      <div className="space-y-5">
        <UsageBar
          icon={<Cpu size={18} className="text-blue-400" />}
          label="CPU"
          sublabel={`${data.cpu.usage}%`}
          percent={data.cpu.usage}
          detail={data.cpu.temp ? `${data.cpu.temp}°C` : ''}
        />
        <UsageBar
          icon={<MemoryStick size={18} className="text-purple-400" />}
          label="RAM"
          sublabel={`${data.ram.used} / ${data.ram.total} GB`}
          percent={data.ram.percent}
          detail={`${data.ram.percent}%`}
        />
        <UsageBar
          icon={<MonitorSpeaker size={18} className="text-green-400" />}
          label="GPU"
          sublabel={data.gpu.name.substring(0, 30)}
          percent={data.gpu.usage || 0}
          detail={data.gpu.temp ? `${data.gpu.temp}°C` : ''}
        />
        <UsageBar
          icon={<HardDrive size={18} className="text-amber-400" />}
          label="Disk"
          sublabel={`${data.disk.used} / ${data.disk.total} GB`}
          percent={data.disk.percent}
          detail={`${data.disk.percent}%`}
        />
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/modules/dashboard/SystemOverview.tsx
git commit -m "feat: add system overview component with animated usage bars"
```

---

### Task 11: Dashboard — Quick Actions Cards

**Files:**
- Create: `src/renderer/modules/dashboard/QuickActions.tsx`

**Step 1: Create quick actions component**

Create `src/renderer/modules/dashboard/QuickActions.tsx`:
```tsx
import { Trash2, Rocket, Sliders } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useNavigationStore } from '@/stores/navigationStore'
import { motion } from 'framer-motion'

interface ActionCard {
  icon: React.ReactNode
  title: string
  description: string
  gradient: string
  module: 'cleaner' | 'booster' | 'optimizer'
  path: string
}

const actions: ActionCard[] = [
  {
    icon: <Trash2 size={22} />,
    title: 'Quick Clean',
    description: 'Remove junk files',
    gradient: 'from-emerald-500/20 to-emerald-600/20',
    module: 'cleaner',
    path: '/cleaner'
  },
  {
    icon: <Rocket size={22} />,
    title: 'Quick Boost',
    description: 'Speed up startup',
    gradient: 'from-orange-500/20 to-orange-600/20',
    module: 'booster',
    path: '/booster'
  },
  {
    icon: <Sliders size={22} />,
    title: 'Quick Optimize',
    description: 'Tune your system',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    module: 'optimizer',
    path: '/optimizer'
  }
]

export default function QuickActions() {
  const navigate = useNavigate()
  const setActiveModule = useNavigationStore((s) => s.setActiveModule)

  const handleClick = (action: ActionCard) => {
    setActiveModule(action.module)
    navigate(action.path)
  }

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-sm text-white/40 uppercase tracking-wider mb-4">Quick Actions</h3>
      <div className="grid grid-cols-3 gap-3">
        {actions.map((action, i) => (
          <motion.button
            key={action.title}
            onClick={() => handleClick(action)}
            className={`rounded-xl p-4 bg-gradient-to-br ${action.gradient} border border-white/5 hover:border-white/15 transition-all duration-200 text-left group`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="text-white/80 mb-2 group-hover:text-white transition-colors">
              {action.icon}
            </div>
            <div className="text-sm font-medium text-white">{action.title}</div>
            <div className="text-xs text-white/40 mt-0.5">{action.description}</div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/modules/dashboard/QuickActions.tsx
git commit -m "feat: add quick actions cards for dashboard"
```

---

### Task 12: Dashboard — Live Sensor Charts

**Files:**
- Create: `src/renderer/modules/dashboard/LiveCharts.tsx`

**Step 1: Create live charts component**

Create `src/renderer/modules/dashboard/LiveCharts.tsx`:
```tsx
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

interface SensorDataPoint {
  timestamp: number
  cpu: number
  ram: number
}

interface Props {
  data: SensorDataPoint[]
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1e1e2e] border border-white/10 rounded-lg p-2 text-xs">
      <p className="text-white/40 mb-1">{formatTime(label)}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {entry.value}%
        </p>
      ))}
    </div>
  )
}

export default function LiveCharts({ data }: Props) {
  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-sm text-white/40 uppercase tracking-wider mb-4">Live Performance</h3>

      <div className="h-[200px]">
        {data.length < 2 ? (
          <div className="h-full flex items-center justify-center text-white/20 text-sm">
            Collecting data...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatTime}
                stroke="rgba(255,255,255,0.1)"
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                stroke="rgba(255,255,255,0.1)"
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                width={35}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="cpu"
                name="CPU"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: '#3b82f6' }}
              />
              <Line
                type="monotone"
                dataKey="ram"
                name="RAM"
                stroke="#a855f7"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: '#a855f7' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="text-xs text-white/40">CPU</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          <span className="text-xs text-white/40">RAM</span>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/modules/dashboard/LiveCharts.tsx
git commit -m "feat: add live performance charts with recharts"
```

---

### Task 13: Dashboard — Recent Activity Component

**Files:**
- Create: `src/renderer/modules/dashboard/RecentActivity.tsx`
- Create: `src/renderer/stores/activityStore.ts`

**Step 1: Create activity store**

Create `src/renderer/stores/activityStore.ts`:
```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ActivityEntry {
  id: string
  action: string
  detail: string
  timestamp: number
}

interface ActivityState {
  entries: ActivityEntry[]
  addEntry: (action: string, detail: string) => void
  clearAll: () => void
}

export const useActivityStore = create<ActivityState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (action, detail) =>
        set((state) => ({
          entries: [
            { id: crypto.randomUUID(), action, detail, timestamp: Date.now() },
            ...state.entries
          ].slice(0, 50)
        })),
      clearAll: () => set({ entries: [] })
    }),
    { name: 'eclean-activity' }
  )
)
```

**Step 2: Create recent activity component**

Create `src/renderer/modules/dashboard/RecentActivity.tsx`:
```tsx
import { useActivityStore } from '@/stores/activityStore'
import { Clock } from 'lucide-react'

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function RecentActivity() {
  const entries = useActivityStore((s) => s.entries)

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-sm text-white/40 uppercase tracking-wider mb-4">Recent Activity</h3>

      {entries.length === 0 ? (
        <div className="text-center py-8">
          <Clock size={24} className="text-white/10 mx-auto mb-2" />
          <p className="text-sm text-white/20">No activity yet</p>
          <p className="text-xs text-white/10 mt-1">Actions will appear here</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[200px] overflow-auto">
          {entries.slice(0, 10).map((entry) => (
            <div key={entry.id} className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400/60 mt-2 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/80">{entry.action}</p>
                <p className="text-xs text-white/30">{entry.detail}</p>
              </div>
              <span className="text-xs text-white/20 flex-shrink-0">{timeAgo(entry.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/renderer/modules/dashboard/ src/renderer/stores/activityStore.ts
git commit -m "feat: add recent activity component with persistent store"
```

---

### Task 14: Dashboard — Assemble Full Dashboard Page

**Files:**
- Create: `src/renderer/modules/dashboard/DashboardPage.tsx`
- Modify: `src/renderer/App.tsx`

**Step 1: Create the full Dashboard page**

Create `src/renderer/modules/dashboard/DashboardPage.tsx`:
```tsx
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

    // Refresh overview every 30 seconds
    const refreshInterval = setInterval(fetchOverview, 30000)

    // Start sensor streaming
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-white/40 mt-1">Your system at a glance</p>
      </div>

      {/* Top row: Health Score + Quick Actions + System Overview */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4">
          <HealthScore score={healthScore} isLoading={isLoading} />
        </div>
        <div className="col-span-8 space-y-6">
          <QuickActions />
          <SystemOverview data={overview} isLoading={isLoading} />
        </div>
      </div>

      {/* Bottom row: Live Charts + Recent Activity */}
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
```

**Step 2: Update App.tsx**

Replace the `DashboardPage` placeholder import and component in `src/renderer/App.tsx` with:
```tsx
import DashboardPage from './modules/dashboard/DashboardPage'
```
And use it in the route: `<Route path="/" element={<PageTransition><DashboardPage /></PageTransition>} />`

**Step 3: Test everything**

Run `npm run dev`. Verify:
- Health score ring animates on load
- System overview shows real CPU/RAM/GPU/Disk data
- Quick action cards are clickable and navigate
- Live charts start populating after a few seconds
- Recent activity shows empty state
- All glassmorphism styling looks correct

**Step 4: Commit**

```bash
git add src/renderer/
git commit -m "feat: assemble full dashboard page with all components"
```

---

### Task 15: Polish & Final Verification

**Step 1: Test all navigation flows**

- Click each sidebar icon — verify page transition animation
- Verify active indicator follows correctly
- Verify tooltips show on hover
- Verify window controls work (minimize, maximize, close)
- Verify dashboard auto-refreshes sensor data

**Step 2: Fix any issues found during testing**

Address any visual or functional issues.

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete Phase 1 - app shell with dashboard"
```

---

## Summary

| Task | Component | Est. Steps |
|------|-----------|-----------|
| 1 | Project initialization | 5 |
| 2 | Electron main process | 4 |
| 3 | React renderer + Tailwind | 6 |
| 4 | Custom titlebar | 4 |
| 5 | Sidebar navigation | 5 |
| 6 | Page transitions | 4 |
| 7 | PowerShell service layer | 8 |
| 8 | Dashboard Zustand store | 2 |
| 9 | Health score ring | 2 |
| 10 | System overview bars | 2 |
| 11 | Quick actions cards | 2 |
| 12 | Live sensor charts | 2 |
| 13 | Recent activity | 3 |
| 14 | Assemble dashboard page | 4 |
| 15 | Polish & verification | 3 |

**Total: 15 Tasks, ~56 Steps**

## Next Phases (future plans)

- Phase 2: Your PC module (Hardware Info + Sensors)
- Phase 3: Cleaner module (Junk Cleanup + Large Files + Shredder)
- Phase 4: Booster module (Startup Apps + Services + DNS + Tasks)
- Phase 5: Optimizer module (8 Categories + Undo System)
- Phase 6: Uninstaller module (Win32 + UWP + Extensions + Leftovers)

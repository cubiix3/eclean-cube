# eclean - Design Document

## Overview

eclean is a Windows PC optimization application with 6 core modules: Dashboard, Optimizer, Cleaner, Your PC, Booster, and Uninstaller. It provides safe, reversible system tweaks with a modern dark UI.

## Tech Stack

- **Framework:** Electron + React (TypeScript)
- **Build Tool:** electron-vite
- **State Management:** Zustand (per-module stores)
- **Styling:** Tailwind CSS
- **Charts:** recharts
- **Animations:** framer-motion
- **System Access:** PowerShell + WMI via Node.js child_process
- **Packaging:** electron-builder

## Design Language

- **Theme:** Modern Dark with glassmorphism effects
- **Background:** #0a0a0f / #12121a
- **Sidebar:** #16161f
- **Cards:** rgba white with backdrop-blur
- **Accent:** Blue/Cyan gradient (#3b82f6 to #06b6d4)
- **Transitions:** Fade + slide on page changes (framer-motion)
- **Language:** English

## App Shell & Navigation

Frameless Electron window with custom titlebar (minimize, maximize, close).

Narrow icon sidebar (~70px):
- eclean logo at top
- 6 navigation icons: Dashboard, Optimizer, Cleaner, Your PC, Booster, Uninstaller
- Hover shows label tooltip
- Active module highlighted with accent color
- Version number at bottom

Main content area fills remaining space with module-specific content.

## Module 1: Dashboard

The control center showing overall PC health at a glance.

### Health Score
- Animated SVG ring displaying score 0-100
- Color by score: Red (<40), Orange (40-69), Green (70-100)
- Calculated from: disk usage, RAM usage, startup app count, junk files, last optimization time

### Quick Actions
- 3 glassmorphism cards: Quick Clean, Quick Boost, Quick Optimize
- Each links to the respective module's quick action

### System Overview
- Live CPU/RAM/GPU/Disk usage as animated progress bars
- Temperatures displayed alongside usage

### Live Charts
- Real-time line charts (recharts) for CPU, RAM, Network
- 60-second rolling window
- Data streamed from main process via IPC at 1s intervals

### Recent Activity
- Timeline of user's last actions with timestamps

## Module 2: Optimizer

### Quick Optimize (3-Step Wizard)
1. **Select Priorities** - User picks categories (Privacy, Performance, Gaming, etc.)
2. **Analyzing** - System scans current settings across selected categories
3. **Review & Apply** - User reviews each tweak, toggles on/off, then applies

### 8 Optimization Categories
1. **Privacy** - Telemetry, advertising ID, activity history
2. **Security** - Windows Defender tweaks, UAC, SmartScreen
3. **Performance** - Visual effects, Prefetch, SysMain service
4. **Gaming** - Game Mode, GPU scheduling, Nagle algorithm
5. **Power** - Power plan optimization, USB selective suspend
6. **Network** - TCP optimizations, DNS cache, network throttling
7. **UI/UX** - Animations, transparency, Start menu tweaks
8. **Maintenance** - Windows Update, defrag, search indexing

### Per-Tweak Properties
- Name + description
- Current status (Applied / Not Applied)
- Risk level: Safe (green), Moderate (yellow), Advanced (red)
- Toggle switch
- Individual undo button

### Undo System
- Before any change, current registry/system value saved to local JSON
- "Undo All" restores every change
- Per-tweak undo available

## Module 3: Cleaner

### Tab 1: Junk Cleanup
- 4 scan categories: Browsers, System, Applications, Games
- Browsers: Chrome, Firefox, Edge, Brave, Opera, 17+ more
- System: Temp files, logs, Recycle Bin, thumbnails
- Applications: App caches
- Games: Steam, Epic, shader caches
- Real-time streaming scan progress
- File preview before deletion
- Safe defaults: important files unchecked by default
- Size display per item and total

### Tab 2: Large Files Finder
- Drive selection, scans for large files
- Sortable by size, name, date
- Quick actions: Open, Move, Delete
- Treemap visualization of disk usage

### Tab 3: Secure File Shredder
- Drag & drop files/folders
- 7-pass overwrite (DoD 5220.22-M)
- Per-file progress bar
- Clear warning: files cannot be recovered

## Module 4: Your PC

### Tab 1: System Information
- Expandable cards per component: CPU, GPU, RAM, Storage, Network, Motherboard, OS
- Data via PowerShell/WMI (Get-CimInstance), nvidia-smi, AMD ADL
- Full specs: clock speeds, cache sizes, driver versions, etc.

### Tab 2: Real-time Sensors
- Live line charts (recharts) with 60s history window
- CPU: Temperature, per-core usage, frequency
- GPU: Temperature, usage, VRAM, fan speed (NVIDIA + AMD)
- RAM: Usage, available, committed
- Network: Upload/download speed per adapter
- Disk: Read/write speed, utilization per drive
- Update interval: 1 second via IPC streaming
- Glassmorphism cards with color accents per sensor type

## Module 5: Booster

### Tab 1: Startup Apps Manager
- List all startup apps with impact ratings: High (red), Medium (yellow), Low (green)
- Toggle enable/disable per app
- Publisher and startup type info
- Summary: "Enabled: X of Y, Est. Boot Impact: High/Medium/Low"

### Tab 2: Windows Services
- List all services with status (Running/Stopped)
- Change startup type (Automatic/Manual/Disabled)
- Recommendations for safely disabling services
- Search and filter

### Tab 3: DNS Optimizer
- Show current DNS configuration
- Predefined profiles: Cloudflare (1.1.1.1), Google (8.8.8.8), OpenDNS, Quad9
- Latency test per DNS server with bar chart
- One-click apply

### Tab 4: Task Scheduler
- List Windows scheduled tasks
- Enable/disable toggle
- Next execution time, creator, description

## Module 6: Uninstaller

### Tab 1: Desktop Software (Win32)
- Grid view with color-coded size indicators (green <100MB, yellow <1GB, red >1GB)
- Multi-select for batch uninstall
- Search, filter, sort by name, size, install date

### Tab 2: UWP/Store Apps
- List Windows Store and built-in apps
- Remove pre-installed Microsoft apps

### Tab 3: Browser Extensions
- All extensions from Chrome, Firefox, Edge in one place
- Enable/disable/remove per extension

### Tab 4: Leftover Detection
- Post-uninstall scan for residual files and registry keys
- Confidence scoring:
  - High: file path contains app name (safe to delete)
  - Medium: in app folder but generic name
  - Low: loose reference (user decides)
- Uninstall history with timestamps

### Batch Uninstall
- Select multiple apps, uninstall sequentially
- Full history log of all uninstall actions

## Project Structure

```
eclean/
├── src/
│   ├── main/              # Electron Main Process
│   │   ├── index.ts
│   │   ├── ipc/           # IPC handlers per module
│   │   ├── services/      # PowerShell service layer
│   │   └── scripts/       # PowerShell scripts (.ps1)
│   ├── renderer/          # React Frontend
│   │   ├── App.tsx
│   │   ├── components/    # Shared UI components
│   │   ├── modules/       # Feature modules
│   │   │   ├── dashboard/
│   │   │   ├── optimizer/
│   │   │   ├── cleaner/
│   │   │   ├── hardware/
│   │   │   ├── booster/
│   │   │   └── uninstaller/
│   │   ├── stores/        # Zustand stores
│   │   └── styles/        # Tailwind + global styles
│   └── shared/            # Shared types & constants
├── package.json
├── electron-builder.yml
├── tailwind.config.js
└── tsconfig.json
```

## Key Dependencies

- electron, electron-builder
- react, react-dom, react-router-dom
- zustand
- tailwindcss
- recharts
- framer-motion
- typescript
- electron-vite

## IPC Architecture

```
Renderer (React) <--IPC--> Main Process (Node.js) <--child_process--> PowerShell/WMI
```

- Each module has dedicated IPC channels (e.g., `cleaner:scan`, `optimizer:apply`)
- Main process manages PowerShell child processes
- Streaming results via IPC for real-time updates (scans, sensors)
- All system operations run in main process for security (contextIsolation: true)

## Implementation Priority

1. App Shell (Electron + React + Navigation)
2. Dashboard (Health Score + System Overview + Charts)
3. Your PC (Hardware Info + Sensors - provides data layer for Dashboard)
4. Cleaner (Junk Cleanup + Large Files + Shredder)
5. Booster (Startup Apps + Services + DNS + Tasks)
6. Optimizer (8 Categories + Undo System)
7. Uninstaller (Win32 + UWP + Extensions + Leftovers)

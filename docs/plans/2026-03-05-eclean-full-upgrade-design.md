# eclean Full Upgrade Design

## Overview
Make eclean "richtig krass" — BCUninstaller-level functionality + visual polish + smart recommendations.

## Phase 1 — Critical Fixes

### 1.1 Boot-Time: Real Values
- Replace `Math.random()` fake boot times with real data
- `Get-CimInstance Win32_OperatingSystem | Select LastBootUpTime` for current
- Event Log `Microsoft-Windows-Diagnostics-Performance/Operational` Event ID 100 for history
- Store real measurements in settings JSON

### 1.2 Duplicate Tweak
- Remove `power-high-performance` tweak (duplicate of `performance-power-plan`)

### 1.3 Parallelize checkAllStatus()
- Bundle all 28 check commands into single PowerShell call
- Return JSON object with all statuses at once
- Target: 30s → 3s

### 1.4 HKCU Uninstall Registry
- Add `HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*` as third source for Win32 apps

### 1.5 Startup Folder Scanning
- Add Shell:Startup and Shell:Common Startup as startup sources alongside registry keys

## Phase 2 — Feature Depth

### 2.1 Cleaner Expansion (+15 scan paths)
- Windows Update Cache (`SoftwareDistribution\Download`)
- Prefetch (`C:\Windows\Prefetch`)
- WER Reports (`WER\ReportArchive`)
- DirectX Shader Cache (`D3DSCache`)
- Chrome sub-caches: GPUCache, Media Cache, Service Worker, ShaderCache
- Firefox: dynamic profile detection + `cache2`
- Edge: analog to Chrome
- Browser-running check before deletion
- Shredder: buffer-based overwrite instead of byte loop

### 2.2 Uninstaller Leftover Upgrade
- Increase scan depth: 2 → 4
- Additional paths: ProgramData, LocalAppData\Programs, Roaming
- Registry: CLSID, App Paths, File Associations, Services
- Scheduled Tasks belonging to app
- False-positive reduction: exact name match instead of Contains

### 2.3 Registry Cleaner: +8 Categories
- Broken COM/ActiveX (CLSID without DLL)
- Invalid File Associations
- Missing Shared DLLs
- Broken App Paths
- Invalid Sound Events
- Obsolete Installer references
- Stale Run/RunOnce entries
- Empty Registry Keys in Software

### 2.4 Smart Recommendations (Dashboard)
- New widget: "Recommendations" card
- Analyzes: disk usage, RAM consumption, startup count, last cleanup time, tweak status
- Shows 3-5 prioritized actions with one-click fix

## Phase 3 — Visual Polish

### 3.1 CSS Animation Foundation
- @keyframes library: shimmer, pulse-glow, gradient-shift
- Design tokens: --surface, --surface-hover, --border-subtle
- .glow utility with accent-color
- .text-gradient for headings

### 3.2 Dashboard Upgrade
- Stagger animation on load (50ms per card)
- Gradient text header
- HealthScore with breakdown badges
- LiveCharts: area-fill gradient + GPU line
- RecentActivity: type-specific icons + colors

### 3.3 Sidebar Upgrade
- Section groups with dividers + labels
- Active state with glow effect
- Animated tooltip
- Better logo (SVG)

### 3.4 ParticleBackground
- Increase opacity (0.03 → 0.15)
- Accent color integration
- Mouse proximity effect

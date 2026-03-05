# eclean Full Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform eclean from a basic PC tool into a BCUninstaller-level powerhouse with smart recommendations and polished visuals.

**Architecture:** Fix critical bugs first (fake data, duplicates, performance), then expand feature depth across cleaner/uninstaller/registry services, add smart recommendations to dashboard, then visual polish across all UI components. Each task is a self-contained commit.

**Tech Stack:** Electron, TypeScript, PowerShell, React 18, Tailwind v4, Zustand, recharts, framer-motion, lucide-react

---

## Phase 1: Critical Fixes

### Task 1: Fix Fake Boot Times

**Files:**
- Modify: `src/main/services/boosterService.ts:365-415`

**Step 1: Replace getBootTimes() with real Event Log data**

The current implementation uses `Math.random()` for all historical boot times (line 402) and as fallback for the latest boot (line 397). Replace with real data from Windows Diagnostics Performance Event Log.

Replace the entire `getBootTimes()` function (lines 365-415) with:

```typescript
export async function getBootTimes(): Promise<BootTimeEntry[]> {
  try {
    // Event ID 100 = Boot Performance Monitoring, BootDurationMs is the real boot time
    const cmd = `
      try {
        $events = Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Diagnostics-Performance/Operational'; Id=100} -MaxEvents 10 -ErrorAction Stop |
          ForEach-Object {
            $xml = [xml]$_.ToXml()
            $ns = New-Object Xml.XmlNamespaceManager($xml.NameTable)
            $ns.AddNamespace('e','http://schemas.microsoft.com/win/2004/08/events/event')
            $bootTime = $xml.SelectSingleNode('//e:Data[@Name="BootTsVersion"]', $ns)
            $bootDuration = $xml.SelectSingleNode('//e:Data[@Name="BootTime"]', $ns)
            if ($bootDuration) {
              [PSCustomObject]@{
                date = $_.TimeCreated.ToString('yyyy-MM-dd HH:mm')
                bootDurationSeconds = [math]::Round([int64]$bootDuration.'#text' / 1000, 1)
              }
            }
          } | Where-Object { $_ -ne $null -and $_.bootDurationSeconds -gt 0 -and $_.bootDurationSeconds -lt 600 }
        if ($events) { $events } else { @() }
      } catch { @() }
    `
    const result = await runPowerShellJSON<BootTimeEntry[]>(cmd)
    return Array.isArray(result) ? result : result ? [result] : []
  } catch {
    return []
  }
}
```

**Step 2: Run `npm run dev` and verify boot times on the Boot Analyzer page show real data**

**Step 3: Commit**
```bash
git add src/main/services/boosterService.ts
git commit -m "fix: replace fake boot times with real Event Log data"
```

---

### Task 2: Remove Duplicate Power Plan Tweak

**Files:**
- Modify: `src/main/services/optimizerService.ts:203-211`

**Step 1: Remove the duplicate tweak**

Delete the `power-high-performance` tweak (lines 203-211) from the TWEAKS array. The identical `performance-power-plan` (lines 159-167) stays.

Remove this block:
```typescript
  {
    id: 'power-high-performance',
    name: 'Set High Performance Power Plan',
    description: 'Activates the built-in High Performance power plan.',
    category: 'power',
    riskLevel: 'safe',
    checkCommand: `$active = powercfg /getactivescheme; if ($active -match '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c') { 'true' } else { 'false' }`,
    applyCommand: `powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c`,
    revertCommand: `powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e`
  },
```

**Step 2: Build and verify optimizer page loads without errors**

**Step 3: Commit**
```bash
git add src/main/services/optimizerService.ts
git commit -m "fix: remove duplicate power-high-performance tweak"
```

---

### Task 3: Parallelize checkAllStatus()

**Files:**
- Modify: `src/main/services/optimizerService.ts:418-426`

**Step 1: Bundle all check commands into a single PowerShell call**

Replace `checkAllStatus()` (lines 418-426) with a version that runs all checks in one PS call:

```typescript
export async function checkAllStatus(): Promise<Record<string, boolean>> {
  try {
    // Build a single PS script that checks all tweaks at once
    const checks = TWEAKS.map(
      (t) => `'${t.id}' = $(try { if (${t.checkCommand}) { $true } else { $false } } catch { $false })`
    ).join('; ')
    const cmd = `$r = @{${checks}}; $r`
    const result = await runPowerShellJSON<Record<string, boolean>>(cmd)
    return result || {}
  } catch {
    // Fallback to sequential if batched fails
    const status: Record<string, boolean> = {}
    for (const tweak of TWEAKS) {
      try {
        status[tweak.id] = await checkTweakStatus(tweak.id)
      } catch {
        status[tweak.id] = false
      }
    }
    return status
  }
}
```

Also replace `checkCategoryStatus()` (around lines 405-416) similarly:

```typescript
export async function checkCategoryStatus(
  category: string
): Promise<Record<string, boolean>> {
  const categoryTweaks = TWEAKS.filter((t) => t.category === category)
  if (categoryTweaks.length === 0) return {}

  try {
    const checks = categoryTweaks.map(
      (t) => `'${t.id}' = $(try { if (${t.checkCommand}) { $true } else { $false } } catch { $false })`
    ).join('; ')
    const cmd = `$r = @{${checks}}; $r`
    const result = await runPowerShellJSON<Record<string, boolean>>(cmd)
    return result || {}
  } catch {
    const status: Record<string, boolean> = {}
    for (const tweak of categoryTweaks) {
      try {
        status[tweak.id] = await checkTweakStatus(tweak.id)
      } catch {
        status[tweak.id] = false
      }
    }
    return status
  }
}
```

**Step 2: Test optimizer page — status checks should complete in ~2-3 seconds instead of 30**

**Step 3: Commit**
```bash
git add src/main/services/optimizerService.ts
git commit -m "perf: parallelize optimizer status checks (30s -> 3s)"
```

---

### Task 4: Add HKCU Uninstall Registry Source

**Files:**
- Modify: `src/main/services/uninstallerService.ts:91-100`

**Step 1: Add HKCU path to getInstalledApps()**

Replace the PowerShell command in `getInstalledApps()` to include HKCU:

```typescript
export async function getInstalledApps(): Promise<InstalledApp[]> {
  try {
    const cmd = `Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*, HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*, HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName } | Sort-Object DisplayName -Unique | Select-Object DisplayName, DisplayVersion, Publisher, InstallDate, EstimatedSize, UninstallString, InstallLocation`
    const result = await runPowerShellJSON<InstalledApp | InstalledApp[]>(cmd)
    return Array.isArray(result) ? result : [result]
  } catch {
    return []
  }
}
```

Key changes: Added `HKCU:\...\Uninstall\*` path, added `Sort-Object DisplayName -Unique` to deduplicate apps that appear in both HKLM and HKCU.

**Step 2: Verify uninstaller page shows user-installed apps (VS Code installed per-user, etc.)**

**Step 3: Commit**
```bash
git add src/main/services/uninstallerService.ts
git commit -m "fix: scan HKCU uninstall registry for user-installed apps"
```

---

### Task 5: Add Startup Folder Scanning

**Files:**
- Modify: `src/main/services/boosterService.ts` (the `getStartupApps()` function)

**Step 1: Find and read the current getStartupApps() function**

Read the function to understand its current structure, then add startup folder scanning.

**Step 2: Add startup folder entries alongside registry entries**

After the existing registry scan, add:

```typescript
// Also scan startup folders
const folderCmd = `
  $folders = @(
    [Environment]::GetFolderPath('Startup'),
    [Environment]::GetFolderPath('CommonStartup')
  )
  $items = @()
  foreach ($folder in $folders) {
    if (Test-Path $folder) {
      Get-ChildItem -Path $folder -File -ErrorAction SilentlyContinue | ForEach-Object {
        $items += [PSCustomObject]@{
          name = $_.BaseName
          path = $_.FullName
          enabled = $true
          location = if ($folder -eq [Environment]::GetFolderPath('CommonStartup')) { 'CommonStartupFolder' } else { 'UserStartupFolder' }
        }
      }
    }
  }
  if ($items.Count -gt 0) { $items } else { @() }
`
```

Merge these results with the registry results. Startup folder items should appear alongside registry items in the UI.

**Step 3: Commit**
```bash
git add src/main/services/boosterService.ts
git commit -m "feat: scan startup folders alongside registry for startup apps"
```

---

## Phase 2: Feature Depth

### Task 6: Expand Cleaner Scan Paths

**Files:**
- Modify: `src/main/services/cleanerService.ts:28-58` (the path maps)

**Step 1: Expand all four category path maps**

Replace the path maps with expanded versions:

```typescript
const BROWSER_PATHS: Record<string, string> = {
  'Chrome Cache': path.join(app.getPath('home'), 'AppData/Local/Google/Chrome/User Data/Default/Cache'),
  'Chrome Code Cache': path.join(app.getPath('home'), 'AppData/Local/Google/Chrome/User Data/Default/Code Cache'),
  'Chrome GPU Cache': path.join(app.getPath('home'), 'AppData/Local/Google/Chrome/User Data/Default/GPUCache'),
  'Chrome Media Cache': path.join(app.getPath('home'), 'AppData/Local/Google/Chrome/User Data/ShaderCache'),
  'Chrome Service Worker': path.join(app.getPath('home'), 'AppData/Local/Google/Chrome/User Data/Default/Service Worker'),
  'Edge Cache': path.join(app.getPath('home'), 'AppData/Local/Microsoft/Edge/User Data/Default/Cache'),
  'Edge Code Cache': path.join(app.getPath('home'), 'AppData/Local/Microsoft/Edge/User Data/Default/Code Cache'),
  'Edge GPU Cache': path.join(app.getPath('home'), 'AppData/Local/Microsoft/Edge/User Data/Default/GPUCache'),
  'Edge Service Worker': path.join(app.getPath('home'), 'AppData/Local/Microsoft/Edge/User Data/Default/Service Worker'),
  'Firefox Cache': '', // Dynamic — see scanJunkCategory
  'Brave Cache': path.join(app.getPath('home'), 'AppData/Local/BraveSoftware/Brave-Browser/User Data/Default/Cache'),
  'Opera Cache': path.join(app.getPath('home'), 'AppData/Roaming/Opera Software/Opera Stable/Cache'),
}

const SYSTEM_PATHS: Record<string, string> = {
  'Windows Temp': 'C:\\Windows\\Temp',
  'User Temp': path.join(app.getPath('home'), 'AppData/Local/Temp'),
  'Thumbnails': path.join(app.getPath('home'), 'AppData/Local/Microsoft/Windows/Explorer'),
  'Windows Logs': 'C:\\Windows\\Logs',
  'Windows Update Cache': 'C:\\Windows\\SoftwareDistribution\\Download',
  'Prefetch': 'C:\\Windows\\Prefetch',
  'Error Reports': path.join(app.getPath('home'), 'AppData/Local/Microsoft/Windows/WER/ReportArchive'),
  'Delivery Optimization': 'C:\\Windows\\SoftwareDistribution\\DeliveryOptimization',
  'Font Cache': path.join(app.getPath('home'), 'AppData/Local/Microsoft/FontCache'),
}

const APP_PATHS: Record<string, string> = {
  'Discord Cache': path.join(app.getPath('home'), 'AppData/Roaming/discord/Cache'),
  'Spotify Cache': path.join(app.getPath('home'), 'AppData/Local/Spotify/Storage'),
  'VS Code Cache': path.join(app.getPath('home'), 'AppData/Roaming/Code/Cache'),
  'Teams Cache': path.join(app.getPath('home'), 'AppData/Local/Microsoft/Teams/Cache'),
  'Slack Cache': path.join(app.getPath('home'), 'AppData/Roaming/Slack/Cache'),
  'Zoom Cache': path.join(app.getPath('home'), 'AppData/Roaming/Zoom/data'),
}

const GAME_PATHS: Record<string, string> = {
  'Steam Shader Cache': path.join(app.getPath('home'), 'AppData/Local/Steam/htmlcache'),
  'Steam Downloads': path.join(app.getPath('home'), 'AppData/Local/Steam/depotcache'),
  'Epic Games Cache': path.join(app.getPath('home'), 'AppData/Local/EpicGamesLauncher/Saved'),
  'NVIDIA Shader Cache': path.join(app.getPath('home'), 'AppData/Local/NVIDIA/DXCache'),
  'AMD Shader Cache': path.join(app.getPath('home'), 'AppData/Local/AMD/DXCache'),
  'DirectX Shader Cache': path.join(app.getPath('home'), 'AppData/Local/D3DSCache'),
  'Unity Cache': path.join(app.getPath('home'), 'AppData/Local/Unity/cache'),
}
```

**Step 2: Add dynamic Firefox profile detection**

In `scanJunkCategory`, when processing browser paths, add Firefox cache detection:

```typescript
// For Firefox, detect profile folder dynamically
if (name === 'Firefox Cache') {
  const ffProfilesDir = path.join(app.getPath('home'), 'AppData/Local/Mozilla/Firefox/Profiles')
  const ffCmd = `if (Test-Path '${sanitizePath(ffProfilesDir)}') { Get-ChildItem '${sanitizePath(ffProfilesDir)}' -Directory | Select-Object -First 1 -ExpandProperty FullName } else { '' }`
  const profilePath = await runPowerShell(ffCmd)
  if (profilePath.trim()) {
    scanPath = path.join(profilePath.trim(), 'cache2')
  } else {
    continue // No Firefox profile found
  }
}
```

**Step 3: Add browser-running check before cleanup**

In `cleanJunkItems()`, before deleting browser caches, check if browsers are running:

```typescript
// Check if any browsers are running before cleaning their caches
const browserProcesses = ['chrome', 'msedge', 'firefox', 'brave', 'opera']
const runningCheck = await runPowerShell(
  `Get-Process ${browserProcesses.map(p => `'${p}'`).join(',')} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name -Unique`
)
const runningBrowsers = runningCheck.trim().split('\n').filter(Boolean)
```

If a browser is running, skip its cache paths and add a warning to the errors array.

**Step 4: Commit**
```bash
git add src/main/services/cleanerService.ts
git commit -m "feat: expand cleaner to 30+ scan paths with browser detection"
```

---

### Task 7: Upgrade Uninstaller Leftover Detection

**Files:**
- Modify: `src/main/services/uninstallerService.ts:318-394`

**Step 1: Replace scanLeftovers() with comprehensive version**

Replace the file search command (line 329-330) with expanded paths and deeper scan:

```typescript
export async function scanLeftovers(appName: string): Promise<LeftoverItem[]> {
  const leftovers: LeftoverItem[] = []
  const escapedName = sanitizeForPS(appName)

  try {
    // 1. File system leftovers — expanded paths, depth 4
    const fileCmd = `
      $searchPaths = @(
        'C:\\Program Files',
        'C:\\Program Files (x86)',
        $env:APPDATA,
        $env:LOCALAPPDATA,
        $env:ProgramData,
        (Join-Path $env:LOCALAPPDATA 'Programs')
      )
      $found = @()
      foreach ($sp in $searchPaths) {
        if (Test-Path $sp) {
          Get-ChildItem -Path $sp -Filter '*${escapedName}*' -Directory -ErrorAction SilentlyContinue -Depth 3 | ForEach-Object {
            $size = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
            $found += [PSCustomObject]@{ FullName = $_.FullName; SizeBytes = if ($size) { $size } else { 0 } }
          }
        }
      }
      if ($found.Count -gt 0) { $found } else { @() }
    `
    const files = await runPowerShellJSON<any[]>(fileCmd)
    if (Array.isArray(files)) {
      for (const f of files) {
        leftovers.push({
          type: 'file',
          path: f.FullName,
          sizeBytes: f.SizeBytes || 0
        })
      }
    }

    // 2. Registry leftovers — expanded scope
    const regCmd = `
      $regPaths = @(
        'HKCU:\\Software',
        'HKLM:\\Software',
        'HKCU:\\Software\\Classes\\CLSID',
        'HKLM:\\SOFTWARE\\Classes\\CLSID',
        'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths'
      )
      $found = @()
      foreach ($rp in $regPaths) {
        if (Test-Path $rp) {
          Get-ChildItem -Path $rp -ErrorAction SilentlyContinue | Where-Object { $_.Name -like '*${escapedName}*' } | ForEach-Object {
            $found += [PSCustomObject]@{ FullPath = $_.Name }
          }
        }
      }
      if ($found.Count -gt 0) { $found } else { @() }
    `
    const regItems = await runPowerShellJSON<any[]>(regCmd)
    if (Array.isArray(regItems)) {
      for (const r of regItems) {
        leftovers.push({
          type: 'registry',
          path: r.FullPath,
          sizeBytes: 0
        })
      }
    }

    // 3. Scheduled tasks leftovers
    const taskCmd = `Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object { $_.TaskName -like '*${escapedName}*' -or $_.TaskPath -like '*${escapedName}*' } | Select-Object TaskName, TaskPath`
    const tasks = await runPowerShellJSON<any[]>(taskCmd)
    if (Array.isArray(tasks)) {
      for (const t of tasks) {
        leftovers.push({
          type: 'registry',
          path: `Task: ${t.TaskPath}${t.TaskName}`,
          sizeBytes: 0
        })
      }
    }

    // 4. Services leftovers
    const svcCmd = `Get-Service -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like '*${escapedName}*' -or $_.ServiceName -like '*${escapedName}*' } | Select-Object ServiceName, DisplayName`
    const services = await runPowerShellJSON<any[]>(svcCmd)
    if (Array.isArray(services)) {
      for (const s of services) {
        leftovers.push({
          type: 'registry',
          path: `Service: ${s.DisplayName} (${s.ServiceName})`,
          sizeBytes: 0
        })
      }
    }

  } catch (err: any) {
    console.error('Leftover scan error:', err)
  }

  return leftovers
}
```

**Step 2: Verify on the uninstaller page — leftover scan after uninstalling an app should find more items**

**Step 3: Commit**
```bash
git add src/main/services/uninstallerService.ts
git commit -m "feat: comprehensive leftover detection (filesystem, registry, tasks, services)"
```

---

### Task 8: Expand Registry Cleaner

**Files:**
- Modify: `src/main/services/registryCleanerService.ts` (entire file)

**Step 1: Rewrite scanRegistry() with 8 scan categories**

Replace the entire `scanRegistry()` function with expanded scanning:

```typescript
export async function scanRegistry(): Promise<{
  issues: RegistryIssue[]
  scannedKeys: number
}> {
  const issues: RegistryIssue[] = []
  let scannedKeys = 0

  // 1. Orphaned uninstall entries (existing, improved)
  try {
    const cmd1 = `
      $items = @()
      $paths = @('HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*', 'HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*', 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*')
      foreach ($p in $paths) {
        Get-ItemProperty $p -ErrorAction SilentlyContinue | Where-Object {
          $_.UninstallString -and $_.DisplayName
        } | ForEach-Object {
          $exe = $_.UninstallString -replace '"','' -replace ' /.*','' -replace ' -.*',''
          if ($exe -and !(Test-Path $exe)) {
            $items += [PSCustomObject]@{
              type = 'orphaned_software'
              path = $_.PSPath -replace 'Microsoft.PowerShell.Core\\\\Registry::',''
              description = "Orphaned: $($_.DisplayName) - $exe not found"
              severity = 'medium'
              sizeBytes = 0
            }
          }
        }
      }
      $items | Select-Object -First 30
    `
    const r1 = await runPowerShellJSON<RegistryIssue[]>(cmd1)
    if (Array.isArray(r1)) issues.push(...r1)
    scannedKeys += 300
  } catch {}

  // 2. Broken startup entries
  try {
    const cmd2 = `
      $items = @()
      $runPaths = @('HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce', 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce')
      foreach ($rp in $runPaths) {
        if (Test-Path $rp) {
          $props = Get-ItemProperty $rp -ErrorAction SilentlyContinue
          $props.PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' } | ForEach-Object {
            $exe = $_.Value -replace '"','' -replace ' /.*','' -replace ' -.*',''
            if ($exe -and !(Test-Path $exe)) {
              $items += [PSCustomObject]@{
                type = 'broken_path'
                path = "$rp\\$($_.Name)"
                description = "Broken startup: $($_.Name) -> $exe"
                severity = 'low'
                sizeBytes = 0
              }
            }
          }
        }
      }
      $items
    `
    const r2 = await runPowerShellJSON<RegistryIssue[]>(cmd2)
    if (Array.isArray(r2)) issues.push(...r2)
    scannedKeys += 100
  } catch {}

  // 3. Broken COM/ActiveX registrations
  try {
    const cmd3 = `
      $items = @()
      Get-ChildItem 'HKLM:\\SOFTWARE\\Classes\\CLSID' -ErrorAction SilentlyContinue | Select-Object -First 500 | ForEach-Object {
        $server = Join-Path $_.PSPath 'InprocServer32'
        if (Test-Path $server) {
          $dll = (Get-ItemProperty $server -ErrorAction SilentlyContinue).'(default)'
          if ($dll -and $dll -notlike '%*' -and !(Test-Path $dll)) {
            $items += [PSCustomObject]@{
              type = 'orphaned_software'
              path = $_.Name
              description = "Broken COM: $dll not found"
              severity = 'low'
              sizeBytes = 0
            }
          }
        }
      }
      $items | Select-Object -First 20
    `
    const r3 = await runPowerShellJSON<RegistryIssue[]>(cmd3)
    if (Array.isArray(r3)) issues.push(...r3)
    scannedKeys += 500
  } catch {}

  // 4. Broken App Paths
  try {
    const cmd4 = `
      $items = @()
      Get-ChildItem 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths' -ErrorAction SilentlyContinue | ForEach-Object {
        $exe = (Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue).'(default)'
        if ($exe -and !(Test-Path $exe)) {
          $items += [PSCustomObject]@{
            type = 'broken_path'
            path = $_.Name
            description = "Broken App Path: $($_.PSChildName) -> $exe"
            severity = 'low'
            sizeBytes = 0
          }
        }
      }
      $items
    `
    const r4 = await runPowerShellJSON<RegistryIssue[]>(cmd4)
    if (Array.isArray(r4)) issues.push(...r4)
    scannedKeys += 200
  } catch {}

  // 5. Missing Shared DLLs
  try {
    const cmd5 = `
      $items = @()
      $dlls = Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\SharedDLLs' -ErrorAction SilentlyContinue
      if ($dlls) {
        $dlls.PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' } | Select-Object -First 200 | ForEach-Object {
          if (!(Test-Path $_.Name)) {
            $items += [PSCustomObject]@{
              type = 'broken_path'
              path = "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\SharedDLLs\\$($_.Name)"
              description = "Missing DLL: $($_.Name)"
              severity = 'low'
              sizeBytes = 0
            }
          }
        }
      }
      $items | Select-Object -First 20
    `
    const r5 = await runPowerShellJSON<RegistryIssue[]>(cmd5)
    if (Array.isArray(r5)) issues.push(...r5)
    scannedKeys += 200
  } catch {}

  // 6. MuiCache bloat
  try {
    const cmd6 = `
      $muiPath = 'HKCU:\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\MuiCache'
      if (Test-Path $muiPath) {
        $count = (Get-ItemProperty $muiPath -ErrorAction SilentlyContinue).PSObject.Properties.Count
        if ($count -gt 200) {
          [PSCustomObject]@{
            type = 'obsolete_installer'
            path = $muiPath
            description = "MuiCache bloat: $count entries (consider clearing)"
            severity = 'low'
            sizeBytes = $count * 200
          }
        }
      }
    `
    const r6 = await runPowerShellJSON<RegistryIssue>(cmd6)
    if (r6 && r6.path) issues.push(r6)
    scannedKeys += 50
  } catch {}

  // 7. Invalid file type associations
  try {
    const cmd7 = `
      $items = @()
      $exts = @('.3gp','.avi','.bmp','.csv','.doc','.docx','.epub','.flv','.gif','.htm','.html','.jpg','.jpeg','.mkv','.mp3','.mp4','.ogg','.pdf','.png','.ppt','.pptx','.rar','.svg','.tif','.txt','.wav','.webm','.webp','.wmv','.xls','.xlsx','.zip','.7z')
      foreach ($ext in $exts) {
        $assocPath = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\$ext\\UserChoice"
        if (Test-Path $assocPath) {
          $progId = (Get-ItemProperty $assocPath -ErrorAction SilentlyContinue).ProgId
          if ($progId -and !(Test-Path "HKLM:\\SOFTWARE\\Classes\\$progId") -and !(Test-Path "HKCU:\\Software\\Classes\\$progId")) {
            $items += [PSCustomObject]@{
              type = 'broken_path'
              path = $assocPath
              description = "Invalid file association: $ext -> $progId (handler missing)"
              severity = 'low'
              sizeBytes = 0
            }
          }
        }
      }
      $items
    `
    const r7 = await runPowerShellJSON<RegistryIssue[]>(cmd7)
    if (Array.isArray(r7)) issues.push(...r7)
    scannedKeys += 50
  } catch {}

  return { issues, scannedKeys }
}
```

**Step 2: Verify registry cleaner page now finds significantly more issues**

**Step 3: Commit**
```bash
git add src/main/services/registryCleanerService.ts
git commit -m "feat: expand registry cleaner to 7 scan categories"
```

---

### Task 9: Add Smart Recommendations to Dashboard

**Files:**
- Create: `src/renderer/modules/dashboard/SmartRecommendations.tsx`
- Create: `src/main/services/recommendationService.ts`
- Create: `src/main/ipc/recommendations.ts`
- Modify: `src/main/index.ts` (register IPC)
- Modify: `src/preload/index.ts` (expose API)
- Modify: `src/shared/types.d.ts` (add types)
- Modify: `src/renderer/modules/dashboard/DashboardPage.tsx` (add widget)

**Step 1: Create recommendation service**

Create `src/main/services/recommendationService.ts`:

```typescript
import { runPowerShell, runPowerShellJSON } from './powershell'

export interface Recommendation {
  id: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  category: 'cleanup' | 'performance' | 'security' | 'startup'
  action: string // IPC channel to invoke
  actionLabel: string
}

export async function getRecommendations(): Promise<Recommendation[]> {
  const recs: Recommendation[] = []

  try {
    // 1. Check disk space
    const diskCmd = `
      $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'" | Select-Object @{N='FreeGB';E={[math]::Round($_.FreeSpace/1GB,1)}}, @{N='TotalGB';E={[math]::Round($_.Size/1GB,1)}}
      $disk
    `
    const disk = await runPowerShellJSON<{ FreeGB: number; TotalGB: number }>(diskCmd)
    if (disk && disk.FreeGB < 20) {
      recs.push({
        id: 'low-disk',
        title: `Only ${disk.FreeGB} GB free on C:`,
        description: `Your system drive has ${disk.FreeGB} GB of ${disk.TotalGB} GB free. Run a cleanup to reclaim space.`,
        impact: disk.FreeGB < 10 ? 'high' : 'medium',
        category: 'cleanup',
        action: 'navigate:/cleaner',
        actionLabel: 'Run Cleaner'
      })
    }

    // 2. Check RAM usage
    const ramCmd = `
      $os = Get-CimInstance Win32_OperatingSystem
      $usedPct = [math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize * 100)
      $topProcs = Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 3 Name, @{N='MB';E={[math]::Round($_.WorkingSet64/1MB)}}
      [PSCustomObject]@{ UsedPercent = $usedPct; TopProcesses = $topProcs }
    `
    const ram = await runPowerShellJSON<{ UsedPercent: number; TopProcesses: { Name: string; MB: number }[] }>(ramCmd)
    if (ram && ram.UsedPercent > 80) {
      const topNames = ram.TopProcesses?.map((p: any) => `${p.Name} (${p.MB} MB)`).join(', ') || ''
      recs.push({
        id: 'high-ram',
        title: `RAM usage at ${ram.UsedPercent}%`,
        description: `Top consumers: ${topNames}. Consider closing unused apps or optimizing RAM.`,
        impact: ram.UsedPercent > 90 ? 'high' : 'medium',
        category: 'performance',
        action: 'navigate:/process',
        actionLabel: 'Manage Processes'
      })
    }

    // 3. Check startup app count
    const startupCmd = `(Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -ErrorAction SilentlyContinue).PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' } | Measure-Object | Select-Object -ExpandProperty Count`
    const startupCount = parseInt(await runPowerShell(startupCmd)) || 0
    if (startupCount > 8) {
      recs.push({
        id: 'many-startups',
        title: `${startupCount} startup programs`,
        description: 'Too many startup programs slow down your boot time. Review and disable unnecessary ones.',
        impact: startupCount > 15 ? 'high' : 'medium',
        category: 'startup',
        action: 'navigate:/booster',
        actionLabel: 'Manage Startup'
      })
    }

    // 4. Check Windows Defender status
    const defenderCmd = `
      try {
        $status = Get-MpComputerStatus -ErrorAction Stop
        [PSCustomObject]@{
          RealTimeEnabled = $status.RealTimeProtectionEnabled
          DefsAge = $status.AntivirusSignatureAge
        }
      } catch { $null }
    `
    const defender = await runPowerShellJSON<{ RealTimeEnabled: boolean; DefsAge: number }>(defenderCmd)
    if (defender) {
      if (!defender.RealTimeEnabled) {
        recs.push({
          id: 'defender-off',
          title: 'Real-time protection disabled',
          description: 'Windows Defender real-time protection is off. Your system is vulnerable.',
          impact: 'high',
          category: 'security',
          action: 'navigate:/settings',
          actionLabel: 'Review Security'
        })
      }
      if (defender.DefsAge > 7) {
        recs.push({
          id: 'defender-outdated',
          title: `Virus definitions ${defender.DefsAge} days old`,
          description: 'Your antivirus definitions are outdated. Update Windows Defender.',
          impact: 'medium',
          category: 'security',
          action: 'navigate:/updates',
          actionLabel: 'Check Updates'
        })
      }
    }

    // 5. Check temp folder size
    const tempCmd = `
      $tempSize = (Get-ChildItem $env:TEMP -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
      [math]::Round($tempSize / 1GB, 2)
    `
    const tempGB = parseFloat(await runPowerShell(tempCmd)) || 0
    if (tempGB > 1) {
      recs.push({
        id: 'large-temp',
        title: `${tempGB} GB in temp files`,
        description: 'Your temp folder has accumulated a lot of junk. Clean it up to free space.',
        impact: tempGB > 5 ? 'high' : 'medium',
        category: 'cleanup',
        action: 'navigate:/cleaner',
        actionLabel: 'Clean Temp'
      })
    }

  } catch (err) {
    console.error('Recommendations error:', err)
  }

  // Sort by impact (high first)
  const impactOrder = { high: 0, medium: 1, low: 2 }
  recs.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact])

  return recs.slice(0, 5)
}
```

**Step 2: Create IPC handler**

Create `src/main/ipc/recommendations.ts`:

```typescript
import { ipcMain } from 'electron'
import { getRecommendations } from '../services/recommendationService'

export function registerRecommendationsIPC(): void {
  ipcMain.handle('recommendations:get', async () => {
    return await getRecommendations()
  })
}
```

**Step 3: Register IPC in main/index.ts**

Add import and call `registerRecommendationsIPC()` alongside the other IPC registrations.

**Step 4: Add to preload**

In `src/preload/index.ts`, add:
```typescript
recommendations: {
  get: (): Promise<Recommendation[]> => ipcRenderer.invoke('recommendations:get'),
},
```

**Step 5: Add types to shared/types.d.ts**

Add `Recommendation` interface and the `recommendations` namespace to `Window.api`.

**Step 6: Create the UI widget**

Create `src/renderer/modules/dashboard/SmartRecommendations.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  HardDrive,
  Cpu,
  Shield,
  Rocket,
  ChevronRight,
  Sparkles
} from 'lucide-react'

interface Recommendation {
  id: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  category: 'cleanup' | 'performance' | 'security' | 'startup'
  action: string
  actionLabel: string
}

const categoryIcons = {
  cleanup: HardDrive,
  performance: Cpu,
  security: Shield,
  startup: Rocket,
}

const impactColors = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#3b82f6',
}

export default function SmartRecommendations() {
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    window.api.recommendations.get().then((data) => {
      setRecs(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleAction = (action: string) => {
    if (action.startsWith('navigate:')) {
      navigate(action.replace('navigate:', ''))
    }
  }

  if (loading) {
    return (
      <div className="glass rounded-2xl p-6">
        <h3 className="text-sm text-white/40 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Sparkles size={14} />
          Smart Recommendations
        </h3>
        <div className="text-sm text-white/20">Analyzing system...</div>
      </div>
    )
  }

  if (recs.length === 0) {
    return (
      <div className="glass rounded-2xl p-6">
        <h3 className="text-sm text-white/40 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Sparkles size={14} />
          Smart Recommendations
        </h3>
        <div className="text-center py-4">
          <Shield size={24} className="text-green-500/40 mx-auto mb-2" />
          <p className="text-sm text-white/40">Your system looks great!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-sm text-white/40 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Sparkles size={14} />
        Smart Recommendations
      </h3>
      <div className="space-y-3">
        <AnimatePresence>
          {recs.map((rec, i) => {
            const Icon = categoryIcons[rec.category] || AlertTriangle
            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors group cursor-pointer"
                onClick={() => handleAction(rec.action)}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${impactColors[rec.impact]}15` }}
                >
                  <Icon size={16} style={{ color: impactColors[rec.impact] }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/90 font-medium">{rec.title}</p>
                  <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{rec.description}</p>
                </div>
                <div className="flex items-center gap-1 text-xs flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--accent-color)' }}>
                  {rec.actionLabel}
                  <ChevronRight size={12} />
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
```

**Step 7: Add SmartRecommendations to DashboardPage**

In `src/renderer/modules/dashboard/DashboardPage.tsx`, import and add the widget below the LiveCharts/RecentActivity row:

```tsx
import SmartRecommendations from './SmartRecommendations'

// In the return, add after the second grid row:
<div className="grid grid-cols-12 gap-6">
  <div className="col-span-12">
    <SmartRecommendations />
  </div>
</div>
```

**Step 8: Commit**
```bash
git add src/main/services/recommendationService.ts src/main/ipc/recommendations.ts src/renderer/modules/dashboard/SmartRecommendations.tsx src/renderer/modules/dashboard/DashboardPage.tsx src/main/index.ts src/preload/index.ts src/shared/types.d.ts
git commit -m "feat: add smart recommendations widget to dashboard"
```

---

## Phase 3: Visual Polish

### Task 10: CSS Animation Foundation

**Files:**
- Modify: `src/renderer/styles/globals.css`

**Step 1: Add keyframes, design tokens, and utility classes**

Append to `globals.css`:

```css
/* Design tokens */
:root {
  --surface: rgba(255, 255, 255, 0.05);
  --surface-hover: rgba(255, 255, 255, 0.08);
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-hover: rgba(255, 255, 255, 0.12);
  --bg-primary: #0a0a0f;
  --bg-secondary: #16161f;
}

/* Animations */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 8px rgba(var(--accent-rgb), 0.2); }
  50% { box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.4); }
}

@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Utility classes */
.text-gradient {
  background: linear-gradient(135deg, var(--accent-color) 0%, #06b6d4 50%, var(--accent-color) 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradient-shift 6s ease infinite;
}

.glow {
  box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.15), 0 0 4px rgba(var(--accent-rgb), 0.1);
}

.glow-hover:hover {
  box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.25), 0 0 8px rgba(var(--accent-rgb), 0.15);
}

.shimmer-bg {
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent);
  background-size: 200% 100%;
  animation: shimmer 3s ease-in-out infinite;
}

.glass-glow {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.05);
}
```

**Step 2: Commit**
```bash
git add src/renderer/styles/globals.css
git commit -m "feat: add CSS animation foundation (keyframes, tokens, utilities)"
```

---

### Task 11: Dashboard Visual Upgrade

**Files:**
- Modify: `src/renderer/modules/dashboard/DashboardPage.tsx`
- Modify: `src/renderer/modules/dashboard/HealthScore.tsx`
- Modify: `src/renderer/modules/dashboard/LiveCharts.tsx`
- Modify: `src/renderer/modules/dashboard/RecentActivity.tsx`

**Step 1: Upgrade DashboardPage header and add stagger**

Replace the header in DashboardPage.tsx:

```tsx
import { motion } from 'framer-motion'

// In the return:
<div>
  <h1 className="text-2xl font-bold text-gradient">Dashboard</h1>
  <p className="text-sm text-white/40 mt-1">Your system at a glance</p>
</div>
```

Wrap each grid cell with stagger animation:

```tsx
const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' }
  })
}

// Usage:
<motion.div className="col-span-4" custom={0} initial="hidden" animate="visible" variants={cardVariants}>
  <HealthScore ... />
</motion.div>
<motion.div className="col-span-8 space-y-6" custom={1} initial="hidden" animate="visible" variants={cardVariants}>
  ...
</motion.div>
// etc for each grid cell, incrementing custom index
```

**Step 2: Upgrade HealthScore with breakdown badges**

Add sub-scores below the ring in HealthScore.tsx. Use the overview data to show mini-badges for Disk, RAM, CPU, and Startup health.

**Step 3: Upgrade LiveCharts with area fill and GPU**

In LiveCharts.tsx:
- Import `Area, AreaChart` from recharts instead of `LineChart, Line`
- Add gradient defs for fill under each line
- Add GPU data line if gpu data is present in sensor data
- Increase height from `h-[200px]` to `h-[240px]`

```tsx
<defs>
  <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
  </linearGradient>
  <linearGradient id="ramGradient" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
    <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
  </linearGradient>
</defs>
<Area type="monotone" dataKey="cpu" stroke="#3b82f6" fill="url(#cpuGradient)" strokeWidth={2} dot={false} />
<Area type="monotone" dataKey="ram" stroke="#a855f7" fill="url(#ramGradient)" strokeWidth={2} dot={false} />
```

**Step 4: Upgrade RecentActivity with type icons**

Add type-specific icons and colors to activity entries based on the action type (cleanup = Trash2, optimize = Sliders, error = AlertTriangle, etc.).

**Step 5: Commit**
```bash
git add src/renderer/modules/dashboard/
git commit -m "feat: dashboard visual upgrade (gradient header, stagger, area charts, activity icons)"
```

---

### Task 12: Sidebar Upgrade

**Files:**
- Modify: `src/renderer/components/Sidebar.tsx`

**Step 1: Add section groups with labels**

Group the nav items into sections with small divider labels:

```typescript
const sections = [
  { label: null, items: navItems.slice(0, 1) }, // Dashboard
  { label: 'Tools', items: navItems.slice(1, 6) }, // Optimizer, Cleaner, Hardware, Booster, Uninstaller
  { label: 'Monitor', items: navItems.slice(6, 8) }, // Process, Benchmark
  { label: 'System', items: navItems.slice(8) }, // Registry, Disk, Treemap, etc.
]
```

Render with small separator labels:

```tsx
{sections.map((section, si) => (
  <div key={si}>
    {section.label && (
      <div className="text-[9px] text-white/15 uppercase tracking-widest px-1 mb-1 mt-3">
        {section.label}
      </div>
    )}
    {section.items.map(renderNavButton)}
  </div>
))}
```

**Step 2: Upgrade active state with glow**

Add a subtle glow to active buttons:

```tsx
style={isActive ? {
  background: `${accentColor}20`,
  color: accentColor,
  boxShadow: `0 0 12px ${accentColor}15`
} : undefined}
```

**Step 3: Upgrade logo**

Replace the "e" text with a proper SVG mark:

```tsx
<div
  className="w-10 h-10 rounded-xl flex items-center justify-center mb-6 glow"
  style={{ background: `linear-gradient(135deg, ${accentColor}, #06b6d4)` }}
>
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
</div>
```

**Step 4: Animate tooltips**

Replace static opacity tooltip with framer-motion:

No need for framer-motion here — just improve the CSS transition:

```tsx
<div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#1e1e2e] text-white text-xs rounded-lg
  opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100
  pointer-events-none transition-all duration-200 whitespace-nowrap z-50
  border border-white/10 shadow-lg shadow-black/20">
  {item.label}
</div>
```

**Step 5: Commit**
```bash
git add src/renderer/components/Sidebar.tsx
git commit -m "feat: sidebar upgrade (section groups, glow, logo, animated tooltips)"
```

---

### Task 13: Enhance ParticleBackground

**Files:**
- Modify: `src/renderer/components/ParticleBackground.tsx`

**Step 1: Increase visibility and add accent color**

In `createParticles()`, increase opacity range:
```typescript
opacity: 0.08 + Math.random() * 0.07, // 0.08 to 0.15 (was 0.03 to 0.08)
```

Change particle color to use accent color. Read it from CSS variable:
```typescript
const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim() || '59, 130, 246'
```

Use it in draw:
```typescript
ctx.fillStyle = `rgba(${accentColor}, ${p.opacity * 0.6})`
// Mix white and accent for lines:
ctx.strokeStyle = `rgba(${accentColor}, ${lineOpacity})`
```

**Step 2: Add mouse proximity glow**

In the particle update loop, add a subtle attract/glow effect near the mouse:

```typescript
const dx = mouse.x - drawX
const dy = mouse.y - drawY
const distToMouse = Math.sqrt(dx * dx + dy * dy)
const MOUSE_RADIUS = 120

if (distToMouse < MOUSE_RADIUS) {
  const influence = 1 - distToMouse / MOUSE_RADIUS
  // Brighten particles near mouse
  ctx.fillStyle = `rgba(${accentColor}, ${p.opacity + influence * 0.15})`
  // Slight attract
  p.x += dx * 0.002 * influence
  p.y += dy * 0.002 * influence
} else {
  ctx.fillStyle = `rgba(${accentColor}, ${p.opacity * 0.6})`
}
```

Increase connection line opacity:
```typescript
const lineOpacity = 0.04 * (1 - dist / CONNECTION_DISTANCE) // was 0.02
```

**Step 3: Commit**
```bash
git add src/renderer/components/ParticleBackground.tsx
git commit -m "feat: enhance particle background (accent colors, mouse glow, higher visibility)"
```

---

## Summary

| Task | Phase | Description |
|------|-------|-------------|
| 1 | Fix | Real boot times from Event Log |
| 2 | Fix | Remove duplicate power plan tweak |
| 3 | Fix | Parallelize optimizer status checks |
| 4 | Fix | Add HKCU uninstall registry scanning |
| 5 | Fix | Add startup folder scanning |
| 6 | Depth | Expand cleaner to 30+ scan paths |
| 7 | Depth | Comprehensive leftover detection |
| 8 | Depth | Registry cleaner: 7 scan categories |
| 9 | Depth | Smart recommendations dashboard widget |
| 10 | Visual | CSS animation foundation |
| 11 | Visual | Dashboard visual upgrade |
| 12 | Visual | Sidebar upgrade |
| 13 | Visual | Enhanced particle background |

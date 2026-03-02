import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { runPowerShell } from './powershell'

interface GamingModeState {
  active: boolean
  previousPowerPlan: string | null
  timestamp: number | null
}

interface GamingModeResult {
  killedProcesses: number
  freedRAM: number
  powerPlan: string
}

interface DeactivateResult {
  restored: boolean
}

const NON_ESSENTIAL_PROCESSES = [
  'OneDrive',
  'Teams',
  'Spotify',
  'Discord',
  'Slack',
  'steamwebhelper',
  'GameBarPresenceWriter',
  'GameBar',
  'YourPhone',
  'PhoneExperienceHost',
  'SkypeApp',
  'SkypeBridge',
  'HxTsr',
  'HxOutlook',
  'HxCalendarAppImm',
  'Cortana',
  'SearchApp',
  'SearchUI',
  'MicrosoftEdgeUpdate',
  'GoogleUpdate',
  'AdobeIPCBroker',
  'AdobeNotificationClient',
  'CCXProcess',
  'AcroTray',
  'jusched',
  'iTunesHelper',
  'Dropbox',
  'BoxSync',
  'iCloudServices',
  'GHub',
  'LogiBolt',
  'NahimicService',
  'NahimicSvc64',
  'WmiPrvSE'
]

function getStatePath(): string {
  return join(app.getPath('userData'), 'gaming-mode-state.json')
}

function loadState(): GamingModeState {
  const statePath = getStatePath()
  try {
    if (existsSync(statePath)) {
      const raw = readFileSync(statePath, 'utf-8')
      return JSON.parse(raw)
    }
  } catch {
    // Return default on error
  }
  return { active: false, previousPowerPlan: null, timestamp: null }
}

function saveState(state: GamingModeState): void {
  const statePath = getStatePath()
  writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8')
}

export async function activateGamingMode(): Promise<GamingModeResult> {
  // 1. Save current power plan
  let previousPowerPlan: string | null = null
  try {
    const planRaw = await runPowerShell(
      `(powercfg /getactivescheme).ToString() -replace '.*:\\s*','' -replace '\\s*\\(.*',''`
    )
    previousPowerPlan = planRaw.trim()
  } catch {
    previousPowerPlan = null
  }

  // 2. Kill non-essential processes
  let killedProcesses = 0
  try {
    const processList = NON_ESSENTIAL_PROCESSES.map((p) => `'${p}'`).join(',')
    const killResult = await runPowerShell(
      `$killed = 0; @(${processList}) | ForEach-Object { $procs = Get-Process -Name $_ -ErrorAction SilentlyContinue; if ($procs) { $procs | Stop-Process -Force -ErrorAction SilentlyContinue; $killed += $procs.Count } }; $killed`
    )
    killedProcesses = parseInt(killResult.trim(), 10) || 0
  } catch {
    killedProcesses = 0
  }

  // 3. Set High Performance power plan
  try {
    await runPowerShell(`powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c`)
  } catch {
    // High Performance plan may not exist, try Ultimate Performance
    try {
      await runPowerShell(`powercfg /setactive e9a42b02-d5df-448d-aa00-03f14749eb61`)
    } catch {
      // Ignore if both fail
    }
  }

  // 4. Free RAM by minimizing working sets
  let freedRAM = 0
  try {
    const ramResult = await runPowerShell(`
      $os = Get-CimInstance Win32_OperatingSystem;
      $beforeMB = [math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / 1KB, 0);
      Get-Process | Where-Object { $_.ProcessName -ne 'eclean' } | ForEach-Object { try { $_.MinWorkingSet = $_.MinWorkingSet } catch {} };
      Start-Sleep -Seconds 1;
      $os2 = Get-CimInstance Win32_OperatingSystem;
      $afterMB = [math]::Round(($os2.TotalVisibleMemorySize - $os2.FreePhysicalMemory) / 1KB, 0);
      $freed = $beforeMB - $afterMB;
      if ($freed -lt 0) { $freed = 0 };
      $freed
    `)
    freedRAM = parseInt(ramResult.trim(), 10) || 0
  } catch {
    freedRAM = 0
  }

  // 5. Disable Windows notifications (Focus Assist to alarms only)
  try {
    await runPowerShell(
      `Set-ItemProperty -Path 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings' -Name 'NOC_GLOBAL_SETTING_TOASTS_ENABLED' -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue`
    )
  } catch {
    // Ignore
  }

  // 6. Set foreground game process to High priority
  try {
    await runPowerShell(`
      $fg = (Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.ProcessName -ne 'eclean' -and $_.ProcessName -ne 'explorer' } | Sort-Object -Property WorkingSet64 -Descending | Select-Object -First 1);
      if ($fg) { $fg.PriorityClass = 'High' }
    `)
  } catch {
    // Ignore
  }

  // Save state
  saveState({
    active: true,
    previousPowerPlan,
    timestamp: Date.now()
  })

  return {
    killedProcesses,
    freedRAM,
    powerPlan: 'High Performance'
  }
}

export async function deactivateGamingMode(): Promise<DeactivateResult> {
  const state = loadState()

  // 1. Restore previous power plan
  if (state.previousPowerPlan) {
    try {
      // Get all power plans and find the previous one by GUID
      const plansRaw = await runPowerShell(`powercfg /list`)
      const lines = plansRaw.split('\n')
      for (const line of lines) {
        if (line.includes(state.previousPowerPlan)) {
          const guidMatch = line.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
          if (guidMatch) {
            await runPowerShell(`powercfg /setactive ${guidMatch[1]}`)
            break
          }
        }
      }
    } catch {
      // Fallback: try setting Balanced plan
      try {
        await runPowerShell(`powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e`)
      } catch {
        // Ignore
      }
    }
  } else {
    // Default to Balanced
    try {
      await runPowerShell(`powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e`)
    } catch {
      // Ignore
    }
  }

  // 2. Re-enable notifications
  try {
    await runPowerShell(
      `Set-ItemProperty -Path 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings' -Name 'NOC_GLOBAL_SETTING_TOASTS_ENABLED' -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue`
    )
  } catch {
    // Ignore
  }

  // Save state
  saveState({
    active: false,
    previousPowerPlan: null,
    timestamp: null
  })

  return { restored: true }
}

export function isGamingModeActive(): boolean {
  const state = loadState()
  return state.active
}

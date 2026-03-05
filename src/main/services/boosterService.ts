import { runPowerShell, runPowerShellJSON } from './powershell'
import { sanitizeForPS, sanitizeNumber } from './sanitize'

// ──────────────────────────────────────────────
// Startup Apps
// ──────────────────────────────────────────────

export interface StartupApp {
  name: string
  command: string
  location: string // HKCU, HKLM, UserStartupFolder, or CommonStartupFolder
  user: string
  enabled: boolean
  publisher: string
  impact: 'High' | 'Medium' | 'Low'
}

// Known heavy startup apps for impact heuristic
const HIGH_IMPACT_KEYWORDS = [
  'discord', 'steam', 'epic', 'teams', 'skype', 'onedrive',
  'dropbox', 'spotify', 'adobe', 'antivirus', 'mcafee',
  'norton', 'avg', 'avast', 'java', 'updater', 'cortana',
  'gamemanager', 'origin', 'razer', 'logitech', 'corsair',
  'nvidia', 'geforce', 'wallpaper'
]

const MEDIUM_IMPACT_KEYWORDS = [
  'update', 'helper', 'agent', 'sync', 'cloud',
  'service', 'daemon', 'monitor', 'tray', 'notification'
]

function guessImpact(name: string, command: string): 'High' | 'Medium' | 'Low' {
  const lower = (name + ' ' + command).toLowerCase()
  if (HIGH_IMPACT_KEYWORDS.some((kw) => lower.includes(kw))) return 'High'
  if (MEDIUM_IMPACT_KEYWORDS.some((kw) => lower.includes(kw))) return 'Medium'
  return 'Low'
}

function extractPublisher(command: string): string {
  try {
    // Try to extract publisher from path like "C:\Program Files\Company\..."
    const match = command.match(/(?:Program Files(?:\s*\(x86\))?|AppData\\[^\\]+)\\([^\\]+)\\/i)
    if (match) return match[1]
    // Try to extract from exe name
    const exeMatch = command.match(/([^\\]+)\.exe/i)
    if (exeMatch) return exeMatch[1]
  } catch {
    // ignore
  }
  return 'Unknown'
}

interface RegistryEntry {
  PSPath: string
  [key: string]: string
}

export async function getStartupApps(): Promise<StartupApp[]> {
  const apps: StartupApp[] = []

  // Read from HKCU Run key
  try {
    const hkcuResult = await runPowerShell(
      `$items = Get-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -ErrorAction SilentlyContinue; if ($items) { $props = $items.PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' }; $arr = @(); foreach ($p in $props) { $arr += [PSCustomObject]@{ Name = $p.Name; Command = $p.Value; Location = 'HKCU' } }; $arr | ConvertTo-Json -Depth 3 } else { '[]' }`
    )
    if (hkcuResult && hkcuResult !== '[]') {
      const parsed = JSON.parse(hkcuResult)
      const entries = Array.isArray(parsed) ? parsed : [parsed]
      for (const entry of entries) {
        if (entry.Name && entry.Command) {
          apps.push({
            name: entry.Name,
            command: entry.Command,
            location: 'HKCU',
            user: 'Current User',
            enabled: true,
            publisher: extractPublisher(entry.Command),
            impact: guessImpact(entry.Name, entry.Command)
          })
        }
      }
    }
  } catch {
    // Ignore errors
  }

  // Read from HKLM Run key
  try {
    const hklmResult = await runPowerShell(
      `$items = Get-ItemProperty -Path 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -ErrorAction SilentlyContinue; if ($items) { $props = $items.PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' }; $arr = @(); foreach ($p in $props) { $arr += [PSCustomObject]@{ Name = $p.Name; Command = $p.Value; Location = 'HKLM' } }; $arr | ConvertTo-Json -Depth 3 } else { '[]' }`
    )
    if (hklmResult && hklmResult !== '[]') {
      const parsed = JSON.parse(hklmResult)
      const entries = Array.isArray(parsed) ? parsed : [parsed]
      for (const entry of entries) {
        if (entry.Name && entry.Command) {
          // Skip duplicates that already exist from HKCU
          if (!apps.some((a) => a.name === entry.Name)) {
            apps.push({
              name: entry.Name,
              command: entry.Command,
              location: 'HKLM',
              user: 'All Users',
              enabled: true,
              publisher: extractPublisher(entry.Command),
              impact: guessImpact(entry.Name, entry.Command)
            })
          }
        }
      }
    }
  } catch {
    // Ignore errors
  }

  // Also check disabled items stored in our own registry key
  try {
    const disabledResult = await runPowerShell(
      `$items = Get-ItemProperty -Path 'HKCU:\\Software\\eClean\\DisabledStartup' -ErrorAction SilentlyContinue; if ($items) { $props = $items.PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' }; $arr = @(); foreach ($p in $props) { $arr += [PSCustomObject]@{ Name = $p.Name; Command = $p.Value } }; $arr | ConvertTo-Json -Depth 3 } else { '[]' }`
    )
    if (disabledResult && disabledResult !== '[]') {
      const parsed = JSON.parse(disabledResult)
      const entries = Array.isArray(parsed) ? parsed : [parsed]
      for (const entry of entries) {
        if (entry.Name && entry.Command) {
          // Parse stored format: "location|command"
          const parts = entry.Command.split('|')
          const location = parts[0] || 'HKCU'
          const command = parts.slice(1).join('|')
          apps.push({
            name: entry.Name,
            command,
            location,
            user: location === 'HKLM' ? 'All Users' : 'Current User',
            enabled: false,
            publisher: extractPublisher(command),
            impact: guessImpact(entry.Name, command)
          })
        }
      }
    }
  } catch {
    // Ignore errors
  }

  // Scan Windows Startup folders (user + common)
  for (const folderType of ['Startup', 'CommonStartup'] as const) {
    const locationLabel = folderType === 'Startup' ? 'UserStartupFolder' : 'CommonStartupFolder'
    const userLabel = folderType === 'Startup' ? 'Current User' : 'All Users'
    try {
      const folderResult = await runPowerShell(
        `$folder = [Environment]::GetFolderPath('${folderType}'); if (Test-Path $folder) { Get-ChildItem -Path $folder -File -ErrorAction SilentlyContinue | ForEach-Object { [PSCustomObject]@{ Name = $_.BaseName; Command = $_.FullName; Target = if ($_.Extension -eq '.lnk') { try { (New-Object -ComObject WScript.Shell).CreateShortcut($_.FullName).TargetPath } catch { $_.FullName } } else { $_.FullName } } } | ConvertTo-Json -Depth 3 } else { '[]' }`
      )
      if (folderResult && folderResult !== '[]') {
        const parsed = JSON.parse(folderResult)
        const entries = Array.isArray(parsed) ? parsed : [parsed]
        for (const entry of entries) {
          if (entry.Name) {
            const command = entry.Target || entry.Command || ''
            // Skip if already found via registry
            if (!apps.some((a) => a.name === entry.Name)) {
              apps.push({
                name: entry.Name,
                command,
                location: locationLabel,
                user: userLabel,
                enabled: true,
                publisher: extractPublisher(command),
                impact: guessImpact(entry.Name, command)
              })
            }
          }
        }
      }
    } catch {
      // Ignore errors
    }
  }

  return apps
}

export async function setStartupEnabled(
  name: string,
  command: string,
  location: string,
  enabled: boolean
): Promise<void> {
  const escapedName = sanitizeForPS(name)
  const escapedCommand = sanitizeForPS(command)
  const regPath = location === 'HKLM'
    ? 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
    : 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'

  if (enabled) {
    // Re-add to the Run key
    await runPowerShell(
      `Set-ItemProperty -Path '${regPath}' -Name '${escapedName}' -Value '${escapedCommand}' -ErrorAction Stop`
    )
    // Remove from our disabled storage
    await runPowerShell(
      `Remove-ItemProperty -Path 'HKCU:\\Software\\eClean\\DisabledStartup' -Name '${escapedName}' -ErrorAction SilentlyContinue`
    )
  } else {
    // Store the original value for re-enabling
    await runPowerShell(
      `if (-not (Test-Path 'HKCU:\\Software\\eClean\\DisabledStartup')) { New-Item -Path 'HKCU:\\Software\\eClean\\DisabledStartup' -Force | Out-Null }; Set-ItemProperty -Path 'HKCU:\\Software\\eClean\\DisabledStartup' -Name '${escapedName}' -Value '${location}|${escapedCommand}'`
    )
    // Remove from the Run key
    await runPowerShell(
      `Remove-ItemProperty -Path '${regPath}' -Name '${escapedName}' -ErrorAction Stop`
    )
  }
}

// ──────────────────────────────────────────────
// Windows Services
// ──────────────────────────────────────────────

export interface WindowsService {
  name: string
  displayName: string
  status: string
  startType: string
  safeToDisable: boolean
}

// Services commonly considered safe to disable
const SAFE_TO_DISABLE_SERVICES = [
  'DiagTrack',             // Connected User Experiences and Telemetry
  'dmwappushservice',      // WAP Push Message Routing
  'MapsBroker',            // Downloaded Maps Manager
  'lfsvc',                 // Geolocation Service
  'SharedAccess',          // Internet Connection Sharing
  'RemoteRegistry',        // Remote Registry
  'RetailDemo',            // Retail Demo Service
  'WMPNetworkSvc',         // Windows Media Player Network Sharing
  'XblAuthManager',        // Xbox Live Auth Manager
  'XblGameSave',           // Xbox Live Game Save
  'XboxNetApiSvc',         // Xbox Live Networking
  'XboxGipSvc',            // Xbox Accessory Management
  'WSearch',               // Windows Search (if not needed)
  'Fax',                   // Fax
  'SysMain',               // Superfetch
  'WerSvc',                // Windows Error Reporting
  'wisvc',                 // Windows Insider Service
  'icssvc',                // Windows Mobile Hotspot Service
  'PhoneSvc',              // Phone Service
  'TabletInputService',    // Touch Keyboard and Handwriting
]

export async function getServices(): Promise<WindowsService[]> {
  try {
    const result = await runPowerShell(
      `Get-Service | Select-Object Name, DisplayName, Status, StartType | ConvertTo-Json -Depth 3`
    )
    if (!result) return []
    const parsed = JSON.parse(result)
    const services = Array.isArray(parsed) ? parsed : [parsed]
    return services.map((s: any) => ({
      name: s.Name,
      displayName: s.DisplayName,
      status: typeof s.Status === 'number'
        ? ['Unknown', 'Stopped', 'StartPending', 'StopPending', 'Running', 'ContinuePending', 'PausePending', 'Paused'][s.Status] || 'Unknown'
        : String(s.Status),
      startType: typeof s.StartType === 'number'
        ? ['Boot', 'System', 'Automatic', 'Manual', 'Disabled'][s.StartType] || 'Unknown'
        : String(s.StartType),
      safeToDisable: SAFE_TO_DISABLE_SERVICES.includes(s.Name)
    }))
  } catch {
    return []
  }
}

export async function setServiceStartType(
  name: string,
  startType: 'Automatic' | 'Manual' | 'Disabled'
): Promise<void> {
  const escapedName = sanitizeForPS(name)
  // Validate startType against allowed values
  const allowedTypes = ['Automatic', 'Manual', 'Disabled']
  const safeStartType = allowedTypes.includes(startType) ? startType : 'Manual'
  await runPowerShell(
    `Set-Service -Name '${escapedName}' -StartupType ${safeStartType} -ErrorAction Stop`
  )
}

// ──────────────────────────────────────────────
// DNS Optimizer
// ──────────────────────────────────────────────

export interface DNSConfig {
  interfaceAlias: string
  interfaceIndex: number
  serverAddresses: string[]
}

export async function getCurrentDNS(): Promise<DNSConfig[]> {
  try {
    const result = await runPowerShell(
      `Get-DnsClientServerAddress -AddressFamily IPv4 | Where-Object {$_.ServerAddresses.Count -gt 0} | Select-Object InterfaceAlias, InterfaceIndex, ServerAddresses | ConvertTo-Json -Depth 3`
    )
    if (!result) return []
    const parsed = JSON.parse(result)
    const configs = Array.isArray(parsed) ? parsed : [parsed]
    return configs.map((c: any) => ({
      interfaceAlias: c.InterfaceAlias,
      interfaceIndex: c.InterfaceIndex,
      serverAddresses: Array.isArray(c.ServerAddresses) ? c.ServerAddresses : [c.ServerAddresses]
    }))
  } catch {
    return []
  }
}

export async function setDNS(
  interfaceIndex: number,
  primary: string,
  secondary: string
): Promise<void> {
  const safeIndex = sanitizeNumber(interfaceIndex)
  const safePrimary = sanitizeForPS(primary)
  const safeSecondary = sanitizeForPS(secondary)
  await runPowerShell(
    `Set-DnsClientServerAddress -InterfaceIndex ${safeIndex} -ServerAddresses ("${safePrimary}","${safeSecondary}")`
  )
}

export async function pingDNS(server: string): Promise<number> {
  try {
    const safeServer = sanitizeForPS(server)
    const result = await runPowerShell(
      `(Test-Connection -ComputerName '${safeServer}' -Count 3 -ErrorAction Stop | Measure-Object -Property ResponseTime -Average).Average`
    )
    const latency = parseFloat(result)
    return isNaN(latency) ? -1 : Math.round(latency)
  } catch {
    return -1
  }
}

// ──────────────────────────────────────────────
// Task Scheduler
// ──────────────────────────────────────────────

export interface ScheduledTask {
  taskName: string
  taskPath: string
  state: string
  description: string
}

export async function getScheduledTasks(): Promise<ScheduledTask[]> {
  try {
    const result = await runPowerShell(
      `Get-ScheduledTask | Where-Object { $_.TaskPath -notlike '\\Microsoft\\Windows\\*' -or $_.TaskName -notlike '*\\*' } | Select-Object -First 200 TaskName, TaskPath, @{N='State';E={$_.State.ToString()}}, @{N='Description';E={if($_.Description){$_.Description.Substring(0,[Math]::Min(200,$_.Description.Length))}else{''}}} | ConvertTo-Json -Depth 3`
    )
    if (!result) return []
    const parsed = JSON.parse(result)
    const tasks = Array.isArray(parsed) ? parsed : [parsed]
    return tasks.map((t: any) => ({
      taskName: t.TaskName || '',
      taskPath: t.TaskPath || '',
      state: typeof t.State === 'number'
        ? ['Unknown', 'Disabled', 'Queued', 'Ready', 'Running'][t.State] || 'Unknown'
        : String(t.State || 'Unknown'),
      description: t.Description || ''
    }))
  } catch {
    return []
  }
}

export async function setTaskEnabled(
  taskName: string,
  taskPath: string,
  enabled: boolean
): Promise<void> {
  const escapedName = sanitizeForPS(taskName)
  const escapedPath = sanitizeForPS(taskPath)

  if (enabled) {
    await runPowerShell(`Enable-ScheduledTask -TaskName '${escapedName}' -TaskPath '${escapedPath}' -ErrorAction Stop`)
  } else {
    await runPowerShell(`Disable-ScheduledTask -TaskName '${escapedName}' -TaskPath '${escapedPath}' -ErrorAction Stop`)
  }
}

// ──────────────────────────────────────────────
// Boot Time Tracker
// ──────────────────────────────────────────────

export interface BootTimeEntry {
  date: string
  bootDurationSeconds: number
}

export async function getBootTimes(): Promise<BootTimeEntry[]> {
  try {
    const cmd = `
      try {
        $events = Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Diagnostics-Performance/Operational'; Id=100} -MaxEvents 10 -ErrorAction Stop |
          ForEach-Object {
            $xml = [xml]$_.ToXml()
            $ns = New-Object Xml.XmlNamespaceManager($xml.NameTable)
            $ns.AddNamespace('e','http://schemas.microsoft.com/win/2004/08/events/event')
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

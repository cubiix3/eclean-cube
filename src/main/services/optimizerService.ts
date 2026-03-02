import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { runPowerShell } from './powershell'

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface TweakDefinition {
  id: string
  name: string
  description: string
  category: string
  riskLevel: 'safe' | 'moderate' | 'advanced'
  checkCommand: string
  applyCommand: string
  revertCommand: string
}

export interface BackupEntry {
  originalValue: string
  appliedAt: number
}

export type BackupData = Record<string, BackupEntry>

// ──────────────────────────────────────────────
// Tweak Definitions
// ──────────────────────────────────────────────

const TWEAKS: TweakDefinition[] = [
  // ── Privacy ──
  {
    id: 'privacy-telemetry',
    name: 'Disable Telemetry',
    description: 'Prevents Windows from collecting and sending diagnostic data to Microsoft.',
    category: 'privacy',
    riskLevel: 'safe',
    checkCommand: `try { $v = (Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' -Name 'AllowTelemetry' -ErrorAction Stop).AllowTelemetry; if ($v -eq 0) { 'true' } else { 'false' } } catch { 'false' }`,
    applyCommand: `New-Item -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' -Force | Out-Null; Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' -Name 'AllowTelemetry' -Value 0 -Type DWord -Force`,
    revertCommand: `Remove-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' -Name 'AllowTelemetry' -ErrorAction SilentlyContinue`
  },
  {
    id: 'privacy-advertising-id',
    name: 'Disable Advertising ID',
    description: 'Stops apps from using your advertising ID for targeted ads.',
    category: 'privacy',
    riskLevel: 'safe',
    checkCommand: `try { $v = (Get-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo' -Name 'Enabled' -ErrorAction Stop).Enabled; if ($v -eq 0) { 'true' } else { 'false' } } catch { 'false' }`,
    applyCommand: `New-Item -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo' -Force | Out-Null; Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo' -Name 'Enabled' -Value 0 -Type DWord -Force`,
    revertCommand: `Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo' -Name 'Enabled' -Value 1 -Type DWord -Force`
  },
  {
    id: 'privacy-activity-history',
    name: 'Disable Activity History',
    description: 'Prevents Windows from collecting your activity history across devices.',
    category: 'privacy',
    riskLevel: 'safe',
    checkCommand: `try { $v = (Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System' -Name 'EnableActivityFeed' -ErrorAction Stop).EnableActivityFeed; if ($v -eq 0) { 'true' } else { 'false' } } catch { 'false' }`,
    applyCommand: `New-Item -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System' -Force | Out-Null; Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System' -Name 'EnableActivityFeed' -Value 0 -Type DWord -Force`,
    revertCommand: `Remove-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System' -Name 'EnableActivityFeed' -ErrorAction SilentlyContinue`
  },
  {
    id: 'privacy-location',
    name: 'Disable Location Tracking',
    description: 'Turns off location access for Windows and apps.',
    category: 'privacy',
    riskLevel: 'safe',
    checkCommand: `try { $v = (Get-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location' -Name 'Value' -ErrorAction Stop).Value; if ($v -eq 'Deny') { 'true' } else { 'false' } } catch { 'false' }`,
    applyCommand: `New-Item -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location' -Force | Out-Null; Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location' -Name 'Value' -Value 'Deny' -Type String -Force`,
    revertCommand: `Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location' -Name 'Value' -Value 'Allow' -Type String -Force`
  },
  {
    id: 'privacy-feedback',
    name: 'Disable Feedback Notifications',
    description: 'Stops Windows from asking for feedback about your experience.',
    category: 'privacy',
    riskLevel: 'safe',
    checkCommand: `try { $v = (Get-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Siuf\\Rules' -Name 'NumberOfSIUFInPeriod' -ErrorAction Stop).NumberOfSIUFInPeriod; if ($v -eq 0) { 'true' } else { 'false' } } catch { 'false' }`,
    applyCommand: `New-Item -Path 'HKCU:\\Software\\Microsoft\\Siuf\\Rules' -Force | Out-Null; Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Siuf\\Rules' -Name 'NumberOfSIUFInPeriod' -Value 0 -Type DWord -Force`,
    revertCommand: `Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Siuf\\Rules' -Name 'NumberOfSIUFInPeriod' -ErrorAction SilentlyContinue`
  },

  // ── Security ──
  {
    id: 'security-rdp',
    name: 'Disable Remote Desktop',
    description: 'Blocks remote desktop connections to your computer for added security.',
    category: 'security',
    riskLevel: 'safe',
    checkCommand: `try { $v = (Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server' -Name 'fDenyTSConnections' -ErrorAction Stop).fDenyTSConnections; if ($v -eq 1) { 'true' } else { 'false' } } catch { 'false' }`,
    applyCommand: `Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server' -Name 'fDenyTSConnections' -Value 1 -Type DWord -Force`,
    revertCommand: `Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server' -Name 'fDenyTSConnections' -Value 0 -Type DWord -Force`
  },
  {
    id: 'security-firewall',
    name: 'Enable Firewall',
    description: 'Ensures Windows Firewall is enabled for all network profiles.',
    category: 'security',
    riskLevel: 'safe',
    checkCommand: `$fw = netsh advfirewall show allprofiles state; if ($fw -match 'ON' -and $fw -notmatch 'OFF') { 'true' } else { 'false' }`,
    applyCommand: `netsh advfirewall set allprofiles state on`,
    revertCommand: `netsh advfirewall set allprofiles state on`
  },
  {
    id: 'security-remote-assistance',
    name: 'Disable Remote Assistance',
    description: 'Prevents others from remotely connecting to help with your PC.',
    category: 'security',
    riskLevel: 'safe',
    checkCommand: `try { $v = (Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Remote Assistance' -Name 'fAllowToGetHelp' -ErrorAction Stop).fAllowToGetHelp; if ($v -eq 0) { 'true' } else { 'false' } } catch { 'false' }`,
    applyCommand: `Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Remote Assistance' -Name 'fAllowToGetHelp' -Value 0 -Type DWord -Force`,
    revertCommand: `Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Remote Assistance' -Name 'fAllowToGetHelp' -Value 1 -Type DWord -Force`
  },

  // ── Performance ──
  {
    id: 'performance-visual-effects',
    name: 'Disable Visual Effects',
    description: 'Sets Windows to best performance mode, reducing visual animations.',
    category: 'performance',
    riskLevel: 'safe',
    checkCommand: `try { $v = (Get-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects' -Name 'VisualFXSetting' -ErrorAction Stop).VisualFXSetting; if ($v -eq 2) { 'true' } else { 'false' } } catch { 'false' }`,
    applyCommand: `New-Item -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects' -Force | Out-Null; Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects' -Name 'VisualFXSetting' -Value 2 -Type DWord -Force`,
    revertCommand: `Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects' -Name 'VisualFXSetting' -Value 1 -Type DWord -Force`
  },
  {
    id: 'performance-transparency',
    name: 'Disable Transparency',
    description: 'Turns off transparency effects in Windows for better performance.',
    category: 'performance',
    riskLevel: 'safe',
    checkCommand: `try { $v = (Get-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' -Name 'EnableTransparency' -ErrorAction Stop).EnableTransparency; if ($v -eq 0) { 'true' } else { 'false' } } catch { 'false' }`,
    applyCommand: `Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' -Name 'EnableTransparency' -Value 0 -Type DWord -Force`,
    revertCommand: `Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' -Name 'EnableTransparency' -Value 1 -Type DWord -Force`
  },
  {
    id: 'performance-sysmain',
    name: 'Disable SysMain (Superfetch)',
    description: 'Disables the SysMain service which can cause high disk usage.',
    category: 'performance',
    riskLevel: 'moderate',
    checkCommand: `try { $s = Get-Service SysMain -ErrorAction Stop; if ($s.StartType -eq 'Disabled') { 'true' } else { 'false' } } catch { 'false' }`,
    applyCommand: `Stop-Service SysMain -Force -ErrorAction SilentlyContinue; Set-Service SysMain -StartupType Disabled`,
    revertCommand: `Set-Service SysMain -StartupType Automatic; Start-Service SysMain -ErrorAction SilentlyContinue`
  },
  {
    id: 'performance-search-indexing',
    name: 'Disable Search Indexing',
    description: 'Disables Windows Search indexing service to reduce disk and CPU usage.',
    category: 'performance',
    riskLevel: 'moderate',
    checkCommand: `try { $s = Get-Service WSearch -ErrorAction Stop; if ($s.StartType -eq 'Disabled') { 'true' } else { 'false' } } catch { 'false' }`,
    applyCommand: `Stop-Service WSearch -Force -ErrorAction SilentlyContinue; Set-Service WSearch -StartupType Disabled`,
    revertCommand: `Set-Service WSearch -StartupType Automatic; Start-Service WSearch -ErrorAction SilentlyContinue`
  },
  {
    id: 'performance-power-plan',
    name: 'Set High Performance Power Plan',
    description: 'Switches to the High Performance power plan for maximum CPU speed.',
    category: 'performance',
    riskLevel: 'safe',
    checkCommand: `$active = powercfg /getactivescheme; if ($active -match '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c') { 'true' } else { 'false' }`,
    applyCommand: `powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c`,
    revertCommand: `powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e`
  },

  // ── Gaming ──
  {
    id: 'gaming-game-mode',
    name: 'Enable Game Mode',
    description: 'Enables Windows Game Mode for optimized gaming performance.',
    category: 'gaming',
    riskLevel: 'safe',
    checkCommand: `try { $v = (Get-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\GameBar' -Name 'AllowAutoGameMode' -ErrorAction Stop).AllowAutoGameMode; if ($v -eq 1) { 'true' } else { 'false' } } catch { 'false' }`,
    applyCommand: `New-Item -Path 'HKCU:\\Software\\Microsoft\\GameBar' -Force | Out-Null; Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\GameBar' -Name 'AllowAutoGameMode' -Value 1 -Type DWord -Force`,
    revertCommand: `Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\GameBar' -Name 'AllowAutoGameMode' -Value 0 -Type DWord -Force`
  },
  {
    id: 'gaming-game-bar',
    name: 'Disable Game Bar',
    description: 'Disables the Xbox Game Bar overlay to free up system resources.',
    category: 'gaming',
    riskLevel: 'safe',
    checkCommand: `try { $v = (Get-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR' -Name 'AppCaptureEnabled' -ErrorAction Stop).AppCaptureEnabled; if ($v -eq 0) { 'true' } else { 'false' } } catch { 'false' }`,
    applyCommand: `New-Item -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR' -Force | Out-Null; Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR' -Name 'AppCaptureEnabled' -Value 0 -Type DWord -Force`,
    revertCommand: `Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR' -Name 'AppCaptureEnabled' -Value 1 -Type DWord -Force`
  },
  {
    id: 'gaming-nagle',
    name: 'Disable Nagle Algorithm',
    description: 'Reduces network latency in games by disabling TCP packet batching.',
    category: 'gaming',
    riskLevel: 'advanced',
    checkCommand: `try { $interfaces = Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces'; $found = $false; foreach ($iface in $interfaces) { try { $v = (Get-ItemProperty -Path $iface.PSPath -Name 'TcpAckFrequency' -ErrorAction Stop).TcpAckFrequency; if ($v -eq 1) { $found = $true; break } } catch {} }; if ($found) { 'true' } else { 'false' } } catch { 'false' }`,
    applyCommand: `$interfaces = Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces'; foreach ($iface in $interfaces) { Set-ItemProperty -Path $iface.PSPath -Name 'TcpAckFrequency' -Value 1 -Type DWord -Force; Set-ItemProperty -Path $iface.PSPath -Name 'TCPNoDelay' -Value 1 -Type DWord -Force }`,
    revertCommand: `$interfaces = Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces'; foreach ($iface in $interfaces) { Remove-ItemProperty -Path $iface.PSPath -Name 'TcpAckFrequency' -ErrorAction SilentlyContinue; Remove-ItemProperty -Path $iface.PSPath -Name 'TCPNoDelay' -ErrorAction SilentlyContinue }`
  },

  // ── Power ──
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
  {
    id: 'power-usb-suspend',
    name: 'Disable USB Selective Suspend',
    description: 'Prevents Windows from powering down USB devices to save energy.',
    category: 'power',
    riskLevel: 'moderate',
    checkCommand: `try { $v = (Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB' -Name 'DisableSelectiveSuspend' -ErrorAction Stop).DisableSelectiveSuspend; if ($v -eq 1) { 'true' } else { 'false' } } catch { 'false' }`,
    applyCommand: `New-Item -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB' -Force | Out-Null; Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB' -Name 'DisableSelectiveSuspend' -Value 1 -Type DWord -Force`,
    revertCommand: `Remove-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB' -Name 'DisableSelectiveSuspend' -ErrorAction SilentlyContinue`
  },
  {
    id: 'power-hibernation',
    name: 'Disable Hibernation',
    description: 'Turns off hibernation to free up disk space used by hiberfil.sys.',
    category: 'power',
    riskLevel: 'safe',
    checkCommand: `$h = powercfg /a; if ($h -match 'Hibernation has not been enabled' -or $h -match 'Hibernate.*not available') { 'true' } else { 'false' }`,
    applyCommand: `powercfg /hibernate off`,
    revertCommand: `powercfg /hibernate on`
  },

  // ── Network ──
  {
    id: 'network-throttling',
    name: 'Disable Network Throttling',
    description: 'Removes the built-in network throttling limit for higher throughput.',
    category: 'network',
    riskLevel: 'moderate',
    checkCommand: `try { $v = (Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile' -Name 'NetworkThrottlingIndex' -ErrorAction Stop).NetworkThrottlingIndex; if ($v -eq 0xffffffff -or $v -eq 4294967295) { 'true' } else { 'false' } } catch { 'false' }`,
    applyCommand: `Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile' -Name 'NetworkThrottlingIndex' -Value 0xffffffff -Type DWord -Force`,
    revertCommand: `Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile' -Name 'NetworkThrottlingIndex' -Value 10 -Type DWord -Force`
  },
  {
    id: 'network-dns-cache',
    name: 'Increase DNS Cache',
    description: 'Extends the DNS cache time-to-live to reduce DNS lookups.',
    category: 'network',
    riskLevel: 'safe',
    checkCommand: `try { $v = (Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters' -Name 'MaxCacheTtl' -ErrorAction Stop).MaxCacheTtl; if ($v -eq 86400) { 'true' } else { 'false' } } catch { 'false' }`,
    applyCommand: `Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters' -Name 'MaxCacheTtl' -Value 86400 -Type DWord -Force`,
    revertCommand: `Remove-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters' -Name 'MaxCacheTtl' -ErrorAction SilentlyContinue`
  },

  // ── UI/UX ──
  {
    id: 'uiux-animations',
    name: 'Disable Animations',
    description: 'Turns off window animations for a snappier desktop experience.',
    category: 'uiux',
    riskLevel: 'safe',
    checkCommand: `try { $v = (Get-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop\\WindowMetrics' -Name 'MinAnimate' -ErrorAction Stop).MinAnimate; if ($v -eq '0') { 'true' } else { 'false' } } catch { 'false' }`,
    applyCommand: `Set-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop\\WindowMetrics' -Name 'MinAnimate' -Value '0' -Type String -Force`,
    revertCommand: `Set-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop\\WindowMetrics' -Name 'MinAnimate' -Value '1' -Type String -Force`
  },
  {
    id: 'uiux-snap-assist',
    name: 'Disable Snap Assist Suggestions',
    description: 'Stops Windows from suggesting other windows when snapping.',
    category: 'uiux',
    riskLevel: 'safe',
    checkCommand: `try { $v = (Get-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name 'SnapAssist' -ErrorAction Stop).SnapAssist; if ($v -eq 0) { 'true' } else { 'false' } } catch { 'false' }`,
    applyCommand: `Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name 'SnapAssist' -Value 0 -Type DWord -Force`,
    revertCommand: `Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name 'SnapAssist' -Value 1 -Type DWord -Force`
  },
  {
    id: 'uiux-file-extensions',
    name: 'Show File Extensions',
    description: 'Makes file extensions visible in File Explorer for all files.',
    category: 'uiux',
    riskLevel: 'safe',
    checkCommand: `try { $v = (Get-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name 'HideFileExt' -ErrorAction Stop).HideFileExt; if ($v -eq 0) { 'true' } else { 'false' } } catch { 'false' }`,
    applyCommand: `Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name 'HideFileExt' -Value 0 -Type DWord -Force`,
    revertCommand: `Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name 'HideFileExt' -Value 1 -Type DWord -Force`
  },
  {
    id: 'uiux-startup-delay',
    name: 'Disable Startup Delay',
    description: 'Removes the artificial startup delay Windows adds to programs.',
    category: 'uiux',
    riskLevel: 'safe',
    checkCommand: `try { $v = (Get-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize' -Name 'StartupDelayInMSec' -ErrorAction Stop).StartupDelayInMSec; if ($v -eq 0) { 'true' } else { 'false' } } catch { 'false' }`,
    applyCommand: `New-Item -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize' -Force | Out-Null; Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize' -Name 'StartupDelayInMSec' -Value 0 -Type DWord -Force`,
    revertCommand: `Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize' -Name 'StartupDelayInMSec' -ErrorAction SilentlyContinue`
  },

  // ── Maintenance ──
  {
    id: 'maintenance-auto-restart',
    name: 'Disable Windows Update Auto-Restart',
    description: 'Prevents Windows from automatically restarting after installing updates.',
    category: 'maintenance',
    riskLevel: 'safe',
    checkCommand: `try { $v = (Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU' -Name 'NoAutoRebootWithLoggedOnUsers' -ErrorAction Stop).NoAutoRebootWithLoggedOnUsers; if ($v -eq 1) { 'true' } else { 'false' } } catch { 'false' }`,
    applyCommand: `New-Item -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU' -Force | Out-Null; Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU' -Name 'NoAutoRebootWithLoggedOnUsers' -Value 1 -Type DWord -Force`,
    revertCommand: `Remove-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU' -Name 'NoAutoRebootWithLoggedOnUsers' -ErrorAction SilentlyContinue`
  },
  {
    id: 'maintenance-dns-flush',
    name: 'Clear DNS Cache',
    description: 'Flushes the DNS resolver cache to fix connection issues.',
    category: 'maintenance',
    riskLevel: 'safe',
    checkCommand: `'false'`,
    applyCommand: `ipconfig /flushdns`,
    revertCommand: `Write-Output 'DNS cache cleared - no revert needed'`
  },
  {
    id: 'maintenance-defrag',
    name: 'Disable Defrag Schedule',
    description: 'Disables the automatic defragmentation schedule (recommended for SSDs).',
    category: 'maintenance',
    riskLevel: 'moderate',
    checkCommand: `try { $task = schtasks /Query /TN '\\Microsoft\\Windows\\Defrag\\ScheduledDefrag' /FO CSV /NH 2>&1; if ($task -match 'Disabled') { 'true' } else { 'false' } } catch { 'false' }`,
    applyCommand: `schtasks /Change /TN '\\Microsoft\\Windows\\Defrag\\ScheduledDefrag' /Disable`,
    revertCommand: `schtasks /Change /TN '\\Microsoft\\Windows\\Defrag\\ScheduledDefrag' /Enable`
  }
]

// ──────────────────────────────────────────────
// Category Metadata
// ──────────────────────────────────────────────

export interface CategoryDefinition {
  id: string
  name: string
  description: string
  icon: string
}

const CATEGORIES: CategoryDefinition[] = [
  { id: 'privacy', name: 'Privacy', description: 'Control data collection and tracking', icon: 'Shield' },
  { id: 'security', name: 'Security', description: 'Harden your system against threats', icon: 'Lock' },
  { id: 'performance', name: 'Performance', description: 'Speed up your system response time', icon: 'Zap' },
  { id: 'gaming', name: 'Gaming', description: 'Optimize for the best gaming experience', icon: 'Gamepad2' },
  { id: 'power', name: 'Power', description: 'Manage power settings and efficiency', icon: 'Battery' },
  { id: 'network', name: 'Network', description: 'Improve network speed and reliability', icon: 'Globe' },
  { id: 'uiux', name: 'UI/UX', description: 'Customize your desktop experience', icon: 'Palette' },
  { id: 'maintenance', name: 'Maintenance', description: 'Keep your system clean and healthy', icon: 'Wrench' }
]

// ──────────────────────────────────────────────
// Backup Management
// ──────────────────────────────────────────────

function getBackupPath(): string {
  return join(app.getPath('userData'), 'optimizer-backup.json')
}

function loadBackup(): BackupData {
  try {
    const backupPath = getBackupPath()
    if (existsSync(backupPath)) {
      const raw = readFileSync(backupPath, 'utf-8')
      return JSON.parse(raw)
    }
  } catch {
    // ignore
  }
  return {}
}

function saveBackup(data: BackupData): void {
  try {
    writeFileSync(getBackupPath(), JSON.stringify(data, null, 2), 'utf-8')
  } catch {
    // ignore
  }
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

export function getAllTweaks(): TweakDefinition[] {
  return TWEAKS
}

export function getCategories(): CategoryDefinition[] {
  return CATEGORIES
}

export async function checkTweakStatus(tweakId: string): Promise<boolean> {
  const tweak = TWEAKS.find((t) => t.id === tweakId)
  if (!tweak) return false

  try {
    const result = await runPowerShell(tweak.checkCommand)
    return result.trim().toLowerCase() === 'true'
  } catch {
    return false
  }
}

export async function checkCategoryStatus(
  categoryId: string
): Promise<Record<string, boolean>> {
  const tweaks = TWEAKS.filter((t) => t.category === categoryId)
  const status: Record<string, boolean> = {}

  for (const tweak of tweaks) {
    status[tweak.id] = await checkTweakStatus(tweak.id)
  }

  return status
}

export async function checkAllStatus(): Promise<Record<string, boolean>> {
  const status: Record<string, boolean> = {}

  for (const tweak of TWEAKS) {
    status[tweak.id] = await checkTweakStatus(tweak.id)
  }

  return status
}

export async function applyTweak(tweakId: string): Promise<{ success: boolean; error?: string }> {
  const tweak = TWEAKS.find((t) => t.id === tweakId)
  if (!tweak) return { success: false, error: 'Tweak not found' }

  try {
    // Save current state before applying
    const backup = loadBackup()
    const currentState = await checkTweakStatus(tweakId)

    if (!backup[tweakId]) {
      backup[tweakId] = {
        originalValue: currentState ? 'true' : 'false',
        appliedAt: Date.now()
      }
      saveBackup(backup)
    }

    await runPowerShell(tweak.applyCommand)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unknown error' }
  }
}

export async function applyTweaks(
  tweakIds: string[]
): Promise<Record<string, { success: boolean; error?: string }>> {
  const results: Record<string, { success: boolean; error?: string }> = {}

  for (const id of tweakIds) {
    results[id] = await applyTweak(id)
  }

  return results
}

export async function revertTweak(tweakId: string): Promise<{ success: boolean; error?: string }> {
  const tweak = TWEAKS.find((t) => t.id === tweakId)
  if (!tweak) return { success: false, error: 'Tweak not found' }

  try {
    await runPowerShell(tweak.revertCommand)

    // Remove from backup
    const backup = loadBackup()
    delete backup[tweakId]
    saveBackup(backup)

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unknown error' }
  }
}

export async function revertAll(): Promise<Record<string, { success: boolean; error?: string }>> {
  const backup = loadBackup()
  const results: Record<string, { success: boolean; error?: string }> = {}

  for (const tweakId of Object.keys(backup)) {
    results[tweakId] = await revertTweak(tweakId)
  }

  return results
}

export function getBackupData(): BackupData {
  return loadBackup()
}

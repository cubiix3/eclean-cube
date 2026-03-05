import { app, shell } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs'
import { runPowerShell, runPowerShellJSON } from './powershell'
import { sanitizeForPS, sanitizePath } from './sanitize'

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface InstalledApp {
  DisplayName: string
  DisplayVersion: string | null
  Publisher: string | null
  InstallDate: string | null
  EstimatedSize: number | null
  UninstallString: string | null
  InstallLocation: string | null
}

export interface UwpApp {
  Name: string
  PackageFullName: string
  Version: string
  Publisher: string
  InstallLocation: string | null
}

export interface BrowserExtension {
  id: string
  name: string
  version: string
  description: string
  browser: string
}

export interface LeftoverItem {
  path: string
  type: 'file' | 'registry'
  confidence: 'high' | 'medium' | 'low'
  size?: number
}

export interface UninstallHistoryEntry {
  appName: string
  timestamp: number
  type: 'win32' | 'uwp'
}

// ──────────────────────────────────────────────
// History Management
// ──────────────────────────────────────────────

function getHistoryPath(): string {
  return join(app.getPath('userData'), 'uninstall-history.json')
}

function loadHistory(): UninstallHistoryEntry[] {
  try {
    const historyPath = getHistoryPath()
    if (existsSync(historyPath)) {
      const raw = readFileSync(historyPath, 'utf-8')
      return JSON.parse(raw)
    }
  } catch {
    // ignore
  }
  return []
}

function saveHistory(data: UninstallHistoryEntry[]): void {
  try {
    writeFileSync(getHistoryPath(), JSON.stringify(data, null, 2), 'utf-8')
  } catch {
    // ignore
  }
}

function addHistoryEntry(appName: string, type: 'win32' | 'uwp'): void {
  const history = loadHistory()
  history.unshift({ appName, timestamp: Date.now(), type })
  // Keep only the last 100 entries
  if (history.length > 100) history.length = 100
  saveHistory(history)
}

// ──────────────────────────────────────────────
// Win32 Desktop Apps
// ──────────────────────────────────────────────

export async function getInstalledApps(): Promise<InstalledApp[]> {
  try {
    const cmd = `Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*, HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*, HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName } | Sort-Object DisplayName -Unique | Select-Object DisplayName, DisplayVersion, Publisher, InstallDate, EstimatedSize, UninstallString, InstallLocation`
    const result = await runPowerShellJSON<InstalledApp | InstalledApp[]>(cmd)
    // PowerShell returns single object when only one, array when multiple
    return Array.isArray(result) ? result : [result]
  } catch {
    return []
  }
}

export async function uninstallApp(
  uninstallString: string,
  appName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Clean up the uninstall string - handle MsiExec and direct executables
    let cmd = uninstallString.trim()

    if (cmd.toLowerCase().includes('msiexec')) {
      // For MSI-based uninstallers, add /quiet /norestart flags
      if (!cmd.includes('/quiet') && !cmd.includes('/qn')) {
        cmd = cmd.replace(/\/I/i, '/X')
        // Don't force silent - let the user interact with the uninstaller
      }
    }

    // Execute the uninstall string
    await runPowerShell(`Start-Process -FilePath cmd.exe -ArgumentList '/c', '${cmd.replace(/'/g, "''")}' -Wait -NoNewWindow`)

    addHistoryEntry(appName, 'win32')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Uninstall failed' }
  }
}

// ──────────────────────────────────────────────
// UWP / Store Apps
// ──────────────────────────────────────────────

export async function getUwpApps(): Promise<UwpApp[]> {
  try {
    const cmd = `Get-AppxPackage | Select-Object Name, PackageFullName, Version, Publisher, InstallLocation`
    const result = await runPowerShellJSON<UwpApp | UwpApp[]>(cmd)
    return Array.isArray(result) ? result : [result]
  } catch {
    return []
  }
}

export async function removeUwpApp(
  packageFullName: string,
  appName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await runPowerShell(`Remove-AppxPackage -Package '${packageFullName}'`)
    addHistoryEntry(appName, 'uwp')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Removal failed' }
  }
}

// ──────────────────────────────────────────────
// Browser Extensions
// ──────────────────────────────────────────────

function readExtensionManifest(manifestPath: string): { name: string; version: string; description: string } | null {
  try {
    if (!existsSync(manifestPath)) return null
    const raw = readFileSync(manifestPath, 'utf-8')
    const manifest = JSON.parse(raw)
    return {
      name: manifest.name || 'Unknown',
      version: manifest.version || 'Unknown',
      description: manifest.description || ''
    }
  } catch {
    return null
  }
}

function scanBrowserExtensions(extensionsPath: string, browser: string): BrowserExtension[] {
  const extensions: BrowserExtension[] = []

  try {
    if (!existsSync(extensionsPath)) return extensions

    const extDirs = readdirSync(extensionsPath)

    for (const extId of extDirs) {
      const extPath = join(extensionsPath, extId)
      try {
        const stat = statSync(extPath)
        if (!stat.isDirectory()) continue

        // Each extension has version folders
        const versionDirs = readdirSync(extPath)
        for (const version of versionDirs) {
          const versionPath = join(extPath, version)
          try {
            const vStat = statSync(versionPath)
            if (!vStat.isDirectory()) continue

            const manifestPath = join(versionPath, 'manifest.json')
            const manifest = readExtensionManifest(manifestPath)
            if (manifest) {
              // Skip internal Chrome/Edge extensions with __MSG_ names
              let name = manifest.name
              if (name.startsWith('__MSG_')) {
                // Try to read _locales/en/messages.json for the actual name
                const messagesPath = join(versionPath, '_locales', 'en', 'messages.json')
                try {
                  if (existsSync(messagesPath)) {
                    const messages = JSON.parse(readFileSync(messagesPath, 'utf-8'))
                    const msgKey = name.replace('__MSG_', '').replace('__', '')
                    const msgEntry = messages[msgKey] || messages[msgKey.toLowerCase()]
                    if (msgEntry?.message) {
                      name = msgEntry.message
                    }
                  }
                } catch {
                  // keep original name
                }
              }

              extensions.push({
                id: extId,
                name,
                version: manifest.version,
                description: manifest.description,
                browser
              })
              break // Only take the first (latest) version folder
            }
          } catch {
            continue
          }
        }
      } catch {
        continue
      }
    }
  } catch {
    // ignore
  }

  return extensions
}

export async function getBrowserExtensions(): Promise<BrowserExtension[]> {
  const localAppData = process.env.LOCALAPPDATA || ''
  const appData = process.env.APPDATA || ''
  const extensions: BrowserExtension[] = []

  // Chrome
  const chromePath = join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Extensions')
  extensions.push(...scanBrowserExtensions(chromePath, 'Chrome'))

  // Edge
  const edgePath = join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'Extensions')
  extensions.push(...scanBrowserExtensions(edgePath, 'Edge'))

  // Firefox - profiles based
  const firefoxProfilesPath = join(appData, 'Mozilla', 'Firefox', 'Profiles')
  try {
    if (existsSync(firefoxProfilesPath)) {
      const profiles = readdirSync(firefoxProfilesPath)
      for (const profile of profiles) {
        const ffExtPath = join(firefoxProfilesPath, profile, 'extensions')
        if (existsSync(ffExtPath)) {
          // Firefox extensions are different - they're .xpi files or folders
          // We'll look for manifest.json in unpacked extensions
          const items = readdirSync(ffExtPath)
          for (const item of items) {
            const itemPath = join(ffExtPath, item)
            try {
              const stat = statSync(itemPath)
              if (stat.isDirectory()) {
                const manifestPath = join(itemPath, 'manifest.json')
                const manifest = readExtensionManifest(manifestPath)
                if (manifest) {
                  extensions.push({
                    id: item,
                    name: manifest.name,
                    version: manifest.version,
                    description: manifest.description,
                    browser: 'Firefox'
                  })
                }
              }
            } catch {
              continue
            }
          }
          break // Only scan first profile
        }
      }
    }
  } catch {
    // ignore
  }

  return extensions
}

export async function openExtensionsPage(browser: string): Promise<void> {
  switch (browser.toLowerCase()) {
    case 'chrome':
      shell.openExternal('chrome://extensions')
      break
    case 'edge':
      shell.openExternal('edge://extensions')
      break
    case 'firefox':
      shell.openExternal('about:addons')
      break
    default:
      break
  }
}

// ──────────────────────────────────────────────
// Leftover Detection
// ──────────────────────────────────────────────

export async function scanLeftovers(appName: string): Promise<LeftoverItem[]> {
  const leftovers: LeftoverItem[] = []
  const searchName = sanitizeForPS(appName.trim())

  if (!searchName) return leftovers

  // Already sanitized above
  const escapedName = searchName

  // File/folder search
  try {
    const fileCmd = `Get-ChildItem -Path 'C:\\Program Files','C:\\Program Files (x86)',$env:APPDATA,$env:LOCALAPPDATA -Filter '*${escapedName}*' -Directory -ErrorAction SilentlyContinue -Depth 2 | Select-Object FullName, @{N='SizeBytes';E={(Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum}}`
    const fileResult = await runPowerShellJSON<any>(fileCmd)
    const files = Array.isArray(fileResult) ? fileResult : fileResult ? [fileResult] : []

    for (const f of files) {
      if (!f.FullName) continue
      const fullNameLower = f.FullName.toLowerCase()
      const appNameLower = searchName.toLowerCase()

      // Determine confidence
      let confidence: 'high' | 'medium' | 'low' = 'low'
      const folderName = f.FullName.split('\\').pop()?.toLowerCase() || ''

      if (folderName === appNameLower) {
        confidence = 'high'
      } else if (folderName.includes(appNameLower)) {
        confidence = 'high'
      } else if (fullNameLower.includes('program files') || fullNameLower.includes('appdata')) {
        confidence = 'medium'
      }

      leftovers.push({
        path: f.FullName,
        type: 'file',
        confidence,
        size: f.SizeBytes || 0
      })
    }
  } catch {
    // ignore
  }

  // Registry search
  try {
    const regCmd = `Get-ChildItem -Path 'HKCU:\\Software','HKLM:\\Software' -ErrorAction SilentlyContinue | Where-Object { $_.Name -like '*${escapedName}*' } | Select-Object @{N='FullPath';E={$_.Name}}`
    const regResult = await runPowerShellJSON<any>(regCmd)
    const regs = Array.isArray(regResult) ? regResult : regResult ? [regResult] : []

    for (const r of regs) {
      if (!r.FullPath) continue
      const keyName = r.FullPath.split('\\').pop()?.toLowerCase() || ''
      const appNameLower = searchName.toLowerCase()

      let confidence: 'high' | 'medium' | 'low' = 'low'
      if (keyName === appNameLower) {
        confidence = 'high'
      } else if (keyName.includes(appNameLower)) {
        confidence = 'medium'
      }

      leftovers.push({
        path: r.FullPath,
        type: 'registry',
        confidence
      })
    }
  } catch {
    // ignore
  }

  // Sort by confidence: high first, then medium, then low
  const order = { high: 0, medium: 1, low: 2 }
  leftovers.sort((a, b) => order[a.confidence] - order[b.confidence])

  return leftovers
}

export async function cleanLeftovers(
  items: { path: string; type: 'file' | 'registry' }[]
): Promise<{ success: string[]; errors: string[] }> {
  const success: string[] = []
  const errors: string[] = []

  for (const item of items) {
    try {
      if (item.type === 'file') {
        const safePath = sanitizePath(item.path).replace(/'/g, "''")
        await runPowerShell(`Remove-Item -Path '${safePath}' -Recurse -Force -ErrorAction Stop`)
        success.push(item.path)
      } else if (item.type === 'registry') {
        // Convert HKEY_CURRENT_USER/HKEY_LOCAL_MACHINE to HKCU:/HKLM: format
        let regPath = sanitizeForPS(item.path)
        regPath = regPath.replace('HKEY_CURRENT_USER', 'HKCU:')
        regPath = regPath.replace('HKEY_LOCAL_MACHINE', 'HKLM:')
        await runPowerShell(`Remove-Item -Path '${regPath}' -Recurse -Force -ErrorAction Stop`)
        success.push(item.path)
      }
    } catch (err: any) {
      errors.push(`${item.path}: ${err?.message || 'Failed to remove'}`)
    }
  }

  return { success, errors }
}

// ──────────────────────────────────────────────
// History
// ──────────────────────────────────────────────

export function getUninstallHistory(): UninstallHistoryEntry[] {
  return loadHistory()
}

// ──────────────────────────────────────────────
// Browser Extension Security Scanner
// ──────────────────────────────────────────────

export interface ExtensionSecurityInfo {
  id: string
  name: string
  browser: string
  version: string
  permissions: string[]
  riskScore: number // 0-100
  riskLevel: 'safe' | 'moderate' | 'dangerous'
  warnings: string[]
}

const DANGEROUS_PERMISSIONS = [
  'webRequest', 'webRequestBlocking', 'nativeMessaging', 'debugger',
  'proxy', 'privacy', 'management', 'downloads', 'history',
  'bookmarks', 'topSites', 'browsingData'
]
const MODERATE_PERMISSIONS = [
  'tabs', 'cookies', 'storage', 'notifications', 'clipboardRead',
  'clipboardWrite', 'geolocation', 'identity'
]

function calculateExtensionRisk(permissions: string[], hostPermissions: string[]): { score: number; warnings: string[] } {
  let score = 0
  const warnings: string[] = []

  for (const perm of permissions) {
    if (DANGEROUS_PERMISSIONS.includes(perm)) {
      score += 20
      warnings.push(`High-risk permission: ${perm}`)
    } else if (MODERATE_PERMISSIONS.includes(perm)) {
      score += 8
    }
  }

  // Check for broad host access
  for (const host of hostPermissions) {
    if (host === '<all_urls>' || host === '*://*/*') {
      score += 30
      warnings.push('Can access ALL websites')
    } else if (host.includes('*')) {
      score += 5
    }
  }

  return { score: Math.min(score, 100), warnings }
}

function readManifestFull(manifestPath: string): any | null {
  try {
    if (!existsSync(manifestPath)) return null
    return JSON.parse(readFileSync(manifestPath, 'utf-8'))
  } catch {
    return null
  }
}

export function scanExtensionSecurity(): ExtensionSecurityInfo[] {
  const localAppData = process.env.LOCALAPPDATA || ''
  const results: ExtensionSecurityInfo[] = []

  const browsers: { name: string; extPath: string }[] = [
    { name: 'Chrome', extPath: join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Extensions') },
    { name: 'Edge', extPath: join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'Extensions') }
  ]

  for (const browser of browsers) {
    try {
      if (!existsSync(browser.extPath)) continue
      const extDirs = readdirSync(browser.extPath)

      for (const extId of extDirs) {
        const extPath = join(browser.extPath, extId)
        try {
          if (!statSync(extPath).isDirectory()) continue
          const versionDirs = readdirSync(extPath)

          for (const version of versionDirs) {
            const manifestPath = join(extPath, version, 'manifest.json')
            const manifest = readManifestFull(manifestPath)
            if (!manifest) continue

            let name = manifest.name || extId
            if (name.startsWith('__MSG_')) {
              const msgPath = join(extPath, version, '_locales', 'en', 'messages.json')
              try {
                if (existsSync(msgPath)) {
                  const msgs = JSON.parse(readFileSync(msgPath, 'utf-8'))
                  const key = name.replace('__MSG_', '').replace('__', '')
                  name = msgs[key]?.message || msgs[key.toLowerCase()]?.message || name
                }
              } catch { /* keep original */ }
            }

            const permissions = manifest.permissions || []
            const hostPerms = manifest.host_permissions || manifest.optional_permissions || []
            const { score, warnings } = calculateExtensionRisk(permissions, hostPerms)

            results.push({
              id: extId,
              name,
              browser: browser.name,
              version: manifest.version || 'Unknown',
              permissions,
              riskScore: score,
              riskLevel: score >= 50 ? 'dangerous' : score >= 20 ? 'moderate' : 'safe',
              warnings
            })
            break // Only first version dir
          }
        } catch { continue }
      }
    } catch { continue }
  }

  return results.sort((a, b) => b.riskScore - a.riskScore)
}

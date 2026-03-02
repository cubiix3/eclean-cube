import { runPowerShell } from './powershell'
import { sanitizePath, sanitizeNumber } from './sanitize'
import { app } from 'electron'
import path from 'path'

export interface JunkCategory {
  id: string
  name: string
  items: JunkItem[]
  totalSize: number
}

export interface JunkItem {
  path: string
  name: string
  size: number
  selected: boolean
}

export interface LargeFile {
  path: string
  name: string
  size: number
  modified: string
}

// Junk scan paths per category
const BROWSER_PATHS: Record<string, string> = {
  'Chrome Cache': path.join(app.getPath('home'), 'AppData/Local/Google/Chrome/User Data/Default/Cache'),
  'Chrome Code Cache': path.join(app.getPath('home'), 'AppData/Local/Google/Chrome/User Data/Default/Code Cache'),
  'Edge Cache': path.join(app.getPath('home'), 'AppData/Local/Microsoft/Edge/User Data/Default/Cache'),
  'Edge Code Cache': path.join(app.getPath('home'), 'AppData/Local/Microsoft/Edge/User Data/Default/Code Cache'),
  'Firefox Cache': path.join(app.getPath('home'), 'AppData/Local/Mozilla/Firefox/Profiles'),
  'Brave Cache': path.join(app.getPath('home'), 'AppData/Local/BraveSoftware/Brave-Browser/User Data/Default/Cache'),
  'Opera Cache': path.join(app.getPath('home'), 'AppData/Local/Opera Software/Opera Stable/Cache')
}

const SYSTEM_PATHS: Record<string, string> = {
  'Windows Temp': 'C:\\Windows\\Temp',
  'User Temp': path.join(app.getPath('home'), 'AppData/Local/Temp'),
  'Thumbnails': path.join(app.getPath('home'), 'AppData/Local/Microsoft/Windows/Explorer'),
  'Windows Logs': 'C:\\Windows\\Logs'
}

const APP_PATHS: Record<string, string> = {
  'Discord Cache': path.join(app.getPath('home'), 'AppData/Roaming/discord/Cache'),
  'Spotify Cache': path.join(app.getPath('home'), 'AppData/Local/Spotify/Storage'),
  'VS Code Cache': path.join(app.getPath('home'), 'AppData/Roaming/Code/Cache'),
  'Teams Cache': path.join(app.getPath('home'), 'AppData/Roaming/Microsoft/Teams/Cache')
}

const GAME_PATHS: Record<string, string> = {
  'Steam Shader Cache': path.join(app.getPath('home'), 'AppData/Local/Steam/htmlcache'),
  'Steam Download Cache': 'C:\\Program Files (x86)\\Steam\\depotcache',
  'Epic Games Cache': path.join(app.getPath('home'), 'AppData/Local/EpicGamesLauncher/Saved'),
  'NVIDIA Shader Cache': path.join(app.getPath('home'), 'AppData/Local/NVIDIA/DXCache'),
  'AMD Shader Cache': path.join(app.getPath('home'), 'AppData/Local/AMD/DxCache')
}

export async function scanJunkCategory(categoryId: string): Promise<JunkCategory> {
  let pathMap: Record<string, string>
  let name: string

  switch (categoryId) {
    case 'browsers':
      pathMap = BROWSER_PATHS
      name = 'Browsers'
      break
    case 'system':
      pathMap = SYSTEM_PATHS
      name = 'System'
      break
    case 'apps':
      pathMap = APP_PATHS
      name = 'Applications'
      break
    case 'games':
      pathMap = GAME_PATHS
      name = 'Games'
      break
    default:
      return { id: categoryId, name: 'Unknown', items: [], totalSize: 0 }
  }

  const items: JunkItem[] = []

  for (const [itemName, itemPath] of Object.entries(pathMap)) {
    try {
      const escapedPath = itemPath.replace(/'/g, "''")
      const sizeStr = await runPowerShell(
        `if (Test-Path '${escapedPath}') { (Get-ChildItem '${escapedPath}' -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum } else { 0 }`
      )
      const size = parseInt(sizeStr) || 0
      if (size > 0) {
        items.push({ path: itemPath, name: itemName, size, selected: true })
      }
    } catch {
      // Path doesn't exist or no permission
    }
  }

  const totalSize = items.reduce((sum, item) => sum + item.size, 0)
  return { id: categoryId, name, items, totalSize }
}

export async function cleanJunkItems(
  paths: string[]
): Promise<{ cleaned: number; errors: string[] }> {
  let cleaned = 0
  const errors: string[] = []

  for (const p of paths) {
    try {
      const escapedPath = sanitizePath(p).replace(/'/g, "''")
      await runPowerShell(
        `if (Test-Path '${escapedPath}') { Remove-Item '${escapedPath}\\*' -Recurse -Force -ErrorAction SilentlyContinue }`
      )
      cleaned++
    } catch (e: any) {
      errors.push(`Failed to clean ${p}: ${e.message}`)
    }
  }

  return { cleaned, errors }
}

export async function findLargeFiles(
  driveLetter: string = 'C',
  minSizeMB: number = 100
): Promise<LargeFile[]> {
  try {
    const safeDrive = sanitizePath(driveLetter).charAt(0) || 'C'
    const safeMinSize = sanitizeNumber(minSizeMB)
    const result = await runPowerShell(
      `Get-ChildItem -Path '${safeDrive}:\\' -Recurse -File -Force -ErrorAction SilentlyContinue | Where-Object { $_.Length -gt ${safeMinSize * 1024 * 1024} } | Sort-Object Length -Descending | Select-Object -First 50 FullName, Name, Length, LastWriteTime | ConvertTo-Json -Depth 3`
    )
    if (!result) return []
    const parsed = JSON.parse(result)
    const files = Array.isArray(parsed) ? parsed : [parsed]
    return files.map((f: any) => ({
      path: f.FullName,
      name: f.Name,
      size: f.Length,
      modified: f.LastWriteTime
    }))
  } catch {
    return []
  }
}

export async function getRecycleBinSize(): Promise<number> {
  try {
    const result = await runPowerShell(
      `(New-Object -ComObject Shell.Application).NameSpace(0xa).Items() | Measure-Object -Property Size -Sum | Select-Object -ExpandProperty Sum`
    )
    return parseInt(result) || 0
  } catch {
    return 0
  }
}

export async function emptyRecycleBin(): Promise<void> {
  await runPowerShell(`Clear-RecycleBin -Force -ErrorAction SilentlyContinue`)
}

export async function shredFiles(
  filePaths: string[]
): Promise<{ success: string[]; errors: string[] }> {
  const success: string[] = []
  const errors: string[] = []

  for (const filePath of filePaths) {
    try {
      const escapedPath = sanitizePath(filePath).replace(/'/g, "''")
      // Overwrite with random data 3 times then delete
      await runPowerShell(
        `$p = '${escapedPath}'; if (Test-Path $p -PathType Leaf) { $s = (Get-Item $p).Length; $b = New-Object byte[] ([math]::Min($s, 1048576)); for ($i=0; $i -lt 3; $i++) { $f = [IO.File]::OpenWrite($p); $w = 0; while ($w -lt $s) { (New-Object Random).NextBytes($b); $c = [math]::Min($b.Length, $s - $w); $f.Write($b, 0, $c); $w += $c }; $f.Close() }; Remove-Item $p -Force } elseif (Test-Path $p) { Remove-Item $p -Recurse -Force }`
      )
      success.push(filePath)
    } catch (e: any) {
      errors.push(`${filePath}: ${e.message}`)
    }
  }

  return { success, errors }
}

export async function getAvailableDrives(): Promise<string[]> {
  try {
    const result = await runPowerShell(
      `Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | Select-Object -ExpandProperty DeviceID`
    )
    return result
      .split('\n')
      .map((d) => d.trim().replace(':', ''))
      .filter(Boolean)
  } catch {
    return ['C']
  }
}

export async function deleteFile(filePath: string): Promise<void> {
  const escapedPath = sanitizePath(filePath).replace(/'/g, "''")
  await runPowerShell(
    `if (Test-Path '${escapedPath}') { Remove-Item '${escapedPath}' -Force -ErrorAction Stop }`
  )
}

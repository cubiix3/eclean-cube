import { runPowerShell, runPowerShellJSON } from './powershell'

export interface RegistryIssue {
  id: string
  path: string
  name: string
  valueName?: string
  type: 'orphaned_software' | 'broken_path' | 'empty_key' | 'obsolete_installer' | 'broken_firewall'
  description: string
  severity: 'safe' | 'moderate' | 'risky'
}

export interface RegistryScanResult {
  issues: RegistryIssue[]
  scannedKeys: number
  scanTimeMs: number
}

let idCounter = 0

export async function scanRegistry(): Promise<RegistryScanResult> {
  const startTime = Date.now()
  const issues: RegistryIssue[] = []
  let scannedKeys = 0
  idCounter = 0

  // 1. Scan for orphaned uninstall entries (broken UninstallString)
  try {
    const uninstallResult = await runPowerShellJSON<any>(
      `$orphaned = @(); Get-ChildItem 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall' -ErrorAction SilentlyContinue | ForEach-Object { $props = Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue; if ($props.UninstallString -and $props.UninstallString -match '^[A-Z]:\\\\') { $exe = ($props.UninstallString -replace '"','') -replace ' /.*',''; if (-not (Test-Path $exe)) { $orphaned += @{Key=$_.PSChildName; Name=($props.DisplayName -as [string]); Exe=$exe} } } }; $orphaned | Select-Object -First 20`
    )
    const items = Array.isArray(uninstallResult) ? uninstallResult : uninstallResult ? [uninstallResult] : []
    scannedKeys += 200
    for (const item of items) {
      issues.push({
        id: `issue_${idCounter++}`,
        path: `HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${item.Key}`,
        name: item.Name || item.Key,
        type: 'orphaned_software',
        description: `Uninstaller points to missing executable: ${item.Exe}`,
        severity: 'safe'
      })
    }
  } catch { /* ignore */ }

  // 2. Scan for broken Run key entries (startup entries pointing to missing files)
  try {
    const runResult = await runPowerShellJSON<any>(
      `$broken = @(); @('HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run','HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run') | ForEach-Object { $regPath = $_; Get-ItemProperty $regPath -ErrorAction SilentlyContinue | Get-Member -MemberType NoteProperty | Where-Object { $_.Name -notin @('PSPath','PSParentPath','PSChildName','PSProvider') } | ForEach-Object { $val = (Get-ItemProperty $regPath).$($_.Name); if ($val -match '"?([A-Z]:\\\\[^"]+)') { $exe = $Matches[1]; if (-not (Test-Path $exe)) { $broken += @{Key=$regPath; Name=$_.Name; Value=$val} } } } }; $broken`
    )
    const items = Array.isArray(runResult) ? runResult : runResult ? [runResult] : []
    scannedKeys += 50
    for (const item of items) {
      issues.push({
        id: `issue_${idCounter++}`,
        path: item.Key,
        name: item.Name,
        valueName: item.Name,
        type: 'broken_path',
        description: `Startup entry "${item.Name}" points to missing file`,
        severity: 'safe'
      })
    }
  } catch { /* ignore */ }

  // 3. Scan obsolete MuiCache (large cache)
  try {
    const muiResult = await runPowerShell(
      `$count = (Get-Item 'HKCU:\\SOFTWARE\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\MuiCache' -ErrorAction SilentlyContinue).ValueCount; if ($count -gt 500) { $count } else { 0 }`
    )
    scannedKeys += 50
    const muiCount = parseInt(muiResult) || 0
    if (muiCount > 500) {
      issues.push({
        id: `issue_${idCounter++}`,
        path: 'HKCU:\\SOFTWARE\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\MuiCache',
        name: `MuiCache (${muiCount} entries)`,
        type: 'obsolete_installer',
        description: `${muiCount} cached application name entries (safe to clean)`,
        severity: 'safe'
      })
    }
  } catch { /* ignore */ }

  return {
    issues,
    scannedKeys,
    scanTimeMs: Date.now() - startTime
  }
}

export async function fixRegistryIssues(
  issues: { id: string; path: string; name: string; valueName?: string; type: string }[]
): Promise<{ fixed: number; errors: string[] }> {
  let fixed = 0
  const errors: string[] = []

  for (const issue of issues) {
    try {
      const safePath = issue.path.replace(/'/g, "''")

      if (issue.type === 'orphaned_software') {
        // Remove the entire uninstall registry key
        await runPowerShell(`Remove-Item -Path '${safePath}' -Recurse -Force -ErrorAction Stop`)
        fixed++
      } else if (issue.type === 'broken_path' && issue.valueName) {
        // Remove the specific value from the Run key
        const safeName = issue.valueName.replace(/'/g, "''")
        await runPowerShell(`Remove-ItemProperty -Path '${safePath}' -Name '${safeName}' -Force -ErrorAction Stop`)
        fixed++
      } else if (issue.type === 'obsolete_installer') {
        // Clear MuiCache — remove all values
        await runPowerShell(`Remove-Item -Path '${safePath}' -Force -ErrorAction Stop; New-Item -Path '${safePath}' -Force | Out-Null`)
        fixed++
      }
    } catch (e: any) {
      errors.push(`${issue.name}: ${e.message}`)
    }
  }

  return { fixed, errors }
}

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

  const pushIssues = (
    items: any[],
    type: RegistryIssue['type'],
    severity: RegistryIssue['severity'],
    valueName?: boolean
  ): void => {
    for (const item of items) {
      issues.push({
        id: `issue_${idCounter++}`,
        path: item.path || item.Key || '',
        name: item.description || item.Name || '',
        ...(valueName && item.Name ? { valueName: item.Name } : {}),
        type,
        description: item.description || '',
        severity
      })
    }
  }

  // 1. Orphaned uninstall entries (HKLM + HKCU)
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
              path = $_.PSPath -replace 'Microsoft.PowerShell.Core\\\\Registry::',''
              description = "Orphaned: $($_.DisplayName) - $exe not found"
            }
          }
        }
      }
      $items | Select-Object -First 30
    `
    const r1 = await runPowerShellJSON<any>(cmd1)
    const items = Array.isArray(r1) ? r1 : r1 ? [r1] : []
    pushIssues(items, 'orphaned_software', 'safe')
    scannedKeys += 300
  } catch { /* ignore */ }

  // 2. Broken startup entries (Run + RunOnce)
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
                path = "$rp\\$($_.Name)"
                Name = $_.Name
                description = "Broken startup: $($_.Name) -> $exe"
              }
            }
          }
        }
      }
      $items
    `
    const r2 = await runPowerShellJSON<any>(cmd2)
    const items = Array.isArray(r2) ? r2 : r2 ? [r2] : []
    pushIssues(items, 'broken_path', 'safe', true)
    scannedKeys += 100
  } catch { /* ignore */ }

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
              path = $_.Name
              description = "Broken COM: $dll not found"
            }
          }
        }
      }
      $items | Select-Object -First 20
    `
    const r3 = await runPowerShellJSON<any>(cmd3)
    const items = Array.isArray(r3) ? r3 : r3 ? [r3] : []
    pushIssues(items, 'orphaned_software', 'safe')
    scannedKeys += 500
  } catch { /* ignore */ }

  // 4. Broken App Paths
  try {
    const cmd4 = `
      $items = @()
      Get-ChildItem 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths' -ErrorAction SilentlyContinue | ForEach-Object {
        $exe = (Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue).'(default)'
        if ($exe -and !(Test-Path $exe)) {
          $items += [PSCustomObject]@{
            path = $_.Name
            description = "Broken App Path: $($_.PSChildName) -> $exe"
          }
        }
      }
      $items
    `
    const r4 = await runPowerShellJSON<any>(cmd4)
    const items = Array.isArray(r4) ? r4 : r4 ? [r4] : []
    pushIssues(items, 'broken_path', 'safe')
    scannedKeys += 200
  } catch { /* ignore */ }

  // 5. Missing Shared DLLs
  try {
    const cmd5 = `
      $items = @()
      $dlls = Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\SharedDLLs' -ErrorAction SilentlyContinue
      if ($dlls) {
        $dlls.PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' } | Select-Object -First 200 | ForEach-Object {
          if (!(Test-Path $_.Name)) {
            $items += [PSCustomObject]@{
              path = "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\SharedDLLs\\$($_.Name)"
              description = "Missing DLL: $($_.Name)"
            }
          }
        }
      }
      $items | Select-Object -First 20
    `
    const r5 = await runPowerShellJSON<any>(cmd5)
    const items = Array.isArray(r5) ? r5 : r5 ? [r5] : []
    pushIssues(items, 'broken_path', 'safe')
    scannedKeys += 200
  } catch { /* ignore */ }

  // 6. MuiCache bloat (threshold: 200 entries)
  try {
    const muiResult = await runPowerShell(
      `$count = (Get-Item 'HKCU:\\SOFTWARE\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\MuiCache' -ErrorAction SilentlyContinue).ValueCount; if ($count -gt 200) { $count } else { 0 }`
    )
    scannedKeys += 50
    const muiCount = parseInt(muiResult) || 0
    if (muiCount > 200) {
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

  // 7. Invalid file type associations
  try {
    const cmd7 = `
      $items = @()
      $exts = @('.3gp','.avi','.bmp','.csv','.doc','.docx','.gif','.htm','.html','.jpg','.jpeg','.mkv','.mp3','.mp4','.pdf','.png','.ppt','.rar','.txt','.wav','.webm','.wmv','.xls','.xlsx','.zip','.7z')
      foreach ($ext in $exts) {
        $assocPath = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\$ext\\UserChoice"
        if (Test-Path $assocPath) {
          $progId = (Get-ItemProperty $assocPath -ErrorAction SilentlyContinue).ProgId
          if ($progId -and !(Test-Path "HKLM:\\SOFTWARE\\Classes\\$progId") -and !(Test-Path "HKCU:\\Software\\Classes\\$progId")) {
            $items += [PSCustomObject]@{
              path = $assocPath
              description = "Invalid file association: $ext -> $progId (handler missing)"
            }
          }
        }
      }
      $items
    `
    const r7 = await runPowerShellJSON<any>(cmd7)
    const items = Array.isArray(r7) ? r7 : r7 ? [r7] : []
    pushIssues(items, 'broken_path', 'safe')
    scannedKeys += 50
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

import { runPowerShell, runPowerShellJSON } from './powershell'

export interface Recommendation {
  id: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  category: 'cleanup' | 'performance' | 'security' | 'startup'
  action: string
  actionLabel: string
}

export async function getRecommendations(): Promise<Recommendation[]> {
  const recs: Recommendation[] = []

  try {
    // 1. Check disk space
    const diskCmd = `$disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'" | Select-Object @{N='FreeGB';E={[math]::Round($_.FreeSpace/1GB,1)}}, @{N='TotalGB';E={[math]::Round($_.Size/1GB,1)}}; $disk`
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
    try {
      const defenderCmd = `
        $status = Get-MpComputerStatus -ErrorAction Stop
        [PSCustomObject]@{
          RealTimeEnabled = $status.RealTimeProtectionEnabled
          DefsAge = $status.AntivirusSignatureAge
        }
      `
      const defender = await runPowerShellJSON<{ RealTimeEnabled: boolean; DefsAge: number }>(defenderCmd)
      if (defender && !defender.RealTimeEnabled) {
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
      if (defender && defender.DefsAge > 7) {
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
    } catch {}

    // 5. Check temp folder size
    try {
      const tempCmd = `[math]::Round((Get-ChildItem $env:TEMP -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum / 1GB, 2)`
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
    } catch {}

  } catch (err) {
    console.error('Recommendations error:', err)
  }

  const impactOrder = { high: 0, medium: 1, low: 2 }
  recs.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact])
  return recs.slice(0, 5)
}

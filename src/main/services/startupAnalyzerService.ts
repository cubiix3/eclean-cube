import { runPowerShell, runPowerShellJSON } from './powershell'

export interface StartupImpactEntry {
  name: string
  path: string
  impactMs: number
  source: string
}

export interface BootAnalysis {
  totalBootMs: number
  lastBootDate: string
  entries: StartupImpactEntry[]
}

export async function analyzeStartup(): Promise<BootAnalysis> {
  try {
    // Get boot time from Event Viewer
    const bootTimeResult = await runPowerShell(
      `$evt = Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Diagnostics-Performance/Operational'; Id=100} -MaxEvents 1 -ErrorAction SilentlyContinue; if ($evt) { @{ BootMs=$evt.Properties[1].Value; Date=$evt.TimeCreated.ToString('yyyy-MM-dd HH:mm') } | ConvertTo-Json -Compress } else { '{}' }`
    )
    let totalBootMs = 0
    let lastBootDate = 'Unknown'
    try {
      const boot = JSON.parse(bootTimeResult)
      totalBootMs = boot.BootMs || 0
      lastBootDate = boot.Date || 'Unknown'
    } catch { /* ignore */ }

    // Get startup app impact from Event Viewer (Event ID 101 = app startup impact)
    const impactResult = await runPowerShellJSON<any>(
      `Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Diagnostics-Performance/Operational'; Id=101} -MaxEvents 30 -ErrorAction SilentlyContinue | ForEach-Object { @{ Name=$_.Properties[5].Value; Path=$_.Properties[3].Value; ImpactMs=$_.Properties[1].Value; Source='Event Log' } }`
    )
    const items = Array.isArray(impactResult) ? impactResult : impactResult ? [impactResult] : []
    const entries: StartupImpactEntry[] = items
      .map((e: any) => ({
        name: e.Name || 'Unknown',
        path: e.Path || '',
        impactMs: e.ImpactMs || 0,
        source: 'Boot Diagnostics'
      }))
      .filter((e: StartupImpactEntry) => e.impactMs > 0)
      .sort((a: StartupImpactEntry, b: StartupImpactEntry) => b.impactMs - a.impactMs)

    return { totalBootMs, lastBootDate, entries }
  } catch {
    return { totalBootMs: 0, lastBootDate: 'Unknown', entries: [] }
  }
}

import { runPowerShell } from './powershell'

export interface ProcessInfo {
  pid: number
  name: string
  cpu: number  // percentage
  ram: number  // MB
  status: string
}

export interface RAMDetails {
  totalMB: number
  usedMB: number
  availableMB: number
  cachedMB: number
  percentUsed: number
  topProcesses: { name: string; pid: number; ramMB: number }[]
}

export interface RAMOptimizeResult {
  freedMB: number
  beforeMB: number
  afterMB: number
}

export async function getProcesses(): Promise<ProcessInfo[]> {
  try {
    const raw = await runPowerShell(
      `Get-Process | Select-Object Id, ProcessName, @{N='CpuPercent';E={[math]::Round($_.CPU,1)}}, @{N='RamMB';E={[math]::Round($_.WorkingSet64/1MB,1)}}, Responding | Sort-Object -Property WorkingSet64 -Descending | Select-Object -First 100 | ConvertTo-Json`
    )

    const parsed = JSON.parse(raw)
    const arr = Array.isArray(parsed) ? parsed : [parsed]

    return arr.map((p: any) => ({
      pid: p.Id,
      name: p.ProcessName || 'Unknown',
      cpu: p.CpuPercent ?? 0,
      ram: p.RamMB ?? 0,
      status: p.Responding === true ? 'Responding' : p.Responding === false ? 'Not Responding' : 'Unknown'
    }))
  } catch {
    return []
  }
}

export async function killProcess(pid: number): Promise<{ success: boolean; error?: string }> {
  try {
    await runPowerShell(`Stop-Process -Id ${pid} -Force`)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to kill process' }
  }
}

export async function getProcessCount(): Promise<number> {
  try {
    const raw = await runPowerShell(`(Get-Process).Count`)
    return parseInt(raw, 10) || 0
  } catch {
    return 0
  }
}

export async function getRAMDetails(): Promise<RAMDetails> {
  try {
    const raw = await runPowerShell(`
      $os = Get-CimInstance Win32_OperatingSystem;
      $totalMB = [math]::Round($os.TotalVisibleMemorySize / 1KB, 0);
      $availMB = [math]::Round($os.FreePhysicalMemory / 1KB, 0);
      $usedMB = $totalMB - $availMB;
      $cached = [math]::Round((Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory).CacheBytes / 1MB, 0);
      $top = Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 5 Id, ProcessName, @{N='RamMB';E={[math]::Round($_.WorkingSet64/1MB,1)}};
      @{ TotalMB=$totalMB; UsedMB=$usedMB; AvailableMB=$availMB; CachedMB=$cached; TopProcesses=$top } | ConvertTo-Json -Depth 3
    `)

    const data = JSON.parse(raw)
    const topProcs = Array.isArray(data.TopProcesses) ? data.TopProcesses : [data.TopProcesses]

    return {
      totalMB: data.TotalMB || 0,
      usedMB: data.UsedMB || 0,
      availableMB: data.AvailableMB || 0,
      cachedMB: data.CachedMB || 0,
      percentUsed: data.TotalMB > 0 ? Math.round((data.UsedMB / data.TotalMB) * 100) : 0,
      topProcesses: topProcs.map((p: any) => ({
        name: p.ProcessName || 'Unknown',
        pid: p.Id || 0,
        ramMB: p.RamMB || 0
      }))
    }
  } catch {
    return {
      totalMB: 0,
      usedMB: 0,
      availableMB: 0,
      cachedMB: 0,
      percentUsed: 0,
      topProcesses: []
    }
  }
}

export async function optimizeRAM(): Promise<RAMOptimizeResult> {
  try {
    const raw = await runPowerShell(`
      $os = Get-CimInstance Win32_OperatingSystem;
      $beforeMB = [math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / 1KB, 0);
      try { Get-Process | ForEach-Object { try { $_.MinWorkingSet = $_.MinWorkingSet } catch {} } } catch {};
      try { [System.GC]::Collect() } catch {};
      Start-Sleep -Seconds 2;
      $os2 = Get-CimInstance Win32_OperatingSystem;
      $afterMB = [math]::Round(($os2.TotalVisibleMemorySize - $os2.FreePhysicalMemory) / 1KB, 0);
      $freed = $beforeMB - $afterMB;
      if ($freed -lt 0) { $freed = 0 };
      @{ FreedMB=$freed; BeforeMB=$beforeMB; AfterMB=$afterMB } | ConvertTo-Json
    `)

    const data = JSON.parse(raw)
    return {
      freedMB: data.FreedMB || 0,
      beforeMB: data.BeforeMB || 0,
      afterMB: data.AfterMB || 0
    }
  } catch {
    return { freedMB: 0, beforeMB: 0, afterMB: 0 }
  }
}

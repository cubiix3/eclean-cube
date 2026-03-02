import { runPowerShell, runPowerShellJSON } from './powershell'

export interface DriveInfo {
  letter: string
  label: string
  mediaType: string // SSD or HDD
  sizeGB: number
  freeGB: number
  lastOptimized: string | null
}

export interface DefragResult {
  drive: string
  success: boolean
  type: 'trim' | 'defrag'
  message: string
}

export async function getDrivesForMaintenance(): Promise<DriveInfo[]> {
  try {
    const result = await runPowerShellJSON<any>(
      `Get-Volume | Where-Object { $_.DriveLetter -and $_.DriveType -eq 'Fixed' } | ForEach-Object { $letter = $_.DriveLetter; $mt = 'Unknown'; try { $phys = Get-PhysicalDisk -ErrorAction SilentlyContinue | Where-Object { (Get-Disk -Number $_.DeviceId -ErrorAction SilentlyContinue | Get-Partition -ErrorAction SilentlyContinue | Get-Volume -ErrorAction SilentlyContinue).DriveLetter -contains $letter }; if ($phys) { $mt = $phys.MediaType } } catch {}; @{ Letter=$letter; Label=$_.FileSystemLabel; MediaType=$mt; SizeGB=[math]::Round($_.Size/1GB,1); FreeGB=[math]::Round($_.SizeRemaining/1GB,1) } }`
    )
    const items = Array.isArray(result) ? result : result ? [result] : []
    return items.map((d: any) => ({
      letter: d.Letter || '?',
      label: d.Label || '',
      mediaType: (d.MediaType || 'Unknown').toString().replace('4', 'SSD').replace('3', 'HDD'),
      sizeGB: d.SizeGB || 0,
      freeGB: d.FreeGB || 0,
      lastOptimized: null
    }))
  } catch {
    return []
  }
}

export async function optimizeDrive(driveLetter: string): Promise<DefragResult> {
  const safeLetter = driveLetter.replace(/[^a-zA-Z]/g, '').charAt(0) || 'C'

  try {
    // Check if SSD or HDD
    const mediaType = await runPowerShell(
      `(Get-PhysicalDisk | Where-Object { (Get-Disk -Number $_.DeviceId -ErrorAction SilentlyContinue | Get-Partition -ErrorAction SilentlyContinue | Get-Volume -ErrorAction SilentlyContinue).DriveLetter -contains '${safeLetter}' }).MediaType`
    )

    const isSSD = mediaType.includes('SSD') || mediaType.includes('4')

    if (isSSD) {
      // TRIM for SSDs
      await runPowerShell(`Optimize-Volume -DriveLetter ${safeLetter} -ReTrim -ErrorAction Stop`)
      return { drive: safeLetter, success: true, type: 'trim', message: `TRIM completed on ${safeLetter}:` }
    } else {
      // Defrag for HDDs
      await runPowerShell(`Optimize-Volume -DriveLetter ${safeLetter} -Defrag -ErrorAction Stop`)
      return { drive: safeLetter, success: true, type: 'defrag', message: `Defragmentation completed on ${safeLetter}:` }
    }
  } catch (e: any) {
    return { drive: safeLetter, success: false, type: 'trim', message: e.message || 'Operation failed (requires admin)' }
  }
}

export async function analyzeDrive(driveLetter: string): Promise<{ fragmentPercent: number; status: string }> {
  const safeLetter = driveLetter.replace(/[^a-zA-Z]/g, '').charAt(0) || 'C'
  try {
    const result = await runPowerShell(
      `$r = Optimize-Volume -DriveLetter ${safeLetter} -Analyze -Verbose 4>&1 -ErrorAction Stop; $r -join '|'`
    )
    // Parse verbose output for fragmentation percentage
    const match = result.match(/(\d+)%/)
    return {
      fragmentPercent: match ? parseInt(match[1]) : 0,
      status: result.includes('not require') ? 'OK' : 'Needs optimization'
    }
  } catch {
    return { fragmentPercent: -1, status: 'Unable to analyze (requires admin)' }
  }
}

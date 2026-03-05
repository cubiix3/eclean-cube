import { runPowerShell } from './powershell'

export interface SpeedTestResult {
  downloadMbps: number
  uploadMbps: number
  latencyMs: number
  server: string
}

export async function runSpeedTest(): Promise<SpeedTestResult> {
  try {
    // Run all three tests with individual error handling
    // Download: Use Cloudflare's speed test endpoint (always available)
    const dlResult = await runPowerShell(
      `try {
        $url = 'https://speed.cloudflare.com/__down?bytes=4000000'
        $wc = New-Object System.Net.WebClient
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $data = $wc.DownloadData($url)
        $sw.Stop()
        $bytes = $data.Length
        $secs = $sw.Elapsed.TotalSeconds
        if ($secs -gt 0) { [math]::Round(($bytes * 8 / 1000000) / $secs, 2) } else { "0" }
      } catch { "0" }`,
      45000
    )
    const downloadMbps = parseFloat(dlResult) || 0

    // Upload: Use Cloudflare's upload endpoint
    const ulResult = await runPowerShell(
      `try {
        $data = New-Object byte[] 524288
        (New-Object Random).NextBytes($data)
        $wc = New-Object System.Net.WebClient
        $wc.Headers.Add("Content-Type", "application/octet-stream")
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $wc.UploadData('https://speed.cloudflare.com/__up', 'POST', $data) | Out-Null
        $sw.Stop()
        $secs = $sw.Elapsed.TotalSeconds
        if ($secs -gt 0) { [math]::Round((524288 * 8 / 1000000) / $secs, 2) } else { "0" }
      } catch { "0" }`,
      45000
    )
    const uploadMbps = parseFloat(ulResult) || 0

    // Ping test using Cloudflare DNS
    const pingResult = await runPowerShell(
      `try {
        $results = Test-Connection -ComputerName 1.1.1.1 -Count 4 -ErrorAction Stop
        $avg = ($results | Measure-Object -Property ResponseTime -Average).Average
        [math]::Round($avg)
      } catch { "0" }`,
      15000
    )
    const latencyMs = Math.round(parseFloat(pingResult) || 0)

    return { downloadMbps, uploadMbps, latencyMs, server: 'speed.cloudflare.com' }
  } catch {
    return { downloadMbps: 0, uploadMbps: 0, latencyMs: 0, server: 'failed' }
  }
}

import { runPowerShell } from './powershell'

export interface SpeedTestResult {
  downloadMbps: number
  uploadMbps: number
  latencyMs: number
  server: string
}

export async function runSpeedTest(): Promise<SpeedTestResult> {
  // Download test: fetch a known file and measure time
  try {
    const dlResult = await runPowerShell(
      `$url = 'http://speedtest.tele2.net/1MB.zip'; $sw = [System.Diagnostics.Stopwatch]::StartNew(); try { $wc = New-Object System.Net.WebClient; $data = $wc.DownloadData($url); $sw.Stop(); $bytes = $data.Length; $secs = $sw.Elapsed.TotalSeconds; $mbps = [math]::Round(($bytes * 8 / 1000000) / $secs, 2); "$mbps" } catch { $sw.Stop(); "0" }`
    )
    const downloadMbps = parseFloat(dlResult) || 0

    // Upload test: POST data to httpbin
    const ulResult = await runPowerShell(
      `$data = New-Object byte[] 262144; (New-Object Random).NextBytes($data); $sw = [System.Diagnostics.Stopwatch]::StartNew(); try { $wc = New-Object System.Net.WebClient; $wc.UploadData('https://httpbin.org/post', 'POST', $data) | Out-Null; $sw.Stop(); $secs = $sw.Elapsed.TotalSeconds; $mbps = [math]::Round((262144 * 8 / 1000000) / $secs, 2); "$mbps" } catch { $sw.Stop(); "0" }`
    )
    const uploadMbps = parseFloat(ulResult) || 0

    // Ping test
    const pingResult = await runPowerShell(
      `(Test-Connection -ComputerName 8.8.8.8 -Count 3 -ErrorAction SilentlyContinue | Measure-Object -Property ResponseTime -Average).Average`
    )
    const latencyMs = Math.round(parseFloat(pingResult) || 0)

    return { downloadMbps, uploadMbps, latencyMs, server: 'speedtest.tele2.net' }
  } catch {
    return { downloadMbps: 0, uploadMbps: 0, latencyMs: 0, server: 'failed' }
  }
}

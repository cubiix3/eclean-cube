import { runPowerShell } from './powershell'

export interface NetworkAdapterStats {
  name: string
  bytesReceivedPerSec: number
  bytesSentPerSec: number
  currentBandwidth: number
}

export interface ConnectionInfo {
  connections: number
  publicIP: string
}

export async function getNetworkStats(): Promise<NetworkAdapterStats[]> {
  try {
    const result = await runPowerShell(
      `Get-CimInstance Win32_PerfFormattedData_Tcpip_NetworkInterface | Select-Object Name, BytesReceivedPersec, BytesSentPersec, CurrentBandwidth | ConvertTo-Json`
    )
    if (!result) return []
    const parsed = JSON.parse(result)
    const adapters = Array.isArray(parsed) ? parsed : [parsed]
    return adapters.map((a: any) => ({
      name: a.Name || 'Unknown',
      bytesReceivedPerSec: a.BytesReceivedPersec || 0,
      bytesSentPerSec: a.BytesSentPersec || 0,
      currentBandwidth: a.CurrentBandwidth || 0
    }))
  } catch {
    return []
  }
}

export async function getConnectionInfo(): Promise<ConnectionInfo> {
  let connections = 0
  let publicIP = 'N/A'

  try {
    const connResult = await runPowerShell(
      `@(Get-NetTCPConnection -State Established -ErrorAction SilentlyContinue).Count`
    )
    connections = parseInt(connResult) || 0
  } catch {
    // ignore
  }

  try {
    const ipResult = await runPowerShell(
      `(Invoke-WebRequest -Uri 'https://api.ipify.org' -UseBasicParsing -TimeoutSec 5).Content`
    )
    if (ipResult && ipResult.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      publicIP = ipResult
    }
  } catch {
    // ignore
  }

  return { connections, publicIP }
}

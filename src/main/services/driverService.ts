import { runPowerShellJSON } from './powershell'

export interface DriverInfo {
  deviceName: string
  driverVersion: string
  driverDate: string
  manufacturer: string
  deviceClass: string
  status: string
  isSigned: boolean
}

export async function getDrivers(): Promise<DriverInfo[]> {
  try {
    const result = await runPowerShellJSON<any>(
      `Get-CimInstance Win32_PnPSignedDriver -ErrorAction SilentlyContinue | Where-Object { $_.DeviceName } | Select-Object DeviceName, DriverVersion, @{N='DriverDate';E={if($_.DriverDate){$_.DriverDate.ToString('yyyy-MM-dd')}else{''}}}, Manufacturer, DeviceClass, Status, IsSigned | Sort-Object DeviceClass, DeviceName`
    )
    const items = Array.isArray(result) ? result : result ? [result] : []
    return items.map((d: any) => ({
      deviceName: d.DeviceName || 'Unknown',
      driverVersion: d.DriverVersion || 'Unknown',
      driverDate: d.DriverDate || '',
      manufacturer: d.Manufacturer || 'Unknown',
      deviceClass: d.DeviceClass || 'Other',
      status: d.Status || 'Unknown',
      isSigned: d.IsSigned !== false
    }))
  } catch {
    return []
  }
}

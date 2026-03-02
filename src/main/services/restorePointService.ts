import { runPowerShell, runPowerShellJSON } from './powershell'

export interface RestorePoint {
  sequenceNumber: number
  description: string
  creationTime: string
  type: string
}

export async function getRestorePoints(): Promise<RestorePoint[]> {
  try {
    const result = await runPowerShellJSON<any>(
      `Get-ComputerRestorePoint -ErrorAction SilentlyContinue | Select-Object SequenceNumber, Description, @{N='CreationTime';E={$_.ConvertToDateTime($_.CreationTime).ToString('yyyy-MM-dd HH:mm')}}, RestorePointType`
    )
    const items = Array.isArray(result) ? result : result ? [result] : []
    return items.map((r: any) => ({
      sequenceNumber: r.SequenceNumber || 0,
      description: r.Description || '',
      creationTime: r.CreationTime || '',
      type: r.RestorePointType === 10 ? 'Device Driver' : r.RestorePointType === 12 ? 'Install' : 'Manual'
    }))
  } catch {
    return []
  }
}

export async function createRestorePoint(description: string): Promise<{ success: boolean; error?: string }> {
  try {
    const safeDesc = description.replace(/'/g, "''").replace(/[^a-zA-Z0-9 _-]/g, '')
    await runPowerShell(`Checkpoint-Computer -Description '${safeDesc}' -RestorePointType 'MODIFY_SETTINGS' -ErrorAction Stop`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function removeRestorePoint(sequenceNumber: number): Promise<{ success: boolean; error?: string }> {
  try {
    await runPowerShell(`vssadmin delete shadows /shadow={${sequenceNumber}} /quiet`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

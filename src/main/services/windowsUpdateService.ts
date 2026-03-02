import { runPowerShell, runPowerShellJSON } from './powershell'

export interface WindowsUpdate {
  title: string
  kbArticleId: string
  size: string
  isDownloaded: boolean
  isMandatory: boolean
  description: string
}

export async function checkForUpdates(): Promise<WindowsUpdate[]> {
  try {
    const result = await runPowerShellJSON<any>(
      `$session = New-Object -ComObject Microsoft.Update.Session; $searcher = $session.CreateUpdateSearcher(); $results = $searcher.Search('IsInstalled=0'); $results.Updates | ForEach-Object { @{ Title=$_.Title; KBArticleIDs=($_.KBArticleIDs -join ','); MaxDownloadSize=[math]::Round($_.MaxDownloadSize/1MB,1); IsDownloaded=$_.IsDownloaded; IsMandatory=$_.IsMandatory; Description=$_.Description } } | Select-Object -First 30`
    )
    const items = Array.isArray(result) ? result : result ? [result] : []
    return items.map((u: any) => ({
      title: u.Title || 'Unknown',
      kbArticleId: u.KBArticleIDs || '',
      size: `${u.MaxDownloadSize || 0} MB`,
      isDownloaded: u.IsDownloaded || false,
      isMandatory: u.IsMandatory || false,
      description: u.Description || ''
    }))
  } catch {
    return []
  }
}

export async function getLastUpdateDate(): Promise<string> {
  try {
    const result = await runPowerShell(
      `(Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 1).InstalledOn.ToString('yyyy-MM-dd')`
    )
    return result.trim() || 'Unknown'
  } catch {
    return 'Unknown'
  }
}

export async function getInstalledUpdates(): Promise<{ id: string; description: string; date: string }[]> {
  try {
    const result = await runPowerShellJSON<any>(
      `Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 20 HotFixID, Description, @{N='Date';E={if($_.InstalledOn){$_.InstalledOn.ToString('yyyy-MM-dd')}else{''}}}`
    )
    const items = Array.isArray(result) ? result : result ? [result] : []
    return items.map((u: any) => ({
      id: u.HotFixID || '',
      description: u.Description || '',
      date: u.Date || ''
    }))
  } catch {
    return []
  }
}

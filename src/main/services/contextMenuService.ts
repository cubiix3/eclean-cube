import { runPowerShell, runPowerShellJSON } from './powershell'

export interface ContextMenuEntry {
  name: string
  key: string
  command: string
  location: 'HKCR_Directory' | 'HKCR_Star' | 'HKCR_Background'
  icon?: string
}

export async function getContextMenuEntries(): Promise<ContextMenuEntry[]> {
  const entries: ContextMenuEntry[] = []
  const locations = [
    { path: 'HKCR:\\*\\shell', loc: 'HKCR_Star' as const },
    { path: 'HKCR:\\Directory\\shell', loc: 'HKCR_Directory' as const },
    { path: 'HKCR:\\Directory\\Background\\shell', loc: 'HKCR_Background' as const }
  ]

  for (const { path, loc } of locations) {
    try {
      const result = await runPowerShellJSON<any>(
        `Get-ChildItem '${path}' -ErrorAction SilentlyContinue | ForEach-Object { $cmd = ''; try { $cmd = (Get-ItemProperty "$($_.PSPath)\\command" -ErrorAction SilentlyContinue).'(default)' } catch {}; $icon = ''; try { $icon = (Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue).Icon } catch {}; @{ Name=$_.PSChildName; Key=$_.PSPath; Command=$cmd; Icon=$icon } }`
      )
      const items = Array.isArray(result) ? result : result ? [result] : []
      for (const item of items) {
        entries.push({
          name: item.Name || 'Unknown',
          key: item.Key || '',
          command: item.Command || '',
          location: loc,
          icon: item.Icon || undefined
        })
      }
    } catch { /* ignore */ }
  }
  return entries
}

export async function removeContextMenuEntry(keyPath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const safePath = keyPath.replace(/'/g, "''")
    await runPowerShell(`Remove-Item -Path '${safePath}' -Recurse -Force -ErrorAction Stop`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

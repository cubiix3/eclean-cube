import { runPowerShell } from './powershell'
import { sanitizePath, sanitizeNumber } from './sanitize'

export interface DuplicateFile {
  path: string
  modified: string
}

export interface DuplicateGroup {
  name: string
  size: number
  files: DuplicateFile[]
}

export async function findDuplicates(
  directory: string,
  minSizeMB: number = 1
): Promise<DuplicateGroup[]> {
  try {
    const safeMinSizeMB = sanitizeNumber(minSizeMB)
    const minBytes = safeMinSizeMB * 1024 * 1024
    const escapedDir = sanitizePath(directory).replace(/'/g, "''")
    const result = await runPowerShell(
      `Get-ChildItem -Path '${escapedDir}' -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.Length -gt ${minBytes} } | Group-Object Name | Where-Object { $_.Count -gt 1 } | ForEach-Object { $_.Group | Select-Object FullName, Name, Length, LastWriteTime } | ConvertTo-Json -Depth 3`
    )
    if (!result) return []

    const parsed = JSON.parse(result)
    const files = Array.isArray(parsed) ? parsed : [parsed]

    // Group by name
    const groupMap = new Map<string, { size: number; files: DuplicateFile[] }>()

    for (const f of files) {
      if (!f.Name) continue
      const name = f.Name as string
      const existing = groupMap.get(name)
      const entry: DuplicateFile = {
        path: f.FullName,
        modified: f.LastWriteTime
      }

      if (existing) {
        existing.files.push(entry)
      } else {
        groupMap.set(name, {
          size: f.Length || 0,
          files: [entry]
        })
      }
    }

    // Convert to array, only keep groups with 2+ files
    const groups: DuplicateGroup[] = []
    for (const [name, data] of groupMap.entries()) {
      if (data.files.length > 1) {
        groups.push({
          name,
          size: data.size,
          files: data.files
        })
      }
    }

    return groups.sort((a, b) => b.size * b.files.length - a.size * a.files.length)
  } catch {
    return []
  }
}

export async function deleteDuplicates(
  paths: string[]
): Promise<{ deleted: number; errors: string[] }> {
  let deleted = 0
  const errors: string[] = []

  for (const filePath of paths) {
    try {
      const escapedPath = sanitizePath(filePath).replace(/'/g, "''")
      await runPowerShell(
        `if (Test-Path '${escapedPath}') { Remove-Item '${escapedPath}' -Force -ErrorAction Stop }`
      )
      deleted++
    } catch (e: any) {
      errors.push(`${filePath}: ${e.message}`)
    }
  }

  return { deleted, errors }
}

import { runPowerShell } from './powershell'
import { sanitizePath } from './sanitize'

export interface DiskTreeNode {
  name: string
  path: string
  size: number
  children?: DiskTreeNode[]
}

export async function scanDiskTree(rootPath: string, depth: number = 2): Promise<DiskTreeNode> {
  const safePath = sanitizePath(rootPath).replace(/'/g, "''")
  try {
    const result = await runPowerShell(
      `$items = Get-ChildItem -Path '${safePath}' -Directory -Force -ErrorAction SilentlyContinue | ForEach-Object { $s = 0; try { $s = (Get-ChildItem $_.FullName -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum } catch {}; @{ Name=$_.Name; Path=$_.FullName; Size=[long]$s } } | Sort-Object -Property Size -Descending | Select-Object -First 25; $items | ConvertTo-Json -Compress -Depth 3`
    )
    if (!result) return { name: rootPath, path: rootPath, size: 0, children: [] }
    const parsed = JSON.parse(result)
    const items = Array.isArray(parsed) ? parsed : [parsed]
    const children: DiskTreeNode[] = items
      .filter((i: any) => i.Size > 0)
      .map((i: any) => ({
        name: i.Name || 'Unknown',
        path: i.Path || '',
        size: i.Size || 0
      }))
    const totalSize = children.reduce((sum, c) => sum + c.size, 0)
    return { name: rootPath, path: rootPath, size: totalSize, children }
  } catch {
    return { name: rootPath, path: rootPath, size: 0, children: [] }
  }
}

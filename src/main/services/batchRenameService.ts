import { readdirSync, renameSync, statSync } from 'fs'
import { join, extname, basename } from 'path'

export interface RenamePreview {
  original: string
  renamed: string
  path: string
}

export interface RenameResult {
  renamed: number
  errors: string[]
}

export function previewRename(
  directory: string,
  pattern: string,
  replacement: string,
  useRegex: boolean = false
): RenamePreview[] {
  try {
    const files = readdirSync(directory)
    const previews: RenamePreview[] = []

    for (const file of files) {
      const fullPath = join(directory, file)
      try {
        if (!statSync(fullPath).isFile()) continue
      } catch { continue }

      const ext = extname(file)
      const nameWithoutExt = basename(file, ext)
      let newName: string

      if (useRegex) {
        try {
          const regex = new RegExp(pattern, 'g')
          newName = nameWithoutExt.replace(regex, replacement) + ext
        } catch {
          continue
        }
      } else {
        newName = nameWithoutExt.replace(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement) + ext
      }

      if (newName !== file) {
        previews.push({ original: file, renamed: newName, path: fullPath })
      }
    }
    return previews
  } catch {
    return []
  }
}

export function executeRename(directory: string, renames: { original: string; renamed: string }[]): RenameResult {
  let renamed = 0
  const errors: string[] = []

  for (const r of renames) {
    try {
      // Prevent directory traversal via ../ in renamed filenames
      if (r.renamed.includes('..') || r.renamed.includes('/') || r.renamed.includes('\\')) {
        errors.push(`${r.original}: Invalid filename (path traversal detected)`)
        continue
      }
      renameSync(join(directory, r.original), join(directory, r.renamed))
      renamed++
    } catch (e: any) {
      errors.push(`${r.original}: ${e.message}`)
    }
  }

  return { renamed, errors }
}

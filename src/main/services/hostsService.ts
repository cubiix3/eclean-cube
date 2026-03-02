import { readFileSync, writeFileSync } from 'fs'

const HOSTS_PATH = 'C:\\Windows\\System32\\drivers\\etc\\hosts'

export interface HostEntry {
  ip: string
  hostname: string
  comment?: string
  enabled: boolean
  lineIndex: number
}

export function getHostsEntries(): HostEntry[] {
  try {
    const content = readFileSync(HOSTS_PATH, 'utf-8')
    const lines = content.split('\n')
    const entries: HostEntry[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const enabled = !line.startsWith('#')
      const cleaned = line.replace(/^#\s*/, '')
      const parts = cleaned.split(/\s+/)
      if (parts.length >= 2 && /^\d+\.\d+\.\d+\.\d+$/.test(parts[0])) {
        entries.push({
          ip: parts[0],
          hostname: parts[1],
          comment: parts.slice(2).join(' ').replace(/^#\s*/, '') || undefined,
          enabled,
          lineIndex: i
        })
      }
    }
    return entries
  } catch {
    return []
  }
}

export function getHostsRaw(): string {
  try {
    return readFileSync(HOSTS_PATH, 'utf-8')
  } catch {
    return ''
  }
}

export function addHostEntry(ip: string, hostname: string): { success: boolean; error?: string } {
  try {
    const content = readFileSync(HOSTS_PATH, 'utf-8')
    const newLine = `${ip}\t${hostname}`
    writeFileSync(HOSTS_PATH, content.trimEnd() + '\n' + newLine + '\n', 'utf-8')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export function removeHostEntry(lineIndex: number): { success: boolean; error?: string } {
  try {
    const content = readFileSync(HOSTS_PATH, 'utf-8')
    const lines = content.split('\n')
    if (lineIndex >= 0 && lineIndex < lines.length) {
      lines.splice(lineIndex, 1)
      writeFileSync(HOSTS_PATH, lines.join('\n'), 'utf-8')
      return { success: true }
    }
    return { success: false, error: 'Invalid line index' }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export function toggleHostEntry(lineIndex: number): { success: boolean; error?: string } {
  try {
    const content = readFileSync(HOSTS_PATH, 'utf-8')
    const lines = content.split('\n')
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const line = lines[lineIndex]
      if (line.trimStart().startsWith('#')) {
        lines[lineIndex] = line.replace(/^(\s*)#\s*/, '$1')
      } else {
        lines[lineIndex] = '# ' + line
      }
      writeFileSync(HOSTS_PATH, lines.join('\n'), 'utf-8')
      return { success: true }
    }
    return { success: false, error: 'Invalid line index' }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

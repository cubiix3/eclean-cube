import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs'

export interface LogEntry {
  timestamp: number
  level: 'info' | 'warn' | 'error' | 'success'
  category: string
  message: string
  details?: string
}

const MAX_LOG_ENTRIES = 2000

function getLogDir(): string {
  const dir = join(app.getPath('userData'), 'logs')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function getLogPath(): string {
  const date = new Date().toISOString().split('T')[0]
  return join(getLogDir(), `eclean-${date}.json`)
}

function loadTodayLog(): LogEntry[] {
  try {
    const logPath = getLogPath()
    if (existsSync(logPath)) {
      return JSON.parse(readFileSync(logPath, 'utf-8'))
    }
  } catch { /* ignore */ }
  return []
}

function saveTodayLog(entries: LogEntry[]): void {
  try {
    const trimmed = entries.slice(0, MAX_LOG_ENTRIES)
    writeFileSync(getLogPath(), JSON.stringify(trimmed, null, 2), 'utf-8')
  } catch { /* ignore */ }
}

export function log(level: LogEntry['level'], category: string, message: string, details?: string): void {
  const entry: LogEntry = { timestamp: Date.now(), level, category, message, details }
  const entries = loadTodayLog()
  entries.unshift(entry)
  saveTodayLog(entries)
}

export function getLogs(limit: number = 100, category?: string): LogEntry[] {
  const entries = loadTodayLog()
  const filtered = category ? entries.filter(e => e.category === category) : entries
  return filtered.slice(0, limit)
}

export function getLogFiles(): { name: string; size: number; date: string }[] {
  try {
    const dir = getLogDir()
    const { readdirSync, statSync } = require('fs')
    const files = readdirSync(dir) as string[]
    return files
      .filter((f: string) => f.endsWith('.json'))
      .map((f: string) => {
        const stat = statSync(join(dir, f))
        return { name: f, size: stat.size, date: f.replace('eclean-', '').replace('.json', '') }
      })
      .sort((a: any, b: any) => b.date.localeCompare(a.date))
  } catch {
    return []
  }
}

export function getLogsByDate(date: string): LogEntry[] {
  try {
    const logPath = join(getLogDir(), `eclean-${date}.json`)
    if (existsSync(logPath)) {
      return JSON.parse(readFileSync(logPath, 'utf-8'))
    }
  } catch { /* ignore */ }
  return []
}

export function clearLogs(): void {
  try {
    const dir = getLogDir()
    const { readdirSync, unlinkSync } = require('fs')
    const files = readdirSync(dir) as string[]
    for (const f of files) {
      if (f.endsWith('.json')) {
        unlinkSync(join(dir, f))
      }
    }
  } catch { /* ignore */ }
}

export function exportLogs(date?: string): string {
  const entries = date ? getLogsByDate(date) : loadTodayLog()
  const lines = entries.map(e => {
    const time = new Date(e.timestamp).toISOString()
    return `[${time}] [${e.level.toUpperCase()}] [${e.category}] ${e.message}${e.details ? '\n  ' + e.details : ''}`
  })
  return lines.join('\n')
}

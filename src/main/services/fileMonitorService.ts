import { watch, FSWatcher, statSync } from 'fs'
import { BrowserWindow } from 'electron'
import { basename } from 'path'

export interface FileChangeEvent {
  type: 'rename' | 'change'
  path: string
  filename: string
  timestamp: number
  sizeBytes?: number
}

let watchers: Map<string, FSWatcher> = new Map()
let recentChanges: FileChangeEvent[] = []
const MAX_CHANGES = 200

function sendToRenderer(channel: string, data: any): void {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, data)
    }
  }
}

export function startWatching(directory: string): { success: boolean; error?: string } {
  if (watchers.has(directory)) {
    return { success: true } // Already watching
  }

  try {
    const watcher = watch(directory, { recursive: true }, (eventType, filename) => {
      if (!filename) return

      const fullPath = `${directory}\\${filename}`
      let sizeBytes: number | undefined
      try {
        sizeBytes = statSync(fullPath).size
      } catch { /* file may have been deleted */ }

      const event: FileChangeEvent = {
        type: eventType as 'rename' | 'change',
        path: fullPath,
        filename: basename(filename),
        timestamp: Date.now(),
        sizeBytes
      }

      recentChanges.unshift(event)
      if (recentChanges.length > MAX_CHANGES) recentChanges.length = MAX_CHANGES

      sendToRenderer('fileMonitor:change', event)
    })

    watchers.set(directory, watcher)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export function stopWatching(directory: string): void {
  const watcher = watchers.get(directory)
  if (watcher) {
    watcher.close()
    watchers.delete(directory)
  }
}

export function stopAllWatchers(): void {
  for (const [dir, watcher] of watchers) {
    watcher.close()
  }
  watchers.clear()
}

export function getWatchedDirectories(): string[] {
  return Array.from(watchers.keys())
}

export function getRecentChanges(): FileChangeEvent[] {
  return [...recentChanges]
}

export function clearChanges(): void {
  recentChanges = []
}

import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { scanJunkCategory, cleanJunkItems } from './cleanerService'
import { getAllTweaks, checkTweakStatus, applyTweak } from './optimizerService'

export interface Schedule {
  id: string
  name: string
  type: 'cleanup' | 'optimize'
  frequency: 'daily' | 'weekly' | 'monthly'
  enabled: boolean
  lastRun: number | null
  nextRun: number
}

function getSchedulesPath(): string {
  return join(app.getPath('userData'), 'schedules.json')
}

export function getSchedules(): Schedule[] {
  try {
    const filePath = getSchedulesPath()
    if (existsSync(filePath)) {
      const raw = readFileSync(filePath, 'utf-8')
      return JSON.parse(raw)
    }
  } catch {
    // Return empty on error
  }
  return []
}

function saveSchedules(schedules: Schedule[]): void {
  try {
    writeFileSync(getSchedulesPath(), JSON.stringify(schedules, null, 2), 'utf-8')
  } catch {
    // ignore
  }
}

function calculateNextRun(frequency: 'daily' | 'weekly' | 'monthly', fromTime?: number): number {
  const now = fromTime || Date.now()
  switch (frequency) {
    case 'daily':
      return now + 24 * 60 * 60 * 1000
    case 'weekly':
      return now + 7 * 24 * 60 * 60 * 1000
    case 'monthly':
      return now + 30 * 24 * 60 * 60 * 1000
    default:
      return now + 24 * 60 * 60 * 1000
  }
}

export function addSchedule(schedule: Omit<Schedule, 'id' | 'lastRun' | 'nextRun'>): Schedule {
  const schedules = getSchedules()
  const newSchedule: Schedule = {
    ...schedule,
    id: crypto.randomUUID(),
    lastRun: null,
    nextRun: calculateNextRun(schedule.frequency)
  }
  schedules.push(newSchedule)
  saveSchedules(schedules)
  return newSchedule
}

export function removeSchedule(id: string): void {
  const schedules = getSchedules().filter((s) => s.id !== id)
  saveSchedules(schedules)
}

export function updateSchedule(id: string, updates: Partial<Schedule>): Schedule | null {
  const schedules = getSchedules()
  const index = schedules.findIndex((s) => s.id === id)
  if (index === -1) return null

  const updated = { ...schedules[index], ...updates }
  // Recalculate nextRun if frequency changed
  if (updates.frequency) {
    updated.nextRun = calculateNextRun(updates.frequency)
  }
  schedules[index] = updated
  saveSchedules(schedules)
  return updated
}

async function runCleanup(): Promise<{ cleaned: number; errors: string[] }> {
  const categoryIds = ['browsers', 'system', 'apps', 'games']
  const allPaths: string[] = []

  for (const id of categoryIds) {
    try {
      const category = await scanJunkCategory(id)
      for (const item of category.items) {
        allPaths.push(item.path)
      }
    } catch {
      // Skip category on error
    }
  }

  if (allPaths.length === 0) {
    return { cleaned: 0, errors: [] }
  }

  return await cleanJunkItems(allPaths)
}

async function runOptimize(): Promise<{ applied: number; errors: string[] }> {
  const tweaks = getAllTweaks()
  const safeTweaks = tweaks.filter((t) => t.riskLevel === 'safe')
  let applied = 0
  const errors: string[] = []

  for (const tweak of safeTweaks) {
    try {
      const isApplied = await checkTweakStatus(tweak.id)
      if (!isApplied) {
        const result = await applyTweak(tweak.id)
        if (result.success) {
          applied++
        } else if (result.error) {
          errors.push(`${tweak.name}: ${result.error}`)
        }
      }
    } catch (e: any) {
      errors.push(`${tweak.name}: ${e.message}`)
    }
  }

  return { applied, errors }
}

export async function runScheduleNow(
  id: string
): Promise<{ success: boolean; message: string }> {
  const schedules = getSchedules()
  const schedule = schedules.find((s) => s.id === id)
  if (!schedule) return { success: false, message: 'Schedule not found' }

  try {
    if (schedule.type === 'cleanup') {
      const result = await runCleanup()
      // Update lastRun and nextRun
      updateSchedule(id, {
        lastRun: Date.now(),
        nextRun: calculateNextRun(schedule.frequency)
      })
      return {
        success: true,
        message: `Cleaned ${result.cleaned} items${result.errors.length > 0 ? `, ${result.errors.length} errors` : ''}`
      }
    } else {
      const result = await runOptimize()
      updateSchedule(id, {
        lastRun: Date.now(),
        nextRun: calculateNextRun(schedule.frequency)
      })
      return {
        success: true,
        message: `Applied ${result.applied} optimizations${result.errors.length > 0 ? `, ${result.errors.length} errors` : ''}`
      }
    }
  } catch (e: any) {
    return { success: false, message: e.message || 'Unknown error' }
  }
}

export async function checkAndRunSchedules(): Promise<void> {
  const schedules = getSchedules()
  const now = Date.now()

  for (const schedule of schedules) {
    if (!schedule.enabled) continue
    if (now < schedule.nextRun) continue

    try {
      await runScheduleNow(schedule.id)
    } catch {
      // Update nextRun even on failure to avoid infinite retries
      updateSchedule(schedule.id, {
        nextRun: calculateNextRun(schedule.frequency)
      })
    }
  }
}

let schedulerInterval: ReturnType<typeof setInterval> | null = null

export function startSchedulerLoop(): void {
  // Check on startup
  checkAndRunSchedules().catch(() => {})

  // Check every hour
  schedulerInterval = setInterval(
    () => {
      checkAndRunSchedules().catch(() => {})
    },
    60 * 60 * 1000
  )
}

export function stopSchedulerLoop(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval)
    schedulerInterval = null
  }
}

// Export for auto-startup features
export { runCleanup as runAutoCleanup, runOptimize as runAutoOptimize }

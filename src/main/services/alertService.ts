import { BrowserWindow, Notification } from 'electron'
import { getTemperatures } from './systemInfo'

interface TempThresholds {
  cpu: number
  gpu: number
}

let monitorInterval: ReturnType<typeof setInterval> | null = null
let thresholds: TempThresholds = { cpu: 85, gpu: 85 }

// Track last alert time to avoid spamming (minimum 60s between alerts per type)
let lastCpuAlert = 0
let lastGpuAlert = 0
const ALERT_COOLDOWN = 60000

function sendToRenderer(channel: string, data: any): void {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, data)
    }
  }
}

export function startTempMonitoring(cpuThreshold?: number, gpuThreshold?: number): void {
  if (cpuThreshold !== undefined) thresholds.cpu = cpuThreshold
  if (gpuThreshold !== undefined) thresholds.gpu = gpuThreshold

  stopTempMonitoring()

  monitorInterval = setInterval(async () => {
    try {
      const temps = await getTemperatures()
      const now = Date.now()

      if (temps.cpuTemp > 0 && temps.cpuTemp > thresholds.cpu && now - lastCpuAlert > ALERT_COOLDOWN) {
        lastCpuAlert = now
        const warning = {
          type: 'cpu' as const,
          temp: temps.cpuTemp,
          threshold: thresholds.cpu,
          message: `CPU temperature is ${Math.round(temps.cpuTemp)}°C (threshold: ${thresholds.cpu}°C)`
        }
        sendToRenderer('alerts:tempWarning', warning)

        if (Notification.isSupported()) {
          new Notification({
            title: 'Temperature Warning',
            body: warning.message,
            icon: undefined
          }).show()
        }
      }

      if (temps.gpuTemp > 0 && temps.gpuTemp > thresholds.gpu && now - lastGpuAlert > ALERT_COOLDOWN) {
        lastGpuAlert = now
        const warning = {
          type: 'gpu' as const,
          temp: temps.gpuTemp,
          threshold: thresholds.gpu,
          message: `GPU temperature is ${Math.round(temps.gpuTemp)}°C (threshold: ${thresholds.gpu}°C)`
        }
        sendToRenderer('alerts:tempWarning', warning)

        if (Notification.isSupported()) {
          new Notification({
            title: 'Temperature Warning',
            body: warning.message,
            icon: undefined
          }).show()
        }
      }
    } catch {
      // Silently handle errors during monitoring
    }
  }, 10000)
}

export function stopTempMonitoring(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval)
    monitorInterval = null
  }
}

export function setThresholds(cpu: number, gpu: number): void {
  thresholds.cpu = cpu
  thresholds.gpu = gpu
}

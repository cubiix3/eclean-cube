import { runPowerShell, runPowerShellJSON } from './powershell'

export interface SystemOverview {
  cpu: { name: string; usage: number; temp: number | null }
  ram: { total: number; used: number; percent: number }
  gpu: { name: string; usage: number | null; temp: number | null }
  disk: { total: number; used: number; percent: number }
}

export async function getSystemOverview(): Promise<SystemOverview> {
  const [cpu, ram, disk, gpuName] = await Promise.all([
    getCpuInfo(),
    getRamInfo(),
    getDiskInfo(),
    getGpuName()
  ])
  return { cpu, ram, gpu: { name: gpuName, usage: null, temp: null }, disk }
}

async function getCpuInfo() {
  try {
    const name = await runPowerShell('(Get-CimInstance Win32_Processor).Name')
    const usage = await runPowerShell('(Get-CimInstance Win32_Processor).LoadPercentage')
    return {
      name: name || 'Unknown CPU',
      usage: parseInt(usage) || 0,
      temp: null
    }
  } catch {
    return { name: 'Unknown CPU', usage: 0, temp: null }
  }
}

async function getRamInfo() {
  try {
    const result = await runPowerShellJSON<{
      TotalVisibleMemorySize: number
      FreePhysicalMemory: number
    }>('Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize, FreePhysicalMemory')
    const totalGB = (result?.TotalVisibleMemorySize || 0) / 1024 / 1024
    const freeGB = (result?.FreePhysicalMemory || 0) / 1024 / 1024
    const usedGB = totalGB - freeGB
    return {
      total: Math.round(totalGB * 10) / 10,
      used: Math.round(usedGB * 10) / 10,
      percent: totalGB > 0 ? Math.round((usedGB / totalGB) * 100) : 0
    }
  } catch {
    return { total: 0, used: 0, percent: 0 }
  }
}

async function getDiskInfo() {
  try {
    const result = await runPowerShellJSON<
      { Size: number; FreeSpace: number } | Array<{ Size: number; FreeSpace: number }>
    >(
      "Get-CimInstance Win32_LogicalDisk -Filter \\\"DriveType=3\\\" | Select-Object Size, FreeSpace"
    )
    const disks = Array.isArray(result) ? result : result ? [result] : []
    const totalGB = disks.reduce((s, d) => s + (d.Size || 0), 0) / 1024 / 1024 / 1024
    const freeGB = disks.reduce((s, d) => s + (d.FreeSpace || 0), 0) / 1024 / 1024 / 1024
    const usedGB = totalGB - freeGB
    return {
      total: Math.round(totalGB),
      used: Math.round(usedGB),
      percent: totalGB > 0 ? Math.round((usedGB / totalGB) * 100) : 0
    }
  } catch {
    return { total: 0, used: 0, percent: 0 }
  }
}

async function getGpuName(): Promise<string> {
  try {
    const name = await runPowerShell('(Get-CimInstance Win32_VideoController).Name')
    return name || 'Unknown GPU'
  } catch {
    return 'Unknown GPU'
  }
}

export async function getCpuUsage(): Promise<number> {
  try {
    const usage = await runPowerShell('(Get-CimInstance Win32_Processor).LoadPercentage')
    return parseInt(usage) || 0
  } catch {
    return 0
  }
}

export async function getRamUsage(): Promise<number> {
  try {
    const result = await runPowerShellJSON<{
      TotalVisibleMemorySize: number
      FreePhysicalMemory: number
    }>('Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize, FreePhysicalMemory')
    const total = result?.TotalVisibleMemorySize || 0
    const free = result?.FreePhysicalMemory || 0
    return total > 0 ? Math.round(((total - free) / total) * 100) : 0
  } catch {
    return 0
  }
}

export interface TemperatureData {
  cpuTemp: number
  gpuTemp: number
}

export async function getTemperatures(): Promise<TemperatureData> {
  const [cpuResult, gpuResult] = await Promise.all([
    runPowerShell(
      '$temp = Get-CimInstance MSAcpi_ThermalZoneTemperature -Namespace root/wmi -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty CurrentTemperature; if ($temp) { ($temp - 2732) / 10 } else { -1 }'
    ).catch(() => '-1'),
    runPowerShell(
      `$nvidiaSmi = 'C:\\Program Files\\NVIDIA Corporation\\NVSMI\\nvidia-smi.exe'; if (Test-Path $nvidiaSmi) { & $nvidiaSmi --query-gpu=temperature.gpu --format=csv,noheader,nounits } else { $amd = Get-CimInstance -Namespace root/OpenHardwareMonitor -ClassName Sensor -ErrorAction SilentlyContinue | Where-Object { $_.SensorType -eq 'Temperature' -and $_.Name -like '*GPU*' } | Select-Object -First 1 -ExpandProperty Value; if ($amd) { $amd } else { -1 } }`
    ).catch(() => '-1')
  ])

  const cpuTemp = parseFloat(cpuResult) || -1
  const gpuTemp = parseFloat(gpuResult) || -1

  return { cpuTemp, gpuTemp }
}

import { runPowerShellJSON } from './powershell'

export interface CpuInfo {
  name: string
  cores: number
  threads: number
  baseClockMHz: number
  maxClockMHz: number
  l2CacheKB: number
  l3CacheKB: number
}

export interface GpuInfo {
  name: string
  vramBytes: number
  driverVersion: string
}

export interface RamInfo {
  totalGB: number
  modules: { capacityGB: number; speedMHz: number; slot: string; manufacturer: string }[]
}

export interface StorageInfo {
  model: string
  sizeGB: number
  mediaType: string
  interface: string
}

export interface NetworkInfo {
  name: string
  mac: string
  ip: string[]
  dhcp: boolean
}

export interface MotherboardInfo {
  manufacturer: string
  model: string
  biosVersion: string
}

export interface OsInfo {
  name: string
  version: string
  build: string
  arch: string
}

export interface HardwareInfo {
  cpu: CpuInfo
  gpu: GpuInfo[]
  ram: RamInfo
  storage: StorageInfo[]
  network: NetworkInfo[]
  motherboard: MotherboardInfo
  os: OsInfo
}

export interface DetailedSensors {
  timestamp: number
  cpuCores: { name: string; usage: number }[]
  cpuFreqMHz: number
  ramUsedGB: number
  ramAvailGB: number
  netAdapters: { name: string; recvBytesPerSec: number; sentBytesPerSec: number }[]
  diskIO: { name: string; readBytesPerSec: number; writeBytesPerSec: number }[]
}

async function getCpuDetails(): Promise<CpuInfo> {
  const result = await runPowerShellJSON<any>(
    'Get-CimInstance Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors, MaxClockSpeed, L2CacheSize, L3CacheSize'
  )
  const cpu = Array.isArray(result) ? result[0] : result
  return {
    name: cpu.Name || 'Unknown',
    cores: cpu.NumberOfCores || 0,
    threads: cpu.NumberOfLogicalProcessors || 0,
    baseClockMHz: cpu.MaxClockSpeed || 0,
    maxClockMHz: cpu.MaxClockSpeed || 0,
    l2CacheKB: cpu.L2CacheSize || 0,
    l3CacheKB: cpu.L3CacheSize || 0
  }
}

async function getGpuDetails(): Promise<GpuInfo[]> {
  const result = await runPowerShellJSON<any>(
    'Get-CimInstance Win32_VideoController | Select-Object Name, AdapterRAM, DriverVersion'
  )
  const items = Array.isArray(result) ? result : [result]
  return items.map((g: any) => ({
    name: g.Name || 'Unknown',
    vramBytes: g.AdapterRAM || 0,
    driverVersion: g.DriverVersion || 'Unknown'
  }))
}

async function getRamDetails(): Promise<RamInfo> {
  const result = await runPowerShellJSON<any>(
    'Get-CimInstance Win32_PhysicalMemory | Select-Object Capacity, Speed, DeviceLocator, Manufacturer'
  )
  const items = Array.isArray(result) ? result : [result]
  const modules = items.map((m: any) => ({
    capacityGB: Math.round((m.Capacity || 0) / 1073741824 * 100) / 100,
    speedMHz: m.Speed || 0,
    slot: m.DeviceLocator || 'Unknown',
    manufacturer: m.Manufacturer || 'Unknown'
  }))
  const totalGB = modules.reduce((sum: number, m: any) => sum + m.capacityGB, 0)
  return { totalGB: Math.round(totalGB * 100) / 100, modules }
}

async function getStorageDetails(): Promise<StorageInfo[]> {
  const result = await runPowerShellJSON<any>(
    'Get-CimInstance Win32_DiskDrive | Select-Object Model, Size, MediaType, InterfaceType'
  )
  const items = Array.isArray(result) ? result : [result]
  return items.map((d: any) => ({
    model: d.Model || 'Unknown',
    sizeGB: Math.round((d.Size || 0) / 1073741824 * 100) / 100,
    mediaType: d.MediaType || 'Unknown',
    interface: d.InterfaceType || 'Unknown'
  }))
}

async function getNetworkDetails(): Promise<NetworkInfo[]> {
  const result = await runPowerShellJSON<any>(
    'Get-CimInstance Win32_NetworkAdapterConfiguration -Filter "IPEnabled=True" | Select-Object Description, MACAddress, IPAddress, DHCPEnabled'
  )
  const items = Array.isArray(result) ? result : [result]
  return items.map((n: any) => ({
    name: n.Description || 'Unknown',
    mac: n.MACAddress || 'Unknown',
    ip: Array.isArray(n.IPAddress) ? n.IPAddress : n.IPAddress ? [n.IPAddress] : [],
    dhcp: n.DHCPEnabled || false
  }))
}

async function getMotherboardDetails(): Promise<MotherboardInfo> {
  const [boardResult, biosResult] = await Promise.all([
    runPowerShellJSON<any>(
      'Get-CimInstance Win32_BaseBoard | Select-Object Manufacturer, Product'
    ),
    runPowerShellJSON<any>(
      'Get-CimInstance Win32_BIOS | Select-Object SMBIOSBIOSVersion'
    )
  ])
  const board = Array.isArray(boardResult) ? boardResult[0] : boardResult
  const bios = Array.isArray(biosResult) ? biosResult[0] : biosResult
  return {
    manufacturer: board.Manufacturer || 'Unknown',
    model: board.Product || 'Unknown',
    biosVersion: bios.SMBIOSBIOSVersion || 'Unknown'
  }
}

async function getOsDetails(): Promise<OsInfo> {
  const result = await runPowerShellJSON<any>(
    'Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, BuildNumber, OSArchitecture'
  )
  const os = Array.isArray(result) ? result[0] : result
  return {
    name: os.Caption || 'Unknown',
    version: os.Version || 'Unknown',
    build: os.BuildNumber || 'Unknown',
    arch: os.OSArchitecture || 'Unknown'
  }
}

export async function getHardwareInfo(): Promise<HardwareInfo> {
  const [cpu, gpu, ram, storage, network, motherboard, os] = await Promise.all([
    getCpuDetails(),
    getGpuDetails(),
    getRamDetails(),
    getStorageDetails(),
    getNetworkDetails(),
    getMotherboardDetails(),
    getOsDetails()
  ])
  return { cpu, gpu, ram, storage, network, motherboard, os }
}

export async function getDetailedSensors(): Promise<DetailedSensors> {
  const [cpuCoresResult, osResult, cpuFreqResult, netResult, diskResult] = await Promise.all([
    runPowerShellJSON<any>(
      'Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor | Select-Object Name, PercentProcessorTime'
    ),
    runPowerShellJSON<any>(
      'Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize, FreePhysicalMemory'
    ),
    runPowerShellJSON<any>(
      'Get-CimInstance Win32_Processor | Select-Object CurrentClockSpeed'
    ),
    runPowerShellJSON<any>(
      'Get-CimInstance Win32_PerfFormattedData_Tcpip_NetworkInterface | Select-Object Name, BytesReceivedPersec, BytesSentPersec'
    ).catch(() => []),
    runPowerShellJSON<any>(
      'Get-CimInstance Win32_PerfFormattedData_PerfDisk_LogicalDisk | Select-Object Name, DiskReadBytesPersec, DiskWriteBytesPersec'
    ).catch(() => [])
  ])

  // CPU cores
  const cpuCoresItems = Array.isArray(cpuCoresResult) ? cpuCoresResult : [cpuCoresResult]
  const cpuCores = cpuCoresItems
    .filter((c: any) => c.Name !== '_Total')
    .map((c: any) => ({
      name: `Core ${c.Name}`,
      usage: Number(c.PercentProcessorTime) || 0
    }))

  // RAM
  const osData = Array.isArray(osResult) ? osResult[0] : osResult
  const totalMemKB = osData.TotalVisibleMemorySize || 0
  const freeMemKB = osData.FreePhysicalMemory || 0
  const ramUsedGB = Math.round(((totalMemKB - freeMemKB) / 1048576) * 100) / 100
  const ramAvailGB = Math.round((freeMemKB / 1048576) * 100) / 100

  // CPU frequency
  const cpuFreqData = Array.isArray(cpuFreqResult) ? cpuFreqResult[0] : cpuFreqResult
  const cpuFreqMHz = cpuFreqData.CurrentClockSpeed || 0

  // Network
  const netItems = Array.isArray(netResult) ? netResult : netResult ? [netResult] : []
  const netAdapters = netItems.map((n: any) => ({
    name: n.Name || 'Unknown',
    recvBytesPerSec: Number(n.BytesReceivedPersec) || 0,
    sentBytesPerSec: Number(n.BytesSentPersec) || 0
  }))

  // Disk I/O
  const diskItems = Array.isArray(diskResult) ? diskResult : diskResult ? [diskResult] : []
  const diskIO = diskItems
    .filter((d: any) => d.Name !== '_Total')
    .map((d: any) => ({
      name: d.Name || 'Unknown',
      readBytesPerSec: Number(d.DiskReadBytesPersec) || 0,
      writeBytesPerSec: Number(d.DiskWriteBytesPersec) || 0
    }))

  return {
    timestamp: Date.now(),
    cpuCores,
    cpuFreqMHz,
    ramUsedGB,
    ramAvailGB,
    netAdapters,
    diskIO
  }
}

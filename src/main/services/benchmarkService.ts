import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { runPowerShell } from './powershell'

export interface CPUBenchmarkResult {
  score: number
  timeMs: number
}

export interface RAMBenchmarkResult {
  score: number
  timeMs: number
}

export interface DiskBenchmarkResult {
  score: number
  writeMs: number
  readMs: number
  writeMBs: number
  readMBs: number
}

export interface FullBenchmarkResult {
  cpu: CPUBenchmarkResult
  ram: RAMBenchmarkResult
  disk: DiskBenchmarkResult
  totalScore: number
  timestamp: number
}

function getHistoryPath(): string {
  return join(app.getPath('userData'), 'benchmark-history.json')
}

export async function benchmarkCPU(): Promise<CPUBenchmarkResult> {
  try {
    const raw = await runPowerShell(
      `$sw = [System.Diagnostics.Stopwatch]::StartNew(); $result = 0; for ($i = 0; $i -lt 1000000; $i++) { $result += [math]::Sqrt($i) * [math]::Sin($i) }; $sw.Stop(); $sw.ElapsedMilliseconds`
    )
    const timeMs = parseInt(raw.trim(), 10) || 1
    const score = Math.round((10000 / timeMs) * 100)
    return { score, timeMs }
  } catch {
    return { score: 0, timeMs: 0 }
  }
}

export async function benchmarkRAM(): Promise<RAMBenchmarkResult> {
  try {
    const raw = await runPowerShell(
      `$sw = [System.Diagnostics.Stopwatch]::StartNew(); $arr = New-Object byte[] 104857600; for ($i = 0; $i -lt 100; $i++) { $arr[$i * 1048576] = [byte]$i }; $sw.Stop(); $sw.ElapsedMilliseconds`
    )
    const timeMs = parseInt(raw.trim(), 10) || 1
    const score = Math.round((10000 / timeMs) * 100)
    return { score, timeMs }
  } catch {
    return { score: 0, timeMs: 0 }
  }
}

export async function benchmarkDisk(): Promise<DiskBenchmarkResult> {
  try {
    const raw = await runPowerShell(
      `$path = [System.IO.Path]::GetTempFileName(); $data = New-Object byte[] 104857600; $sw = [System.Diagnostics.Stopwatch]::StartNew(); [System.IO.File]::WriteAllBytes($path, $data); $writeTime = $sw.ElapsedMilliseconds; $sw.Restart(); [System.IO.File]::ReadAllBytes($path) | Out-Null; $readTime = $sw.ElapsedMilliseconds; Remove-Item $path -Force; "$writeTime,$readTime"`
    )
    const parts = raw.trim().split(',')
    const writeMs = parseInt(parts[0], 10) || 1
    const readMs = parseInt(parts[1], 10) || 1
    const writeMBs = Math.round((100 / writeMs) * 1000)
    const readMBs = Math.round((100 / readMs) * 1000)
    const score = Math.round(((writeMBs + readMBs) / 2) * 10)
    return { score, writeMs, readMs, writeMBs, readMBs }
  } catch {
    return { score: 0, writeMs: 0, readMs: 0, writeMBs: 0, readMBs: 0 }
  }
}

export async function runFullBenchmark(): Promise<FullBenchmarkResult> {
  const cpu = await benchmarkCPU()
  const ram = await benchmarkRAM()
  const disk = await benchmarkDisk()
  const totalScore = Math.round((cpu.score + ram.score + disk.score) / 3)
  const result: FullBenchmarkResult = {
    cpu,
    ram,
    disk,
    totalScore,
    timestamp: Date.now()
  }

  await saveBenchmarkResult(result)
  return result
}

export async function getBenchmarkHistory(): Promise<FullBenchmarkResult[]> {
  const historyPath = getHistoryPath()
  try {
    if (existsSync(historyPath)) {
      const raw = readFileSync(historyPath, 'utf-8')
      return JSON.parse(raw)
    }
  } catch {
    // Return empty on error
  }
  return []
}

export async function saveBenchmarkResult(result: FullBenchmarkResult): Promise<void> {
  const historyPath = getHistoryPath()
  let history: FullBenchmarkResult[] = []
  try {
    if (existsSync(historyPath)) {
      const raw = readFileSync(historyPath, 'utf-8')
      history = JSON.parse(raw)
    }
  } catch {
    history = []
  }
  history.push(result)
  // Keep last 50 results
  if (history.length > 50) {
    history = history.slice(-50)
  }
  writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf-8')
}

import { spawn, ChildProcess } from 'child_process'

let psProcess: ChildProcess | null = null
let commandQueue: Array<{
  command: string
  resolve: (value: string) => void
  reject: (reason: Error) => void
}> = []
let isProcessing = false

const DELIMITER = '___ECLEAN_CMD_END___'

function ensureProcess(): ChildProcess {
  if (psProcess && !psProcess.killed) return psProcess

  psProcess = spawn('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-NoLogo',
    '-Command',
    '-'
  ], {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true
  })

  let buffer = ''

  psProcess.stdout?.on('data', (data: Buffer) => {
    buffer += data.toString()

    const delimIndex = buffer.indexOf(DELIMITER)
    if (delimIndex !== -1) {
      const result = buffer.substring(0, delimIndex).trim()
      buffer = buffer.substring(delimIndex + DELIMITER.length)

      if (commandQueue.length > 0) {
        const current = commandQueue.shift()!
        current.resolve(result)
        isProcessing = false
        processNext()
      }
    }
  })

  psProcess.stderr?.on('data', (data: Buffer) => {
    // Collect stderr but don't fail - some commands write warnings to stderr
    const errText = data.toString().trim()
    if (errText && commandQueue.length > 0) {
      // Only log, don't reject - many PS commands write non-fatal warnings to stderr
      console.warn('[PS stderr]', errText)
    }
  })

  psProcess.on('exit', () => {
    psProcess = null
    // Reject any pending commands
    while (commandQueue.length > 0) {
      const cmd = commandQueue.shift()!
      cmd.reject(new Error('PowerShell process exited'))
    }
    isProcessing = false
  })

  return psProcess
}

function processNext(): void {
  if (isProcessing || commandQueue.length === 0) return

  const ps = ensureProcess()
  isProcessing = true

  const current = commandQueue[0]
  // Wrap command to catch errors and always output delimiter
  const wrappedCommand = `try { ${current.command} } catch { Write-Output "ERROR: $_" }; Write-Output '${DELIMITER}'\n`
  ps.stdin?.write(wrappedCommand)
}

export async function runPowerShell(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Set timeout to prevent hanging
    const timeout = setTimeout(() => {
      reject(new Error(`PowerShell command timed out: ${command.substring(0, 100)}`))
      // Remove from queue if still there
      const idx = commandQueue.findIndex(c => c.resolve === resolve)
      if (idx !== -1) commandQueue.splice(idx, 1)
      if (commandQueue.length === 0) isProcessing = false
    }, 30000)

    commandQueue.push({
      command,
      resolve: (value) => {
        clearTimeout(timeout)
        resolve(value)
      },
      reject: (err) => {
        clearTimeout(timeout)
        reject(err)
      }
    })
    processNext()
  })
}

export async function runPowerShellJSON<T>(command: string): Promise<T> {
  const result = await runPowerShell(`${command} | ConvertTo-Json -Depth 5 -Compress`)
  if (!result || result === '') {
    return [] as unknown as T
  }
  try {
    return JSON.parse(result)
  } catch {
    return [] as unknown as T
  }
}

export async function isRunningAsAdmin(): Promise<boolean> {
  try {
    const result = await runPowerShell(
      "([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] 'Administrator')"
    )
    return result.trim().toLowerCase() === 'true'
  } catch {
    return false
  }
}

export function closePowerShell(): void {
  if (psProcess && !psProcess.killed) {
    psProcess.stdin?.write('exit\n')
    psProcess.kill()
    psProcess = null
  }
  commandQueue = []
  isProcessing = false
}

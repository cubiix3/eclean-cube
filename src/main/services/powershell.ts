import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function runPowerShell(command: string): Promise<string> {
  const { stdout } = await execAsync(
    `powershell -NoProfile -NonInteractive -Command "${command.replace(/"/g, '\\"')}"`,
    { maxBuffer: 10 * 1024 * 1024 }
  )
  return stdout.trim()
}

export async function runPowerShellJSON<T>(command: string): Promise<T> {
  const result = await runPowerShell(`${command} | ConvertTo-Json -Depth 5`)
  return JSON.parse(result)
}

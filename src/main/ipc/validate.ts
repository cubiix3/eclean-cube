import { ipcMain } from 'electron'

type Handler = (...args: any[]) => Promise<any>

/**
 * Register an IPC handler with input validation
 */
export function handleWithValidation(
  channel: string,
  validator: (args: any[]) => boolean,
  handler: Handler
): void {
  ipcMain.handle(channel, async (_event, ...args) => {
    if (!validator(args)) {
      throw new Error(`Invalid arguments for ${channel}`)
    }
    try {
      return await handler(...args)
    } catch (error: any) {
      console.error(`[IPC Error] ${channel}:`, error.message)
      throw new Error(error.message || 'An error occurred')
    }
  })
}

// Common validators
export const validators = {
  noArgs: (args: any[]) => args.length === 0,
  string: (args: any[]) => args.length >= 1 && typeof args[0] === 'string',
  number: (args: any[]) => args.length >= 1 && typeof args[0] === 'number',
  stringArray: (args: any[]) => args.length >= 1 && Array.isArray(args[0]) && args[0].every((s: any) => typeof s === 'string'),
  boolean: (args: any[]) => args.length >= 1 && typeof args[0] === 'boolean',
}

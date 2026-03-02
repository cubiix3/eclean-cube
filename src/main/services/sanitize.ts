/**
 * Sanitize a string for safe use in PowerShell commands.
 * Prevents command injection by escaping special characters.
 */
export function sanitizeForPS(input: string): string {
  if (typeof input !== 'string') return ''
  // Remove null bytes
  let clean = input.replace(/\0/g, '')
  // Escape single quotes (PowerShell string delimiter)
  clean = clean.replace(/'/g, "''")
  // Remove backticks (PowerShell escape character)
  clean = clean.replace(/`/g, '')
  // Remove semicolons (command separator)
  clean = clean.replace(/;/g, '')
  // Remove pipe (command chaining)
  clean = clean.replace(/\|/g, '')
  // Remove $( ) (subexpression)
  clean = clean.replace(/\$\(/g, '(')
  return clean
}

/**
 * Sanitize a file path - only allow valid Windows path characters
 */
export function sanitizePath(input: string): string {
  if (typeof input !== 'string') return ''
  // Only allow: letters, digits, spaces, backslash, forward slash, colon, dot, hyphen, underscore, parentheses
  return input.replace(/[^a-zA-Z0-9\s\\/:.\-_()]/g, '')
}

/**
 * Validate that a value is a safe number for PS commands
 */
export function sanitizeNumber(input: unknown): number {
  const num = Number(input)
  if (isNaN(num) || !isFinite(num)) return 0
  return Math.floor(num)
}

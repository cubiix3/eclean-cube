import { app } from 'electron'
import path from 'path'
import { existsSync, readdirSync, statSync, rmSync } from 'fs'
import { runPowerShell } from './powershell'

export interface BrowserDataInfo {
  name: string
  profilePath: string
  hasHistory: boolean
  hasCookies: boolean
  hasCache: boolean
  hasSessions: boolean
  hasPasswords: boolean
  dataSize: number
}

interface BrowserDef {
  name: string
  getProfilePath: () => string
  isFirefox?: boolean
}

const BROWSERS: BrowserDef[] = [
  {
    name: 'Chrome',
    getProfilePath: () =>
      path.join(
        process.env.LOCALAPPDATA || path.join(app.getPath('home'), 'AppData/Local'),
        'Google/Chrome/User Data/Default'
      )
  },
  {
    name: 'Edge',
    getProfilePath: () =>
      path.join(
        process.env.LOCALAPPDATA || path.join(app.getPath('home'), 'AppData/Local'),
        'Microsoft/Edge/User Data/Default'
      )
  },
  {
    name: 'Brave',
    getProfilePath: () =>
      path.join(
        process.env.LOCALAPPDATA || path.join(app.getPath('home'), 'AppData/Local'),
        'BraveSoftware/Brave-Browser/User Data/Default'
      )
  },
  {
    name: 'Opera',
    getProfilePath: () =>
      path.join(
        process.env.APPDATA || path.join(app.getPath('home'), 'AppData/Roaming'),
        'Opera Software/Opera Stable'
      )
  },
  {
    name: 'Firefox',
    isFirefox: true,
    getProfilePath: () => {
      const profilesDir = path.join(
        process.env.APPDATA || path.join(app.getPath('home'), 'AppData/Roaming'),
        'Mozilla/Firefox/Profiles'
      )
      try {
        if (existsSync(profilesDir)) {
          const dirs = readdirSync(profilesDir)
          const defaultProfile = dirs.find(
            (d) => d.endsWith('.default-release') || d.endsWith('.default')
          )
          if (defaultProfile) {
            return path.join(profilesDir, defaultProfile)
          }
        }
      } catch {
        // ignore
      }
      return profilesDir
    }
  }
]

function getPathSize(p: string): number {
  try {
    if (!existsSync(p)) return 0
    const stat = statSync(p)
    if (stat.isFile()) return stat.size
    if (stat.isDirectory()) {
      let total = 0
      const entries = readdirSync(p, { withFileTypes: true })
      for (const entry of entries) {
        try {
          const entryPath = path.join(p, entry.name)
          if (entry.isFile()) {
            total += statSync(entryPath).size
          } else if (entry.isDirectory()) {
            total += getPathSize(entryPath)
          }
        } catch {
          // Skip entries we can't access
        }
      }
      return total
    }
  } catch {
    // ignore
  }
  return 0
}

function fileExists(dir: string, ...files: string[]): boolean {
  for (const file of files) {
    if (existsSync(path.join(dir, file))) return true
  }
  return false
}

export function getBrowserData(): BrowserDataInfo[] {
  const results: BrowserDataInfo[] = []

  for (const browser of BROWSERS) {
    const profilePath = browser.getProfilePath()
    if (!existsSync(profilePath)) continue

    const hasHistory = browser.isFirefox
      ? fileExists(profilePath, 'places.sqlite')
      : fileExists(profilePath, 'History', 'History-journal')

    const hasCookies = browser.isFirefox
      ? fileExists(profilePath, 'cookies.sqlite')
      : fileExists(profilePath, 'Cookies', 'Cookies-journal')

    const hasCache = browser.isFirefox
      ? existsSync(path.join(profilePath, 'cache2'))
      : existsSync(path.join(profilePath, 'Cache'))

    const hasSessions = browser.isFirefox
      ? fileExists(profilePath, 'sessionstore.jsonlz4')
      : existsSync(path.join(profilePath, 'Sessions'))

    const hasPasswords = browser.isFirefox
      ? fileExists(profilePath, 'logins.json')
      : fileExists(profilePath, 'Login Data')

    // Calculate approximate data size
    let dataSize = 0
    const checkPaths: string[] = []
    if (hasHistory) {
      checkPaths.push(
        browser.isFirefox ? path.join(profilePath, 'places.sqlite') : path.join(profilePath, 'History')
      )
    }
    if (hasCookies) {
      checkPaths.push(
        browser.isFirefox
          ? path.join(profilePath, 'cookies.sqlite')
          : path.join(profilePath, 'Cookies')
      )
    }
    if (hasCache) {
      checkPaths.push(
        browser.isFirefox
          ? path.join(profilePath, 'cache2')
          : path.join(profilePath, 'Cache')
      )
    }
    if (hasSessions) {
      checkPaths.push(
        browser.isFirefox
          ? path.join(profilePath, 'sessionstore.jsonlz4')
          : path.join(profilePath, 'Sessions')
      )
    }

    for (const p of checkPaths) {
      dataSize += getPathSize(p)
    }

    if (hasHistory || hasCookies || hasCache || hasSessions || hasPasswords) {
      results.push({
        name: browser.name,
        profilePath,
        hasHistory,
        hasCookies,
        hasCache,
        hasSessions,
        hasPasswords,
        dataSize
      })
    }
  }

  return results
}

async function closeBrowserProcess(browserName: string): Promise<void> {
  const processNames: Record<string, string> = {
    Chrome: 'chrome',
    Edge: 'msedge',
    Brave: 'brave',
    Opera: 'opera',
    Firefox: 'firefox'
  }
  const processName = processNames[browserName]
  if (processName) {
    try {
      await runPowerShell(
        `Get-Process -Name '${processName}' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue`
      )
      // Give the process a moment to fully close
    } catch {
      // Process may not be running
    }
  }
}

export async function eraseBrowserData(
  browsers: string[],
  types: string[]
): Promise<{ cleaned: number; errors: string[] }> {
  let cleaned = 0
  const errors: string[] = []

  // Close all targeted browsers first
  for (const browserName of browsers) {
    await closeBrowserProcess(browserName)
  }

  // Wait a moment for processes to close
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const allBrowserData = getBrowserData()

  for (const browserName of browsers) {
    const browser = allBrowserData.find((b) => b.name === browserName)
    if (!browser) continue

    const isFirefox = browserName === 'Firefox'
    const profilePath = browser.profilePath

    for (const dataType of types) {
      try {
        switch (dataType) {
          case 'history': {
            if (isFirefox) {
              const target = path.join(profilePath, 'places.sqlite')
              if (existsSync(target)) {
                rmSync(target, { force: true })
                cleaned++
              }
            } else {
              for (const file of ['History', 'History-journal']) {
                const target = path.join(profilePath, file)
                if (existsSync(target)) {
                  rmSync(target, { force: true })
                  cleaned++
                }
              }
            }
            break
          }
          case 'cookies': {
            if (isFirefox) {
              const target = path.join(profilePath, 'cookies.sqlite')
              if (existsSync(target)) {
                rmSync(target, { force: true })
                cleaned++
              }
            } else {
              for (const file of ['Cookies', 'Cookies-journal']) {
                const target = path.join(profilePath, file)
                if (existsSync(target)) {
                  rmSync(target, { force: true })
                  cleaned++
                }
              }
            }
            break
          }
          case 'cache': {
            const cachePath = isFirefox
              ? path.join(profilePath, 'cache2')
              : path.join(profilePath, 'Cache')
            if (existsSync(cachePath)) {
              rmSync(cachePath, { recursive: true, force: true })
              cleaned++
            }
            break
          }
          case 'sessions': {
            if (isFirefox) {
              const target = path.join(profilePath, 'sessionstore.jsonlz4')
              if (existsSync(target)) {
                rmSync(target, { force: true })
                cleaned++
              }
            } else {
              const sessionsPath = path.join(profilePath, 'Sessions')
              if (existsSync(sessionsPath)) {
                rmSync(sessionsPath, { recursive: true, force: true })
                cleaned++
              }
            }
            break
          }
          case 'passwords': {
            if (isFirefox) {
              const target = path.join(profilePath, 'logins.json')
              if (existsSync(target)) {
                rmSync(target, { force: true })
                cleaned++
              }
            } else {
              const target = path.join(profilePath, 'Login Data')
              if (existsSync(target)) {
                rmSync(target, { force: true })
                cleaned++
              }
            }
            break
          }
        }
      } catch (e: any) {
        errors.push(`${browserName} ${dataType}: ${e.message}`)
      }
    }
  }

  return { cleaned, errors }
}

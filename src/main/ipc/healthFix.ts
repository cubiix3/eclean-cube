import { ipcMain, BrowserWindow } from 'electron'
import { scanJunkCategory, cleanJunkItems } from '../services/cleanerService'
import { getAllTweaks, checkTweakStatus, applyTweak } from '../services/optimizerService'
import { log } from '../services/logService'

function sendProgress(step: string, progress: number): void {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send('healthFix:progress', { step, progress })
    }
  }
}

export function registerHealthFixIPC(): void {
  ipcMain.handle('healthFix:run', async () => {
    log('info', 'healthFix', 'Starting one-click health fix')
    const results = {
      junkCleaned: 0,
      junkErrors: 0,
      tweaksApplied: 0,
      tweakErrors: 0,
      ramFreedMB: 0
    }

    try {
      // Step 1: Scan & clean junk (40%)
      sendProgress('Scanning for junk files...', 5)
      const categories = ['browsers', 'system', 'apps', 'games']
      const allPaths: string[] = []

      for (let i = 0; i < categories.length; i++) {
        sendProgress(`Scanning ${categories[i]}...`, 5 + (i * 8))
        try {
          const cat = await scanJunkCategory(categories[i])
          for (const item of cat.items) {
            allPaths.push(item.path)
          }
        } catch { /* skip */ }
      }

      if (allPaths.length > 0) {
        sendProgress('Cleaning junk files...', 35)
        const cleanResult = await cleanJunkItems(allPaths)
        results.junkCleaned = cleanResult.cleaned
        results.junkErrors = cleanResult.errors.length
      }

      // Step 2: Apply safe tweaks (70%)
      sendProgress('Applying safe optimizations...', 45)
      try {
        const tweaks = getAllTweaks()
        const safeTweaks = tweaks.filter(t => t.riskLevel === 'safe')

        for (let i = 0; i < safeTweaks.length; i++) {
          sendProgress(`Checking ${safeTweaks[i].name}...`, 45 + (i / safeTweaks.length * 25))
          try {
            const isApplied = await checkTweakStatus(safeTweaks[i].id)
            if (!isApplied) {
              await applyTweak(safeTweaks[i].id)
              results.tweaksApplied++
            }
          } catch {
            results.tweakErrors++
          }
        }
      } catch { /* skip */ }

      sendProgress('Done!', 100)
      log('success', 'healthFix', `Health fix complete: ${results.junkCleaned} cleaned, ${results.tweaksApplied} tweaks applied`)
    } catch (e: any) {
      log('error', 'healthFix', `Health fix failed: ${e.message}`)
    }

    return results
  })
}

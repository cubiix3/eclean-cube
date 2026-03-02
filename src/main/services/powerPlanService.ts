import { runPowerShell, runPowerShellJSON } from './powershell'

export interface PowerPlan {
  guid: string
  name: string
  isActive: boolean
}

export async function getPowerPlans(): Promise<PowerPlan[]> {
  try {
    const result = await runPowerShell(
      `powercfg /list`
    )
    const lines = result.split('\n').filter(l => l.includes('GUID'))
    const plans: PowerPlan[] = []
    for (const line of lines) {
      const guidMatch = line.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
      const nameMatch = line.match(/\(([^)]+)\)/)
      const isActive = line.includes('*')
      if (guidMatch && nameMatch) {
        plans.push({ guid: guidMatch[1], name: nameMatch[1], isActive })
      }
    }
    return plans
  } catch {
    return []
  }
}

export async function setActivePlan(guid: string): Promise<{ success: boolean; error?: string }> {
  try {
    const safeGuid = guid.replace(/[^a-f0-9-]/gi, '')
    await runPowerShell(`powercfg /setactive ${safeGuid}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function createPlan(name: string, sourceGuid: string): Promise<{ success: boolean; guid?: string; error?: string }> {
  try {
    const safeName = name.replace(/[^a-zA-Z0-9 _-]/g, '')
    const safeSource = sourceGuid.replace(/[^a-f0-9-]/gi, '')
    const result = await runPowerShell(`powercfg /duplicatescheme ${safeSource}`)
    const guidMatch = result.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
    if (guidMatch) {
      await runPowerShell(`powercfg /changename ${guidMatch[1]} "${safeName}"`)
      return { success: true, guid: guidMatch[1] }
    }
    return { success: false, error: 'Could not create plan' }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deletePlan(guid: string): Promise<{ success: boolean; error?: string }> {
  try {
    const safeGuid = guid.replace(/[^a-f0-9-]/gi, '')
    await runPowerShell(`powercfg /delete ${safeGuid}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

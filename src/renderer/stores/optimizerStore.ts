import { create } from 'zustand'
import { useToastStore } from './toastStore'

export type WizardStep = 1 | 2 | 3

interface OptimizerState {
  // Data
  tweaks: OptimizerTweakDefinition[]
  categories: OptimizerCategoryDefinition[]
  tweakStatus: Record<string, boolean>
  backupData: OptimizerBackupData

  // Wizard
  wizardStep: WizardStep
  selectedCategories: string[]
  selectedTweakIds: string[]
  analyzedCategories: string[]

  // Loading
  isLoading: boolean
  isAnalyzing: boolean
  isApplying: boolean
  isReverting: boolean
  applyResults: Record<string, OptimizerApplyResult>

  // Actions - Data
  fetchTweaks: () => Promise<void>
  fetchBackup: () => Promise<void>

  // Actions - Wizard Navigation
  setWizardStep: (step: WizardStep) => void
  resetWizard: () => void

  // Actions - Step 1
  toggleCategory: (categoryId: string) => void
  selectAllCategories: () => void
  deselectAllCategories: () => void

  // Actions - Step 2
  analyzeSelectedCategories: () => Promise<void>

  // Actions - Step 3
  toggleTweakSelection: (tweakId: string) => void
  selectAllTweaks: () => void
  deselectAllTweaks: () => void
  applySelectedTweaks: () => Promise<void>
  revertTweak: (tweakId: string) => Promise<void>
  revertAll: () => Promise<void>
}

export const useOptimizerStore = create<OptimizerState>((set, get) => ({
  // Data
  tweaks: [],
  categories: [],
  tweakStatus: {},
  backupData: {},

  // Wizard
  wizardStep: 1,
  selectedCategories: [],
  selectedTweakIds: [],
  analyzedCategories: [],

  // Loading
  isLoading: false,
  isAnalyzing: false,
  isApplying: false,
  isReverting: false,
  applyResults: {},

  // ── Data Actions ──
  fetchTweaks: async () => {
    set({ isLoading: true })
    try {
      const [tweaks, categories] = await Promise.all([
        window.api.optimizer.getTweaks(),
        window.api.optimizer.getCategories()
      ])
      set({ tweaks, categories })
    } catch {
      set({ tweaks: [], categories: [] })
    }
    set({ isLoading: false })
  },

  fetchBackup: async () => {
    try {
      const backupData = await window.api.optimizer.getBackup()
      set({ backupData })
    } catch {
      set({ backupData: {} })
    }
  },

  // ── Wizard Navigation ──
  setWizardStep: (step) => set({ wizardStep: step }),

  resetWizard: () =>
    set({
      wizardStep: 1,
      selectedCategories: [],
      selectedTweakIds: [],
      analyzedCategories: [],
      tweakStatus: {},
      applyResults: {},
      isAnalyzing: false,
      isApplying: false,
      isReverting: false
    }),

  // ── Step 1: Category Selection ──
  toggleCategory: (categoryId) =>
    set((state) => {
      const isSelected = state.selectedCategories.includes(categoryId)
      return {
        selectedCategories: isSelected
          ? state.selectedCategories.filter((c) => c !== categoryId)
          : [...state.selectedCategories, categoryId]
      }
    }),

  selectAllCategories: () =>
    set((state) => ({
      selectedCategories: state.categories.map((c) => c.id)
    })),

  deselectAllCategories: () => set({ selectedCategories: [] }),

  // ── Step 2: Analyzing ──
  analyzeSelectedCategories: async () => {
    const { selectedCategories, tweaks } = get()
    set({ isAnalyzing: true, analyzedCategories: [], tweakStatus: {} })

    const allStatus: Record<string, boolean> = {}

    for (const catId of selectedCategories) {
      try {
        const catStatus = await window.api.optimizer.checkCategory(catId)
        Object.assign(allStatus, catStatus)
      } catch {
        // Mark all tweaks in this category as unchecked
        const catTweaks = tweaks.filter((t) => t.category === catId)
        for (const t of catTweaks) {
          allStatus[t.id] = false
        }
        const catName = get().categories.find((c) => c.id === catId)?.name || catId
        useToastStore.getState().addToast({
          type: 'warning',
          title: `Analysis failed for ${catName}`,
          message: 'Could not check current status'
        })
      }
      set((state) => ({
        analyzedCategories: [...state.analyzedCategories, catId],
        tweakStatus: { ...allStatus }
      }))
    }

    // Pre-select all tweaks that are NOT already applied
    const notApplied = Object.entries(allStatus)
      .filter(([, isApplied]) => !isApplied)
      .map(([id]) => id)

    set({
      isAnalyzing: false,
      selectedTweakIds: notApplied,
      tweakStatus: allStatus
    })

    // Also fetch backup
    await get().fetchBackup()
  },

  // ── Step 3: Tweak Selection & Application ──
  toggleTweakSelection: (tweakId) =>
    set((state) => {
      const isSelected = state.selectedTweakIds.includes(tweakId)
      return {
        selectedTweakIds: isSelected
          ? state.selectedTweakIds.filter((id) => id !== tweakId)
          : [...state.selectedTweakIds, tweakId]
      }
    }),

  selectAllTweaks: () =>
    set((state) => {
      const relevantTweaks = state.tweaks.filter((t) =>
        state.selectedCategories.includes(t.category)
      )
      return {
        selectedTweakIds: relevantTweaks
          .filter((t) => !state.tweakStatus[t.id])
          .map((t) => t.id)
      }
    }),

  deselectAllTweaks: () => set({ selectedTweakIds: [] }),

  applySelectedTweaks: async () => {
    const { selectedTweakIds } = get()
    if (selectedTweakIds.length === 0) return

    set({ isApplying: true, applyResults: {} })

    try {
      const results = await window.api.optimizer.applyTweaks(selectedTweakIds)
      set({ applyResults: results })

      // Refresh status for applied tweaks
      const newStatus = { ...get().tweakStatus }
      let successCount = 0
      for (const [id, result] of Object.entries(results)) {
        if (result.success) {
          newStatus[id] = true
          successCount++
        }
      }
      set({ tweakStatus: newStatus, selectedTweakIds: [] })

      if (successCount > 0) {
        useToastStore.getState().addToast({
          type: 'success',
          title: `${successCount} tweaks applied successfully`
        })
      }
      const failCount = Object.values(results).filter((r) => !r.success).length
      if (failCount > 0) {
        useToastStore.getState().addToast({
          type: 'error',
          title: `${failCount} tweaks failed to apply`
        })
      }
    } catch (err: any) {
      useToastStore.getState().addToast({
        type: 'error',
        title: 'Failed to apply tweaks',
        message: err?.message || 'An unexpected error occurred'
      })
    }

    set({ isApplying: false })
    await get().fetchBackup()
  },

  revertTweak: async (tweakId) => {
    set({ isReverting: true })
    try {
      const result = await window.api.optimizer.revertTweak(tweakId)
      if (result.success) {
        set((state) => ({
          tweakStatus: { ...state.tweakStatus, [tweakId]: false }
        }))
      }
    } catch {
      useToastStore.getState().addToast({
        type: 'error',
        title: 'Failed to revert tweak'
      })
    }
    set({ isReverting: false })
    await get().fetchBackup()
  },

  revertAll: async () => {
    set({ isReverting: true })
    try {
      await window.api.optimizer.revertAll()
      // Reset all status to false
      const newStatus: Record<string, boolean> = {}
      for (const key of Object.keys(get().tweakStatus)) {
        newStatus[key] = false
      }
      set({ tweakStatus: newStatus })
      useToastStore.getState().addToast({
        type: 'success',
        title: 'All tweaks reverted'
      })
    } catch {
      useToastStore.getState().addToast({
        type: 'error',
        title: 'Failed to revert all tweaks'
      })
    }
    set({ isReverting: false })
    await get().fetchBackup()
  }
}))

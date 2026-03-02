import { create } from 'zustand'
import { useToastStore } from './toastStore'

export interface ShredderFile {
  path: string
  name: string
  size: number
}

interface CleanerState {
  activeTab: 'junk' | 'large' | 'shredder' | 'duplicates'
  // Junk cleanup
  categories: CleanerJunkCategory[]
  isScanning: boolean
  scanProgress: { current: string; done: number; total: number }
  isCleaning: boolean
  cleanResult: CleanerCleanResult | null
  // Large files
  largeFiles: CleanerLargeFile[]
  isFindingLarge: boolean
  selectedDrive: string
  drives: string[]
  // File shredder
  shredderFiles: ShredderFile[]
  isShredding: boolean
  shredResult: CleanerShredResult | null

  // Actions
  setActiveTab: (tab: 'junk' | 'large' | 'shredder' | 'duplicates') => void
  scanAll: () => Promise<void>
  scanCategory: (categoryId: string) => Promise<void>
  toggleItem: (categoryId: string, itemPath: string) => void
  toggleCategory: (categoryId: string, selected: boolean) => void
  cleanSelected: () => Promise<void>
  clearCleanResult: () => void
  fetchDrives: () => Promise<void>
  findLargeFiles: () => Promise<void>
  setSelectedDrive: (drive: string) => void
  deleteLargeFile: (filePath: string) => Promise<void>
  addShredderFiles: (files: ShredderFile[]) => void
  removeShredderFile: (filePath: string) => void
  clearShredderFiles: () => void
  shredFiles: () => Promise<void>
  clearShredResult: () => void
}

export const useCleanerStore = create<CleanerState>((set, get) => ({
  activeTab: 'junk',
  categories: [],
  isScanning: false,
  scanProgress: { current: '', done: 0, total: 0 },
  isCleaning: false,
  cleanResult: null,
  largeFiles: [],
  isFindingLarge: false,
  selectedDrive: 'C',
  drives: ['C'],
  shredderFiles: [],
  isShredding: false,
  shredResult: null,

  setActiveTab: (tab) => set({ activeTab: tab }),

  scanAll: async () => {
    set({ isScanning: true, categories: [], scanProgress: { current: '', done: 0, total: 4 } })
    const categoryIds = ['browsers', 'system', 'apps', 'games']
    const results: CleanerJunkCategory[] = []

    for (let i = 0; i < categoryIds.length; i++) {
      const id = categoryIds[i]
      const names: Record<string, string> = {
        browsers: 'Browsers',
        system: 'System',
        apps: 'Applications',
        games: 'Games'
      }
      set({ scanProgress: { current: names[id], done: i, total: 4 } })
      try {
        const result = await window.api.cleaner.scanCategory(id)
        results.push(result)
        set({ categories: [...results] })
      } catch {
        results.push({ id, name: names[id], items: [], totalSize: 0 })
        set({ categories: [...results] })
      }
    }

    set({ isScanning: false, scanProgress: { current: '', done: 4, total: 4 } })
  },

  scanCategory: async (categoryId) => {
    set({ isScanning: true })
    try {
      const result = await window.api.cleaner.scanCategory(categoryId)
      set((state) => {
        const existing = state.categories.filter((c) => c.id !== categoryId)
        return { categories: [...existing, result] }
      })
    } catch {
      // silently ignore
    }
    set({ isScanning: false })
  },

  toggleItem: (categoryId, itemPath) => {
    set((state) => ({
      categories: state.categories.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              items: cat.items.map((item) =>
                item.path === itemPath ? { ...item, selected: !item.selected } : item
              )
            }
          : cat
      )
    }))
  },

  toggleCategory: (categoryId, selected) => {
    set((state) => ({
      categories: state.categories.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              items: cat.items.map((item) => ({ ...item, selected }))
            }
          : cat
      )
    }))
  },

  cleanSelected: async () => {
    const { categories } = get()
    const selectedPaths: string[] = []
    for (const cat of categories) {
      for (const item of cat.items) {
        if (item.selected) {
          selectedPaths.push(item.path)
        }
      }
    }
    if (selectedPaths.length === 0) return

    set({ isCleaning: true, cleanResult: null })
    try {
      const result = await window.api.cleaner.clean(selectedPaths)
      set({ cleanResult: result })
      const totalBytes = selectedPaths.length > 0 ? result.cleaned : 0
      const mbFreed = (totalBytes / (1024 * 1024)).toFixed(1)
      useToastStore.getState().addToast({
        type: 'success',
        title: `Cleaned ${selectedPaths.length} files (${mbFreed} MB freed)`
      })
      // Re-scan after cleaning
      const store = get()
      store.scanAll()
    } catch (err: any) {
      useToastStore.getState().addToast({
        type: 'error',
        title: 'Clean failed',
        message: err?.message || 'An unexpected error occurred'
      })
    }
    set({ isCleaning: false })
  },

  clearCleanResult: () => set({ cleanResult: null }),

  fetchDrives: async () => {
    try {
      const drives = await window.api.cleaner.getDrives()
      set({ drives, selectedDrive: drives[0] || 'C' })
    } catch {
      set({ drives: ['C'], selectedDrive: 'C' })
    }
  },

  findLargeFiles: async () => {
    const { selectedDrive } = get()
    set({ isFindingLarge: true, largeFiles: [] })
    try {
      const files = await window.api.cleaner.findLargeFiles(selectedDrive, 100)
      set({ largeFiles: files })
    } catch {
      set({ largeFiles: [] })
    }
    set({ isFindingLarge: false })
  },

  setSelectedDrive: (drive) => set({ selectedDrive: drive }),

  deleteLargeFile: async (filePath) => {
    try {
      await window.api.cleaner.deleteFile(filePath)
      set((state) => ({
        largeFiles: state.largeFiles.filter((f) => f.path !== filePath)
      }))
    } catch {
      // silently ignore
    }
  },

  addShredderFiles: (files) => {
    set((state) => {
      const existingPaths = new Set(state.shredderFiles.map((f) => f.path))
      const newFiles = files.filter((f) => !existingPaths.has(f.path))
      return { shredderFiles: [...state.shredderFiles, ...newFiles] }
    })
  },

  removeShredderFile: (filePath) => {
    set((state) => ({
      shredderFiles: state.shredderFiles.filter((f) => f.path !== filePath)
    }))
  },

  clearShredderFiles: () => set({ shredderFiles: [] }),

  shredFiles: async () => {
    const { shredderFiles } = get()
    if (shredderFiles.length === 0) return

    set({ isShredding: true, shredResult: null })
    try {
      const result = await window.api.cleaner.shredFiles(shredderFiles.map((f) => f.path))
      set({ shredResult: result, shredderFiles: [] })
      useToastStore.getState().addToast({
        type: 'success',
        title: `${result.success.length} files securely shredded`
      })
    } catch (err: any) {
      useToastStore.getState().addToast({
        type: 'error',
        title: 'Shredding failed',
        message: err?.message || 'An unexpected error occurred'
      })
    }
    set({ isShredding: false })
  },

  clearShredResult: () => set({ shredResult: null })
}))

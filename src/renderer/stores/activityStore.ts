import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ActivityEntry {
  id: string
  action: string
  detail: string
  timestamp: number
}

interface ActivityState {
  entries: ActivityEntry[]
  addEntry: (action: string, detail: string) => void
  clearAll: () => void
}

export const useActivityStore = create<ActivityState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (action, detail) =>
        set((state) => ({
          entries: [
            { id: crypto.randomUUID(), action, detail, timestamp: Date.now() },
            ...state.entries
          ].slice(0, 50)
        })),
      clearAll: () => set({ entries: [] })
    }),
    { name: 'cleanonx-activity' }
  )
)

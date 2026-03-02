import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

export interface NotificationEntry {
  id: string
  type: ToastType
  title: string
  message?: string
  timestamp: number
  read: boolean
}

interface ToastState {
  toasts: Toast[]
  notifications: NotificationEntry[]
  unreadCount: number
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  markAllRead: () => void
  clearNotifications: () => void
}

const MAX_NOTIFICATIONS = 100

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  notifications: [],
  unreadCount: 0,
  addToast: (toast) =>
    set((state) => {
      const id = crypto.randomUUID()
      const notification: NotificationEntry = {
        id,
        type: toast.type,
        title: toast.title,
        message: toast.message,
        timestamp: Date.now(),
        read: false
      }
      const notifications = [notification, ...state.notifications].slice(0, MAX_NOTIFICATIONS)
      return {
        toasts: [...state.toasts, { ...toast, id }],
        notifications,
        unreadCount: state.unreadCount + 1
      }
    }),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    })),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0
    })),
  clearNotifications: () =>
    set({ notifications: [], unreadCount: 0 })
}))

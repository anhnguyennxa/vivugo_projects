import { create } from 'zustand'

import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/notifications'
import type { AppNotification } from '@/types/notification'

interface NotificationsState {
  items: AppNotification[]
  unreadCount: number
  hasLoaded: boolean
  fetchInitial: () => Promise<void>
  receiveNew: (notification: AppNotification) => void
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  reset: () => void
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  items: [],
  unreadCount: 0,
  hasLoaded: false,

  fetchInitial: async () => {
    const [list, count] = await Promise.all([getNotifications(1, 20), getUnreadNotificationCount()])
    set({ items: list.items, unreadCount: count, hasLoaded: true })
  },

  receiveNew: (notification) => {
    set((state) => ({
      items: [notification, ...state.items].slice(0, 50),
      unreadCount: state.unreadCount + 1,
    }))
  },

  markAsRead: async (id) => {
    const target = get().items.find((n) => n.id === id)
    if (!target || target.isRead) return

    set((state) => ({
      items: state.items.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }))
    await markNotificationRead(id)
  },

  markAllAsRead: async () => {
    set((state) => ({
      items: state.items.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }))
    await markAllNotificationsRead()
  },

  reset: () => set({ items: [], unreadCount: 0, hasLoaded: false }),
}))

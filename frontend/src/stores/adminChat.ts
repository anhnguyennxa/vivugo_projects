import { create } from 'zustand'

import { getAdminChatUnreadCount } from '@/services/chat'

interface AdminChatState {
  unreadCount: number
  refresh: () => Promise<void>
  reset: () => void
}

export const useAdminChatStore = create<AdminChatState>((set) => ({
  unreadCount: 0,

  refresh: async () => {
    const count = await getAdminChatUnreadCount()
    set({ unreadCount: count })
  },

  reset: () => set({ unreadCount: 0 }),
}))

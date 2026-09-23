import { create } from 'zustand'

import { getMyChatMessages, getMyChatUnreadCount, sendMyChatMessage } from '@/services/chat'
import type { ChatConversation, ChatMessage, ChatMessageEvent } from '@/types/chat'

interface ChatState {
  open: boolean
  conversation: ChatConversation | null
  messages: ChatMessage[]
  unreadCount: number
  loading: boolean
  fetchUnreadCount: () => Promise<void>
  openPanel: () => Promise<void>
  closePanel: () => void
  send: (text: string) => Promise<void>
  receiveMessage: (event: ChatMessageEvent) => void
  reset: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  open: false,
  conversation: null,
  messages: [],
  unreadCount: 0,
  loading: false,

  fetchUnreadCount: async () => {
    const count = await getMyChatUnreadCount()
    set({ unreadCount: count })
  },

  openPanel: async () => {
    set({ open: true, loading: true })
    try {
      const { conversation, messages } = await getMyChatMessages()
      set({ conversation, messages, unreadCount: 0, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  closePanel: () => set({ open: false }),

  send: async (text) => {
    const trimmed = text.trim()
    if (!trimmed) return
    // Không tự thêm vào messages ở đây — server bắn lại sự kiện chat:message
    // cho chính người gửi, receiveMessage() sẽ thêm vào để tránh hiện đúp.
    await sendMyChatMessage(trimmed)
  },

  receiveMessage: (event) => {
    const { conversation, open } = get()
    if (!conversation || event.conversationId !== conversation.id) return

    set((state) => ({
      messages: [...state.messages, event.message],
      unreadCount: open ? 0 : state.unreadCount + 1,
    }))
  },

  reset: () => set({ open: false, conversation: null, messages: [], unreadCount: 0, loading: false }),
}))

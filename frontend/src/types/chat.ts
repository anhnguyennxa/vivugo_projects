export interface ChatUser {
  id: string
  fullName: string
  email: string
  avatarUrl: string | null
}

export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  message: string
  isRead: boolean
  createdAt: string
}

export interface ChatConversation {
  id: string
  userId: string
  adminId: string | null
  status: 'OPEN' | 'CLOSED'
  createdAt: string
  updatedAt: string
}

export interface ChatConversationSummary extends ChatConversation {
  user: ChatUser
  lastMessage: ChatMessage | null
  unreadCount: number
}

export interface ChatMessageEvent {
  conversationId: string
  message: ChatMessage
}

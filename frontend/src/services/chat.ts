import { apiClient } from '@/api/client'
import type { ApiSuccess } from '@/types/api'
import type { ChatConversation, ChatConversationSummary, ChatMessage, ChatUser } from '@/types/chat'
import type { Paginated } from '@/types/tour'

export async function getMyChatMessages(): Promise<{
  conversation: ChatConversation
  messages: ChatMessage[]
}> {
  const { data } =
    await apiClient.get<ApiSuccess<{ conversation: ChatConversation; messages: ChatMessage[] }>>(
      '/chat/messages',
    )
  return data.data
}

export async function sendMyChatMessage(message: string): Promise<ChatMessage> {
  const { data } = await apiClient.post<ApiSuccess<ChatMessage>>('/chat/messages', { message })
  return data.data
}

export async function getMyChatUnreadCount(): Promise<number> {
  const { data } = await apiClient.get<ApiSuccess<{ count: number }>>('/chat/unread-count')
  return data.data.count
}

export interface AdminChatConversationsQuery {
  page?: number
  limit?: number
  status?: 'OPEN' | 'CLOSED'
}

export async function getAdminChatConversations(
  params: AdminChatConversationsQuery,
): Promise<Paginated<ChatConversationSummary>> {
  const { data } = await apiClient.get<ApiSuccess<ChatConversationSummary[]>>('/chat/admin/conversations', {
    params,
  })
  return {
    items: data.data,
    page: data.meta?.page ?? 1,
    limit: data.meta?.limit ?? 20,
    total: data.meta?.total ?? data.data.length,
  }
}

export async function getAdminChatConversationMessages(id: string): Promise<{
  conversation: ChatConversation & { user: ChatUser }
  messages: ChatMessage[]
}> {
  const { data } = await apiClient.get<
    ApiSuccess<{ conversation: ChatConversation & { user: ChatUser }; messages: ChatMessage[] }>
  >(`/chat/admin/conversations/${id}/messages`)
  return data.data
}

export async function sendAdminChatMessage(id: string, message: string): Promise<ChatMessage> {
  const { data } = await apiClient.post<ApiSuccess<ChatMessage>>(
    `/chat/admin/conversations/${id}/messages`,
    { message },
  )
  return data.data
}

export async function closeAdminChatConversation(id: string): Promise<void> {
  await apiClient.patch(`/chat/admin/conversations/${id}/close`)
}

export async function getAdminChatUnreadCount(): Promise<number> {
  const { data } = await apiClient.get<ApiSuccess<{ count: number }>>('/chat/admin/unread-count')
  return data.data.count
}

import { apiClient } from '@/api/client'
import type { ApiSuccess } from '@/types/api'
import type { AppNotification } from '@/types/notification'
import type { Paginated } from '@/types/tour'

export async function getNotifications(page = 1, limit = 20): Promise<Paginated<AppNotification>> {
  const { data } = await apiClient.get<ApiSuccess<AppNotification[]>>('/notifications', {
    params: { page, limit },
  })
  return {
    items: data.data,
    page: data.meta?.page ?? 1,
    limit: data.meta?.limit ?? limit,
    total: data.meta?.total ?? data.data.length,
  }
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { data } = await apiClient.get<ApiSuccess<{ count: number }>>('/notifications/unread-count')
  return data.data.count
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.patch(`/notifications/${id}/read`)
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.patch('/notifications/read-all')
}

export interface BroadcastNotificationPayload {
  toAll?: boolean
  userIds?: string[]
  title: string
  message: string
}

export async function broadcastNotification(payload: BroadcastNotificationPayload): Promise<{ count: number }> {
  const { data } = await apiClient.post<ApiSuccess<{ count: number }>>('/notifications/broadcast', payload)
  return data.data
}

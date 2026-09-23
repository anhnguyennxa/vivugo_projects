export type NotificationType = 'BOOKING_UPDATE' | 'PAYMENT' | 'CHAT' | 'SYSTEM'

export interface AppNotification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  data: { bookingId?: string; bookingCode?: string; conversationId?: string } | null
  isRead: boolean
  createdAt: string
}

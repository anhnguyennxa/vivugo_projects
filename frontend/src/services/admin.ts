import { apiClient } from '@/api/client'
import type { AdminBooking, AdminStats } from '@/types/admin'
import type { ApiSuccess } from '@/types/api'
import type { BookingPaymentStatus, BookingStatus } from '@/types/booking'
import type { Paginated } from '@/types/tour'

export interface AdminBookingsQuery {
  page?: number
  limit?: number
  status?: BookingStatus
  paymentStatus?: BookingPaymentStatus
  search?: string
}

export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await apiClient.get<ApiSuccess<AdminStats>>('/admin/stats')
  return data.data
}

export async function getAdminBookings(params: AdminBookingsQuery): Promise<Paginated<AdminBooking>> {
  const { data } = await apiClient.get<ApiSuccess<AdminBooking[]>>('/admin/bookings', { params })
  return {
    items: data.data,
    page: data.meta?.page ?? 1,
    limit: data.meta?.limit ?? 15,
    total: data.meta?.total ?? data.data.length,
  }
}

export async function updateBookingStatus(
  id: string,
  status: Exclude<BookingStatus, 'PENDING'>,
): Promise<void> {
  await apiClient.patch(`/bookings/${id}/status`, { status })
}

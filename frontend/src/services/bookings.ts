import { apiClient } from '@/api/client'
import type { Booking, BookingReceipt } from '@/types/booking'
import type { ApiSuccess } from '@/types/api'

export interface CheckoutPayload {
  cartItemId: string
  contactName: string
  contactPhone: string
  contactEmail: string
  note?: string
}

export interface CheckoutResult {
  booking: Booking
  paymentUrl: string | null
}

export async function checkout(payload: CheckoutPayload): Promise<CheckoutResult> {
  const { data } = await apiClient.post<ApiSuccess<CheckoutResult>>(
    '/bookings/checkout',
    payload,
  )
  return data.data
}

export async function getBookingByCode(code: string): Promise<Booking> {
  const { data } = await apiClient.get<ApiSuccess<Booking>>(`/bookings/${code}`)
  return data.data
}

// Khong doi dang nhap - dung cho trang ket qua ngay sau thanh toan (xem
// GET /bookings/:code/receipt o backend).
export async function getBookingReceiptByCode(code: string): Promise<BookingReceipt> {
  const { data } = await apiClient.get<ApiSuccess<BookingReceipt>>(`/bookings/${code}/receipt`)
  return data.data
}

export async function getMyBookings(): Promise<Booking[]> {
  const { data } = await apiClient.get<ApiSuccess<Booking[]>>('/bookings')
  return data.data
}

export async function cancelBooking(id: string): Promise<void> {
  await apiClient.delete(`/bookings/${id}`)
}

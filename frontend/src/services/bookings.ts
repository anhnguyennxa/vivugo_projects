import { apiClient } from '@/api/client'
import type { Booking } from '@/types/booking'
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

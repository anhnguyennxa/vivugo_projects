import { apiClient } from '@/api/client'
import type {
  AdminBooking,
  AdminDeparture,
  AdminStats,
  AdminTour,
  AdminReview,
  AdminTourDetail,
  AdminUser,
  ReviewStatus,
  TourStatus,
} from '@/types/admin'
import type { ApiSuccess } from '@/types/api'
import type { BookingPaymentStatus, BookingStatus } from '@/types/booking'
import type { DepartureCity, ItineraryDay, Paginated, Region } from '@/types/tour'

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

export interface AdminToursQuery {
  page?: number
  limit?: number
  status?: TourStatus
  categoryId?: string
  search?: string
}

export async function getAdminTours(params: AdminToursQuery): Promise<Paginated<AdminTour>> {
  const { data } = await apiClient.get<ApiSuccess<AdminTour[]>>('/admin/tours', { params })
  return {
    items: data.data,
    page: data.meta?.page ?? 1,
    limit: data.meta?.limit ?? 15,
    total: data.meta?.total ?? data.data.length,
  }
}

export async function getAdminTour(id: string): Promise<AdminTourDetail> {
  const { data } = await apiClient.get<ApiSuccess<AdminTourDetail>>(`/admin/tours/${id}`)
  return data.data
}

export interface TourInput {
  title: string
  slug: string
  categoryId: string
  summary?: string
  description: string
  itinerary: ItineraryDay[]
  location: string
  region: Region
  departureCity: DepartureCity
  durationDays: number
  durationNights: number
  basePrice: number
  discountPrice?: number | null
  minGuests: number
  maxGuests: number
  thumbnailUrl: string
  status: TourStatus
  isFeatured: boolean
}

export async function createTour(input: TourInput): Promise<{ id: string }> {
  const { data } = await apiClient.post<ApiSuccess<{ id: string }>>('/tours', input)
  return data.data
}

export async function updateTour(id: string, input: Partial<TourInput>): Promise<void> {
  await apiClient.patch(`/tours/${id}`, input)
}

export async function deleteTour(id: string): Promise<void> {
  await apiClient.delete(`/tours/${id}`)
}

export async function deleteTourPermanently(id: string): Promise<void> {
  await apiClient.delete(`/tours/${id}/permanent`)
}

export async function uploadImage(file: File): Promise<string> {
  const body = new FormData()
  body.append('file', file)
  const { data } = await apiClient.post<ApiSuccess<{ url: string }>>('/uploads/image', body)
  return data.data.url
}

export async function addTourImages(id: string, urls: string[]): Promise<void> {
  await apiClient.post(`/tours/${id}/images`, { urls })
}

export async function removeTourImage(id: string, imageId: string): Promise<void> {
  await apiClient.delete(`/tours/${id}/images/${imageId}`)
}

export interface DepartureInput {
  departureDate: string
  returnDate: string
  totalSlots: number
  priceOverride?: number | null
  status?: AdminDeparture['status']
}

export async function createDeparture(tourId: string, input: DepartureInput): Promise<void> {
  await apiClient.post(`/tours/${tourId}/departures`, input)
}

export async function updateDeparture(id: string, input: Partial<DepartureInput>): Promise<void> {
  await apiClient.patch(`/departures/${id}`, input)
}

export async function deleteDeparture(id: string): Promise<void> {
  await apiClient.delete(`/departures/${id}`)
}

export interface CategoryInput {
  name: string
  slug: string
  description?: string
  imageUrl?: string
}

export async function createCategory(input: CategoryInput): Promise<void> {
  await apiClient.post('/categories', input)
}

export async function updateCategory(id: string, input: Partial<CategoryInput>): Promise<void> {
  await apiClient.patch(`/categories/${id}`, input)
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/categories/${id}`)
}

export interface AdminReviewsQuery {
  page?: number
  limit?: number
  status?: ReviewStatus
  search?: string
}

export async function getAdminReviews(params: AdminReviewsQuery): Promise<Paginated<AdminReview>> {
  const { data } = await apiClient.get<ApiSuccess<AdminReview[]>>('/admin/reviews', { params })
  return {
    items: data.data,
    page: data.meta?.page ?? 1,
    limit: data.meta?.limit ?? 15,
    total: data.meta?.total ?? data.data.length,
  }
}

export async function moderateReview(id: string, status: 'APPROVED' | 'HIDDEN'): Promise<void> {
  await apiClient.patch(`/reviews/${id}/moderate`, { status })
}

export interface AdminUsersQuery {
  page?: number
  limit?: number
  role?: AdminUser['role']
  isActive?: boolean
  search?: string
}

export async function getAdminUsers(params: AdminUsersQuery): Promise<Paginated<AdminUser>> {
  const { data } = await apiClient.get<ApiSuccess<AdminUser[]>>('/admin/users', { params })
  return {
    items: data.data,
    page: data.meta?.page ?? 1,
    limit: data.meta?.limit ?? 15,
    total: data.meta?.total ?? data.data.length,
  }
}

export async function updateAdminUser(
  id: string,
  input: { isActive?: boolean; role?: AdminUser['role'] },
): Promise<void> {
  await apiClient.patch(`/admin/users/${id}`, input)
}

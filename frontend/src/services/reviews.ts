import { apiClient } from '@/api/client'
import type { ApiSuccess } from '@/types/api'
import type { Paginated, Review } from '@/types/tour'

export async function getTourReviews(
  tourId: string,
  params: { page?: number; limit?: number } = {},
): Promise<Paginated<Review>> {
  const { data } = await apiClient.get<ApiSuccess<Review[]>>(`/tours/${tourId}/reviews`, {
    params,
  })
  return {
    items: data.data,
    page: data.meta?.page ?? 1,
    limit: data.meta?.limit ?? 10,
    total: data.meta?.total ?? data.data.length,
  }
}

export async function createReview(payload: {
  bookingId: string
  rating: number
  comment: string
}): Promise<Review> {
  const { data } = await apiClient.post<ApiSuccess<Review>>('/reviews', payload)
  return data.data
}

import { apiClient } from '@/api/client'
import type { ApiSuccess } from '@/types/api'
import type { Paginated, Tour, TourDetail } from '@/types/tour'

export interface ToursQuery {
  page?: number
  limit?: number
  search?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  sort?: 'createdAt' | 'basePrice' | 'avgRating'
  order?: 'asc' | 'desc'
}

export async function getFeaturedTours(limit = 5): Promise<Tour[]> {
  const { data } = await apiClient.get<ApiSuccess<Tour[]>>('/tours', {
    params: { featured: true, limit },
  })
  return data.data
}

export async function getTours(params: ToursQuery): Promise<Paginated<Tour>> {
  const { data } = await apiClient.get<ApiSuccess<Tour[]>>('/tours', { params })
  return {
    items: data.data,
    page: data.meta?.page ?? 1,
    limit: data.meta?.limit ?? 20,
    total: data.meta?.total ?? data.data.length,
  }
}

export async function getTourBySlug(slug: string): Promise<TourDetail> {
  const { data } = await apiClient.get<ApiSuccess<TourDetail>>(`/tours/${slug}`)
  return data.data
}

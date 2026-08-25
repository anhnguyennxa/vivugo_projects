import { apiClient } from '@/api/client'
import type { ApiSuccess } from '@/types/api'
import type { Paginated, Tour } from '@/types/tour'

export async function getFeaturedTours(limit = 5): Promise<Tour[]> {
  const { data } = await apiClient.get<ApiSuccess<Tour[]>>('/tours', {
    params: { featured: true, limit },
  })
  return data.data
}

export async function getTours(params: {
  page?: number
  limit?: number
  search?: string
  categorySlug?: string
  sort?: string
  order?: 'asc' | 'desc'
}): Promise<Paginated<Tour>> {
  const { data } = await apiClient.get<ApiSuccess<Tour[]>>('/tours', { params })
  return {
    items: data.data,
    page: data.meta?.page ?? 1,
    limit: data.meta?.limit ?? 20,
    total: data.meta?.total ?? data.data.length,
  }
}

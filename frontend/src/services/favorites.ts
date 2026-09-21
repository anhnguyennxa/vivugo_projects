import { apiClient } from '@/api/client'
import type { ApiSuccess } from '@/types/api'
import type { Category, Tour } from '@/types/tour'

export interface FavoriteItem {
  id: string
  tourId: string
  createdAt: string
  tour: Tour & { category: Category }
}

export async function getFavorites(): Promise<FavoriteItem[]> {
  const { data } = await apiClient.get<ApiSuccess<FavoriteItem[]>>('/favorites')
  return data.data
}

export async function addFavorite(tourId: string): Promise<FavoriteItem> {
  const { data } = await apiClient.post<ApiSuccess<FavoriteItem>>(`/favorites/${tourId}`)
  return data.data
}

export async function removeFavorite(tourId: string): Promise<void> {
  await apiClient.delete(`/favorites/${tourId}`)
}

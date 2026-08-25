import { apiClient } from '@/api/client'
import type { ApiSuccess } from '@/types/api'
import type { Category } from '@/types/tour'

export async function getCategories(): Promise<Category[]> {
  const { data } = await apiClient.get<ApiSuccess<Category[]>>('/categories')
  return data.data
}

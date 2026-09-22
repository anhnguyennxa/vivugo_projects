import { apiClient } from '@/api/client'
import type {
  CollectionAdminDetail,
  CollectionAdminSummary,
  CollectionDetail,
  CollectionStatus,
  CollectionSummary,
} from '@/types/collection'
import type { ApiSuccess } from '@/types/api'
import type { Paginated } from '@/types/tour'

export interface CollectionInput {
  title: string
  slug: string
  description?: string
  coverImageUrl: string
  status?: CollectionStatus
  // ISO date string; bỏ trống = vô thời hạn
  startAt?: string | null
  endAt?: string | null
  // Danh sách id tour theo đúng thứ tự hiển thị
  tourIds?: string[]
}

export interface AdminCollectionsQuery {
  page?: number
  limit?: number
  status?: CollectionStatus
  search?: string
}

export async function getCollections(limit?: number): Promise<CollectionSummary[]> {
  const { data } = await apiClient.get<ApiSuccess<CollectionSummary[]>>('/collections', {
    params: { limit },
  })
  return data.data
}

export async function getCollectionBySlug(slug: string): Promise<CollectionDetail> {
  const { data } = await apiClient.get<ApiSuccess<CollectionDetail>>(`/collections/${slug}`)
  return data.data
}

export async function getAdminCollections(
  params: AdminCollectionsQuery,
): Promise<Paginated<CollectionAdminSummary>> {
  const { data } = await apiClient.get<ApiSuccess<CollectionAdminSummary[]>>('/collections/admin', {
    params,
  })
  return {
    items: data.data,
    page: data.meta?.page ?? 1,
    limit: data.meta?.limit ?? 15,
    total: data.meta?.total ?? data.data.length,
  }
}

export async function getAdminCollection(id: string): Promise<CollectionAdminDetail> {
  const { data } = await apiClient.get<ApiSuccess<CollectionAdminDetail>>(`/collections/admin/${id}`)
  return data.data
}

export async function createCollection(input: CollectionInput): Promise<{ id: string }> {
  const { data } = await apiClient.post<ApiSuccess<{ id: string }>>('/collections', input)
  return data.data
}

export async function updateCollection(id: string, input: Partial<CollectionInput>): Promise<void> {
  await apiClient.patch(`/collections/${id}`, input)
}

export async function deleteCollection(id: string): Promise<void> {
  await apiClient.delete(`/collections/${id}`)
}

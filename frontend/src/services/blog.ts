import { apiClient } from '@/api/client'
import type { ApiSuccess } from '@/types/api'
import type { BlogPostAdminDetail, BlogPostDetail, BlogPostStatus, BlogPostSummary } from '@/types/blog'
import type { Paginated, Region } from '@/types/tour'

export interface BlogQuery {
  page?: number
  limit?: number
  search?: string
  region?: Region
}

export interface AdminBlogQuery extends BlogQuery {
  status?: BlogPostStatus
}

export interface BlogPostInput {
  title: string
  slug: string
  excerpt: string
  content: string
  coverImageUrl: string
  region?: Region
  status?: BlogPostStatus
  relatedTourIds?: string[]
}

function toPaginated(data: ApiSuccess<BlogPostSummary[]>): Paginated<BlogPostSummary> {
  return {
    items: data.data,
    page: data.meta?.page ?? 1,
    limit: data.meta?.limit ?? 12,
    total: data.meta?.total ?? data.data.length,
  }
}

export async function getBlogPosts(params: BlogQuery): Promise<Paginated<BlogPostSummary>> {
  const { data } = await apiClient.get<ApiSuccess<BlogPostSummary[]>>('/blog', { params })
  return toPaginated(data)
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPostDetail> {
  const { data } = await apiClient.get<ApiSuccess<BlogPostDetail>>(`/blog/${slug}`)
  return data.data
}

export async function getAdminBlogPosts(params: AdminBlogQuery): Promise<Paginated<BlogPostSummary>> {
  const { data } = await apiClient.get<ApiSuccess<BlogPostSummary[]>>('/blog/admin', { params })
  return toPaginated(data)
}

export async function getAdminBlogPost(id: string): Promise<BlogPostAdminDetail> {
  const { data } = await apiClient.get<ApiSuccess<BlogPostAdminDetail>>(`/blog/admin/${id}`)
  return data.data
}

export async function createBlogPost(input: BlogPostInput): Promise<BlogPostSummary> {
  const { data } = await apiClient.post<ApiSuccess<BlogPostSummary>>('/blog', input)
  return data.data
}

export async function updateBlogPost(
  id: string,
  input: Partial<BlogPostInput>,
): Promise<BlogPostSummary> {
  const { data } = await apiClient.patch<ApiSuccess<BlogPostSummary>>(`/blog/${id}`, input)
  return data.data
}

export async function deleteBlogPost(id: string): Promise<void> {
  await apiClient.delete(`/blog/${id}`)
}

import type { Region, Tour } from './tour'

export type BlogPostStatus = 'DRAFT' | 'PUBLISHED'

export interface BlogPostAuthor {
  fullName: string
  avatarUrl: string | null
}

export interface BlogPostSummary {
  id: string
  title: string
  slug: string
  excerpt: string
  coverImageUrl: string
  region: Region | null
  status: BlogPostStatus
  publishedAt: string | null
  viewCount: number
  createdAt: string
  author: BlogPostAuthor
}

export interface BlogPostDetail extends BlogPostSummary {
  content: string
  relatedTours: Tour[]
}

export interface BlogPostAdminDetail extends BlogPostSummary {
  content: string
  relatedTourIds: string[]
}

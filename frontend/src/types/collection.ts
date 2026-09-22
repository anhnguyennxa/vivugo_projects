import type { Tour } from './tour'

export type CollectionStatus = 'DRAFT' | 'PUBLISHED'

export interface CollectionSummary {
  id: string
  title: string
  slug: string
  description: string | null
  coverImageUrl: string
  startAt: string | null
  endAt: string | null
  tourCount: number
}

export interface CollectionDetail {
  id: string
  title: string
  slug: string
  description: string | null
  coverImageUrl: string
  startAt: string | null
  endAt: string | null
  tours: Tour[]
}

export interface CollectionAdminSummary extends CollectionSummary {
  status: CollectionStatus
  // Đang thật sự hiển thị với khách (đã đăng và trong hạn), khác với status.
  isActive: boolean
}

export interface CollectionAdminDetail {
  id: string
  title: string
  slug: string
  description: string | null
  coverImageUrl: string
  status: CollectionStatus
  startAt: string | null
  endAt: string | null
  tours: { id: string; title: string; thumbnailUrl: string }[]
}

import type { TourStatus } from '@/types/admin'

export const TOUR_STATUS_LABELS: Record<TourStatus, string> = {
  DRAFT: 'Nháp',
  PUBLISHED: 'Đang bán',
  ARCHIVED: 'Đã lưu trữ',
}

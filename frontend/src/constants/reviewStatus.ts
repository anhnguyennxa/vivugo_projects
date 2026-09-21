import type { ReviewStatus } from '@/types/admin'

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  HIDDEN: 'Đã ẩn',
}

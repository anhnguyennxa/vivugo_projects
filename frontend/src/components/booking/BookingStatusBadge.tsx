import { Badge } from '@/components/ui/badge'
import type { BookingStatus } from '@/types/booking'

const CONFIG: Record<BookingStatus, { label: string; variant: 'accent' | 'success' | 'danger' | 'default' }> = {
  PENDING: { label: 'Chờ thanh toán / xác nhận', variant: 'accent' },
  CONFIRMED: { label: 'Đã xác nhận', variant: 'success' },
  COMPLETED: { label: 'Đã hoàn thành', variant: 'default' },
  CANCELLED: { label: 'Đã huỷ', variant: 'danger' },
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { label, variant } = CONFIG[status]
  return <Badge variant={variant}>{label}</Badge>
}

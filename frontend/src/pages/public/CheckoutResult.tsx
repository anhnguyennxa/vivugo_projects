import { CheckCircle2, Clock, RefreshCw, XCircle } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ROUTES } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { getBookingByCode } from '@/services/bookings'

function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount) + '₫'
}

const STATUS_CONTENT = {
  CONFIRMED: {
    icon: CheckCircle2,
    color: 'text-success',
    bg: 'bg-success-soft',
    title: 'Thanh toán thành công',
  },
  PENDING: {
    icon: Clock,
    color: 'text-accent',
    bg: 'bg-accent-soft',
    title: 'Đang chờ xác nhận thanh toán',
  },
  CANCELLED: {
    icon: XCircle,
    color: 'text-danger',
    bg: 'bg-danger-soft',
    title: 'Thanh toán không thành công',
  },
  COMPLETED: {
    icon: CheckCircle2,
    color: 'text-success',
    bg: 'bg-success-soft',
    title: 'Tour đã hoàn thành',
  },
} as const

export function CheckoutResult() {
  const [searchParams] = useSearchParams()
  const bookingCode = searchParams.get('vnp_TxnRef') ?? searchParams.get('bookingCode')

  const { status, data: booking, error } = useAsync(
    () => getBookingByCode(bookingCode!),
    [bookingCode],
  )

  if (!bookingCode) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <EmptyState title="Không tìm thấy thông tin đơn hàng" />
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <ErrorState description={error} onRetry={() => window.location.reload()} />
      </div>
    )
  }

  const content = STATUS_CONTENT[booking.status]
  const Icon = content.icon

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <span className={`mx-auto flex size-14 items-center justify-center rounded-full ${content.bg}`}>
          <Icon className={`size-7 ${content.color}`} />
        </span>
        <h1 className="mt-4 font-display text-xl font-bold text-secondary">{content.title}</h1>
        <p className="mt-1 font-mono text-sm text-text-muted">Mã đơn: {booking.bookingCode}</p>

        <div className="mt-6 space-y-2 rounded-xl bg-surface-alt p-4 text-left text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Tour</span>
            <span className="font-medium text-secondary">{booking.tour.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Tổng tiền</span>
            <span className="font-mono font-semibold text-secondary">
              {formatVnd(booking.totalPrice)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Trạng thái thanh toán</span>
            <span className="font-medium text-secondary">{booking.paymentStatus}</span>
          </div>
        </div>

        {booking.status === 'PENDING' && (
          <p className="mt-4 text-xs text-text-faint">
            Hệ thống đang xác nhận thanh toán, có thể mất vài giây. Nhấn tải lại nếu trạng thái chưa cập nhật.
          </p>
        )}

        <div className="mt-6 flex justify-center gap-3">
          {booking.status === 'PENDING' && (
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw /> Tải lại
            </Button>
          )}
          <Link to={ROUTES.tours}>
            <Button>Tiếp tục khám phá</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

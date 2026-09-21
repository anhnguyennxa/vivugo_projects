import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ROUTES } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { cancelBooking, getBookingByCode } from '@/services/bookings'
import { getApiErrorMessage } from '@/utils/errors'
import { formatDate, formatVnd } from '@/utils/format'

const PAYMENT_LABELS = {
  UNPAID: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
  REFUNDED: 'Đã hoàn tiền',
} as const

export function AccountBookingDetail() {
  const { code } = useParams<{ code: string }>()
  const [reloadKey, setReloadKey] = useState(0)
  const { status, data: booking, error } = useAsync(() => getBookingByCode(code!), [code, reloadKey])
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  async function handleCancel() {
    if (!booking || !window.confirm('Bạn chắc chắn muốn huỷ đơn này? Hành động không thể hoàn tác.')) return
    setCancelError(null)
    setCancelling(true)
    try {
      await cancelBooking(booking.id)
      setReloadKey((k) => k + 1)
    } catch (err) {
      setCancelError(getApiErrorMessage(err) ?? 'Không thể huỷ đơn')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div>
      <Link
        to={ROUTES.accountBookings}
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted hover:text-secondary"
      >
        <ArrowLeft className="size-4" /> Quay lại danh sách đơn
      </Link>

      {status === 'loading' && <Skeleton className="h-72 w-full rounded-2xl" />}
      {status === 'error' && <ErrorState title="Không tìm thấy đơn hàng" description={error} />}

      {status === 'success' && (
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs text-text-muted">Mã đơn</p>
              <p className="font-mono text-lg font-bold text-secondary">{booking.bookingCode}</p>
            </div>
            <BookingStatusBadge status={booking.status} />
          </div>

          <Link
            to={ROUTES.tourDetail(booking.tour.slug)}
            className="block font-display text-base font-bold text-primary hover:underline"
          >
            {booking.tour.title}
          </Link>

          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-text-muted">Ngày khởi hành</dt>
              <dd className="font-medium text-secondary">
                {formatDate(booking.departure.departureDate)} – {formatDate(booking.departure.returnDate)}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Số khách</dt>
              <dd className="font-medium text-secondary">
                {booking.numAdults} người lớn{booking.numChildren > 0 && `, ${booking.numChildren} trẻ em`}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Tổng tiền</dt>
              <dd className="font-mono font-bold text-secondary">{formatVnd(booking.totalPrice)}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Thanh toán</dt>
              <dd className="font-medium text-secondary">{PAYMENT_LABELS[booking.paymentStatus]}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Người liên hệ</dt>
              <dd className="font-medium text-secondary">
                {booking.contactName} · {booking.contactPhone}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Email</dt>
              <dd className="font-medium text-secondary">{booking.contactEmail}</dd>
            </div>
            {booking.note && (
              <div className="sm:col-span-2">
                <dt className="text-text-muted">Ghi chú</dt>
                <dd className="font-medium text-secondary">{booking.note}</dd>
              </div>
            )}
          </dl>

          {cancelError && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{cancelError}</p>}

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            {booking.status === 'PENDING' && (
              <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? 'Đang huỷ…' : 'Huỷ đơn'}
              </Button>
            )}
            {booking.status === 'COMPLETED' && !booking.review && (
              <Link to={ROUTES.tourDetail(booking.tour.slug)}>
                <Button variant="outline">Viết đánh giá</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

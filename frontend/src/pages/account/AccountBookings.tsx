import { Calendar, Ticket } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ROUTES } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import { getMyBookings } from '@/services/bookings'
import type { BookingStatus } from '@/types/booking'
import { formatDate, formatVnd } from '@/utils/format'

const FILTERS: { value: BookingStatus | ''; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'COMPLETED', label: 'Đã hoàn thành' },
  { value: 'CANCELLED', label: 'Đã huỷ' },
]

export function AccountBookings() {
  const { status, data, error } = useAsync(() => getMyBookings(), [])
  const [filter, setFilter] = useState<BookingStatus | ''>('')

  const visible = useMemo(
    () => (data ?? []).filter((b) => !filter || b.status === filter),
    [data, filter],
  )

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
              filter === f.value
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-surface text-text-muted hover:bg-surface-alt',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {status === 'loading' && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      )}
      {status === 'error' && <ErrorState description={error} onRetry={() => window.location.reload()} />}

      {status === 'success' && visible.length === 0 && (
        <div>
          <EmptyState
            icon={Ticket}
            title={filter ? 'Không có đơn nào ở trạng thái này' : 'Bạn chưa có đơn đặt tour nào'}
            description="Khám phá các tour và đặt chỗ ngay hôm nay."
          />
          <div className="mt-4 text-center">
            <Link to={ROUTES.tours}>
              <Button variant="outline">Khám phá tour</Button>
            </Link>
          </div>
        </div>
      )}

      {status === 'success' && visible.length > 0 && (
        <ul className="space-y-3">
          {visible.map((b) => (
            <li key={b.id}>
              <Link
                to={ROUTES.accountBookingDetail(b.bookingCode)}
                className="flex gap-4 rounded-2xl border border-border bg-surface p-3.5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div
                  className="size-20 shrink-0 rounded-xl bg-secondary bg-cover bg-center"
                  style={{ backgroundImage: `url(${b.tour.thumbnailUrl})` }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-xs text-text-muted">{b.bookingCode}</p>
                    <BookingStatusBadge status={b.status} />
                  </div>
                  <p className="mt-1 line-clamp-1 font-display text-sm font-bold text-secondary">{b.tour.title}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-text-muted">
                    <Calendar className="size-3.5" /> Khởi hành {formatDate(b.departure.departureDate)} ·{' '}
                    {b.numAdults + b.numChildren} khách
                  </p>
                  <p className="mt-1 font-mono text-sm font-bold text-secondary">{formatVnd(b.totalPrice)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

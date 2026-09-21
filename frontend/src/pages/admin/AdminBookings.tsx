import { Search, Ticket } from 'lucide-react'
import { useMemo, useState } from 'react'

import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Pagination } from '@/components/common/Pagination'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { getAdminBookings, updateBookingStatus, type AdminBookingsQuery } from '@/services/admin'
import type { AdminBooking } from '@/types/admin'
import type { BookingPaymentStatus, BookingStatus } from '@/types/booking'
import { getApiErrorMessage } from '@/utils/errors'
import { formatDate, formatVnd } from '@/utils/format'

const PAYMENT_LABELS: Record<BookingPaymentStatus, string> = {
  UNPAID: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
  REFUNDED: 'Đã hoàn tiền',
}

const STATUS_OPTIONS: { value: BookingStatus; label: string }[] = [
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'COMPLETED', label: 'Đã hoàn thành' },
  { value: 'CANCELLED', label: 'Đã huỷ' },
]

type NextAction = { status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'; label: string; destructive?: boolean }

// Khớp luồng chuyển trạng thái của backend: PENDING → CONFIRMED/CANCELLED, CONFIRMED → COMPLETED/CANCELLED.
function nextActions(status: BookingStatus): NextAction[] {
  if (status === 'PENDING') {
    return [
      { status: 'CONFIRMED', label: 'Xác nhận' },
      { status: 'CANCELLED', label: 'Huỷ', destructive: true },
    ]
  }
  if (status === 'CONFIRMED') {
    return [
      { status: 'COMPLETED', label: 'Hoàn thành' },
      { status: 'CANCELLED', label: 'Huỷ', destructive: true },
    ]
  }
  return []
}

const selectClass =
  'h-10 rounded-lg border border-border bg-surface px-3 text-sm text-secondary focus:border-primary focus:outline-none'

export function AdminBookings() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<BookingStatus | ''>('')
  const [paymentStatus, setPaymentStatus] = useState<BookingPaymentStatus | ''>('')
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput)
  const [reloadKey, setReloadKey] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const query: AdminBookingsQuery = useMemo(
    () => ({
      page,
      limit: 15,
      status: status || undefined,
      paymentStatus: paymentStatus || undefined,
      search: search || undefined,
    }),
    [page, status, paymentStatus, search],
  )

  const { status: loadStatus, data: result, error } = useAsync(
    () => getAdminBookings(query),
    [JSON.stringify(query), reloadKey],
  )

  async function handleAction(booking: AdminBooking, action: NextAction) {
    const confirmText = action.destructive
      ? `Huỷ đơn ${booking.bookingCode}? Số chỗ sẽ được trả lại cho đợt khởi hành.`
      : `${action.label} đơn ${booking.bookingCode}?`
    if (!window.confirm(confirmText)) return

    setActionError(null)
    setBusyId(booking.id)
    try {
      await updateBookingStatus(booking.id, action.status)
      setReloadKey((k) => k + 1)
    } catch (err) {
      setActionError(getApiErrorMessage(err) ?? 'Không thể cập nhật trạng thái đơn')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="font-display text-2xl font-bold text-secondary">Đơn đặt tour</h1>
      <p className="mt-1 text-sm text-text-muted">
        {result ? `${result.total} đơn` : 'Theo dõi và xử lý đơn đặt tour'}
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value)
              setPage(1)
            }}
            placeholder="Mã đơn, tên, SĐT, email…"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as BookingStatus | '')
            setPage(1)
          }}
          className={selectClass}
        >
          <option value="">Mọi trạng thái đơn</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={paymentStatus}
          onChange={(e) => {
            setPaymentStatus(e.target.value as BookingPaymentStatus | '')
            setPage(1)
          }}
          className={selectClass}
        >
          <option value="">Mọi trạng thái thanh toán</option>
          {(Object.keys(PAYMENT_LABELS) as BookingPaymentStatus[]).map((k) => (
            <option key={k} value={k}>
              {PAYMENT_LABELS[k]}
            </option>
          ))}
        </select>
      </div>

      {actionError && (
        <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{actionError}</p>
      )}

      <div className="mt-4">
        {loadStatus === 'loading' && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-alt" />
            ))}
          </div>
        )}
        {loadStatus === 'error' && (
          <ErrorState description={error} onRetry={() => setReloadKey((k) => k + 1)} />
        )}
        {loadStatus === 'success' && result.items.length === 0 && (
          <EmptyState icon={Ticket} title="Không có đơn nào phù hợp" />
        )}

        {loadStatus === 'success' && result.items.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-xl border border-border bg-surface">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-border bg-surface-alt text-xs font-semibold uppercase text-text-muted">
                  <tr>
                    <th className="px-4 py-3">Mã đơn</th>
                    <th className="px-4 py-3">Khách / Tour</th>
                    <th className="px-4 py-3">Khởi hành</th>
                    <th className="px-4 py-3 text-right">Tổng tiền</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((b) => (
                    <tr key={b.id} className="border-b border-border align-top last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs font-semibold text-secondary">{b.bookingCode}</p>
                        <p className="text-xs text-text-muted">{formatDate(b.createdAt)}</p>
                      </td>
                      <td className="max-w-64 px-4 py-3">
                        <p className="font-medium text-secondary">{b.contactName}</p>
                        <p className="text-xs text-text-muted">
                          {b.contactPhone} · {b.contactEmail}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-primary-ink">{b.tour.title}</p>
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {formatDate(b.departure.departureDate)}
                        <p className="text-xs">{b.numAdults + b.numChildren} khách</p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-secondary">
                        {formatVnd(b.totalPrice)}
                      </td>
                      <td className="px-4 py-3">
                        <BookingStatusBadge status={b.status} />
                        <p className="mt-1 text-xs text-text-muted">{PAYMENT_LABELS[b.paymentStatus]}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          {nextActions(b.status).map((a) => (
                            <Button
                              key={a.status}
                              size="sm"
                              variant={a.destructive ? 'outline' : 'default'}
                              className={a.destructive ? 'text-danger hover:bg-danger-soft' : undefined}
                              disabled={busyId === b.id}
                              onClick={() => handleAction(b, a)}
                            >
                              {a.label}
                            </Button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6">
              <Pagination page={result.page} limit={result.limit} total={result.total} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

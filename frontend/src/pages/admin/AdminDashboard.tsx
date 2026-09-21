import { CircleDollarSign, MessageSquareWarning, Route, Ticket, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { ROUTES } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { getAdminStats } from '@/services/admin'
import type { BookingStatus } from '@/types/booking'
import { formatDate, formatVnd } from '@/utils/format'

const STATUS_ORDER: { key: BookingStatus; label: string }[] = [
  { key: 'PENDING', label: 'Chờ xử lý' },
  { key: 'CONFIRMED', label: 'Đã xác nhận' },
  { key: 'COMPLETED', label: 'Hoàn thành' },
  { key: 'CANCELLED', label: 'Đã huỷ' },
]

function formatMonth(key: string) {
  const [year, month] = key.split('-')
  return `${month}/${year}`
}

export function AdminDashboard() {
  const { status, data, error } = useAsync(() => getAdminStats(), [])

  if (status === 'loading') {
    return (
      <div className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="p-6">
        <ErrorState description={error} onRetry={() => window.location.reload()} />
      </div>
    )
  }

  const maxRevenue = Math.max(...data.revenueByMonth.map((m) => m.revenue), 1)

  const cards = [
    { label: 'Doanh thu (đã thanh toán)', value: formatVnd(data.totalRevenue), icon: CircleDollarSign },
    { label: 'Tổng số đơn', value: String(data.totalBookings), icon: Ticket },
    { label: 'Khách hàng', value: String(data.userCount), icon: Users },
    { label: 'Tour đang mở bán', value: String(data.publishedTourCount), icon: Route },
  ]

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-secondary">Tổng quan</h1>
        <p className="mt-1 text-sm text-text-muted">Tình hình kinh doanh của VivuGo</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary-ink">
              <c.icon className="size-4" />
            </span>
            <p className="mt-3 text-xs text-text-muted">{c.label}</p>
            <p className="mt-0.5 font-mono text-xl font-bold text-secondary">{c.value}</p>
          </div>
        ))}
      </div>

      {data.pendingReviewCount > 0 && (
        <p className="flex items-center gap-2 rounded-xl bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          <MessageSquareWarning className="size-4" /> Có {data.pendingReviewCount} đánh giá đang chờ duyệt
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-display text-base font-bold text-secondary">Doanh thu 6 tháng gần nhất</h2>
          <div className="mt-4 flex h-48 items-end gap-3">
            {data.revenueByMonth.map((m) => (
              <div key={m.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="font-mono text-[10px] text-text-muted">
                  {m.revenue > 0 ? `${(m.revenue / 1_000_000).toFixed(1)}tr` : ''}
                </span>
                <div
                  className="w-full rounded-t-md bg-primary transition-all"
                  style={{ height: `${Math.max((m.revenue / maxRevenue) * 100, m.revenue > 0 ? 4 : 1)}%` }}
                  title={formatVnd(m.revenue)}
                />
                <span className="text-[11px] text-text-muted">{formatMonth(m.month)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-display text-base font-bold text-secondary">Đơn theo trạng thái</h2>
          <ul className="mt-4 space-y-3">
            {STATUS_ORDER.map((s) => (
              <li key={s.key} className="flex items-center justify-between text-sm">
                <BookingStatusBadge status={s.key} />
                <span className="font-mono font-bold text-secondary">{data.bookingsByStatus[s.key]}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-display text-base font-bold text-secondary">Tour bán chạy</h2>
          {data.topTours.length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">Chưa có đơn nào được thanh toán.</p>
          ) : (
            <ol className="mt-3 space-y-3">
              {data.topTours.map((t, i) => (
                <li key={t.id} className="flex items-center gap-3 text-sm">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-alt text-xs font-bold text-text-muted">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <Link to={ROUTES.tourDetail(t.slug)} className="line-clamp-1 font-medium text-secondary hover:text-primary">
                      {t.title}
                    </Link>
                    <span className="text-xs text-text-muted">{t.bookings} đơn</span>
                  </span>
                  <span className="font-mono text-sm font-bold text-secondary">{formatVnd(t.revenue)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-secondary">Đơn mới nhất</h2>
            <Link to={ROUTES.adminBookings} className="text-xs font-medium text-primary hover:underline">
              Xem tất cả
            </Link>
          </div>
          {data.recentBookings.length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">Chưa có đơn nào.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {data.recentBookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block font-mono text-xs text-text-muted">{b.bookingCode}</span>
                    <span className="line-clamp-1 font-medium text-secondary">{b.tour.title}</span>
                    <span className="text-xs text-text-muted">
                      {b.user.fullName} · {formatDate(b.createdAt)}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-mono text-sm font-bold text-secondary">{formatVnd(b.totalPrice)}</span>
                    <BookingStatusBadge status={b.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

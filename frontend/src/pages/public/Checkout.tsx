import { CreditCard } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ROUTES } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { checkout } from '@/services/bookings'
import { getCart } from '@/services/cart'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { getApiErrorMessage } from '@/utils/errors'
import { isValidEmail } from '@/utils/validation'

function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount) + '₫'
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(iso),
  )
}

export function Checkout() {
  const [searchParams] = useSearchParams()
  const cartItemId = searchParams.get('cartItemId')
  const user = useAuthStore((s) => s.user)

  const { status, data: items, error } = useAsync(() => getCart(), [])
  const item = items?.find((i) => i.id === cartItemId)

  const [contactName, setContactName] = useState(user?.fullName ?? '')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState(user?.email ?? '')
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (contactName.trim().length < 2) {
      setFormError('Vui lòng nhập họ tên')
      return
    }
    if (!/^(0|\+84)\d{9,10}$/.test(contactPhone)) {
      setFormError('Số điện thoại không hợp lệ')
      return
    }
    if (!isValidEmail(contactEmail)) {
      setFormError('Email không đúng định dạng')
      return
    }
    if (!cartItemId) return

    setSubmitting(true)
    try {
      const result = await checkout({
        cartItemId,
        contactName: contactName.trim(),
        contactPhone,
        contactEmail,
        note: note.trim() || undefined,
      })
      const count = useCartStore.getState().itemCount
      useCartStore.getState().setItemCount(Math.max(0, count - 1))

      if (result.paymentUrl) {
        window.location.href = result.paymentUrl
      } else {
        window.location.href = `${ROUTES.checkoutResult}?bookingCode=${result.booking.bookingCode}`
      }
    } catch (err) {
      setFormError(getApiErrorMessage(err) ?? 'Không thể tạo đơn đặt tour, vui lòng thử lại')
      setSubmitting(false)
    }
  }

  if (!cartItemId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <EmptyState title="Thiếu thông tin đơn hàng" description="Vui lòng chọn tour từ giỏ hàng." />
        <div className="mt-4 text-center">
          <Link to={ROUTES.cart}>
            <Button variant="outline">Về giỏ hàng</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-40 w-full rounded-2xl" />
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

  if (!item) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <EmptyState
          title="Không tìm thấy mục này trong giỏ hàng"
          description="Có thể mục này đã được đặt hoặc xoá khỏi giỏ hàng."
        />
        <div className="mt-4 text-center">
          <Link to={ROUTES.cart}>
            <Button variant="outline">Về giỏ hàng</Button>
          </Link>
        </div>
      </div>
    )
  }

  const unitPrice = item.departure.priceOverride ?? item.tour.discountPrice ?? item.tour.basePrice
  const guests = item.numAdults + item.numChildren
  const total = unitPrice * guests

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-bold text-secondary">Thanh toán</h1>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <div className="flex gap-4">
          <div
            className="h-16 w-24 shrink-0 rounded-lg bg-cover bg-center"
            style={{ backgroundImage: `url(${item.tour.thumbnailUrl})` }}
          />
          <div className="min-w-0">
            <p className="line-clamp-1 font-display text-sm font-bold text-secondary">
              {item.tour.title}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Khởi hành {formatDate(item.departure.departureDate)} · {guests} khách
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm font-semibold text-secondary">Tổng thanh toán</span>
          <span className="font-mono text-lg font-bold text-secondary">{formatVnd(total)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-display text-sm font-bold text-secondary">Thông tin liên hệ</h2>

        {formError && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>
        )}

        <div>
          <label htmlFor="contactName" className="mb-1.5 block text-xs font-semibold text-secondary">
            Họ và tên
          </label>
          <input
            id="contactName"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="contactPhone" className="mb-1.5 block text-xs font-semibold text-secondary">
              Số điện thoại
            </label>
            <input
              id="contactPhone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="0912345678"
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="contactEmail" className="mb-1.5 block text-xs font-semibold text-secondary">
              Email
            </label>
            <input
              id="contactEmail"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="note" className="mb-1.5 block text-xs font-semibold text-secondary">
            Ghi chú <span className="font-normal text-text-faint">(không bắt buộc)</span>
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          <CreditCard /> {submitting ? 'Đang xử lý…' : `Thanh toán ${formatVnd(total)}`}
        </Button>
      </form>
    </div>
  )
}

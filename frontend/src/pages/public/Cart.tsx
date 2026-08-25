import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ROUTES } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { getCart, removeCartItem, updateCartItem } from '@/services/cart'
import { useCartStore } from '@/stores/cart'
import type { CartItem } from '@/types/cart'
import { getApiErrorMessage } from '@/utils/errors'

function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount) + '₫'
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(iso),
  )
}

function itemPrice(item: CartItem) {
  return item.departure.priceOverride ?? item.tour.discountPrice ?? item.tour.basePrice
}

export function Cart() {
  const navigate = useNavigate()
  const { status, data, error, refetch } = useAsyncWithRefetch(() => getCart(), [])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [itemError, setItemError] = useState<string | null>(null)

  async function handleQtyChange(item: CartItem, nextAdults: number) {
    if (nextAdults < 1) return
    setItemError(null)
    setBusyId(item.id)
    try {
      await updateCartItem(item.id, { numAdults: nextAdults })
      await refetch()
    } catch (err) {
      setItemError(getApiErrorMessage(err) ?? 'Không thể cập nhật số lượng')
    } finally {
      setBusyId(null)
    }
  }

  async function handleRemove(item: CartItem) {
    setBusyId(item.id)
    try {
      await removeCartItem(item.id)
      const count = useCartStore.getState().itemCount
      useCartStore.getState().setItemCount(Math.max(0, count - 1))
      await refetch()
    } catch (err) {
      setItemError(getApiErrorMessage(err) ?? 'Không thể xoá mục này')
    } finally {
      setBusyId(null)
    }
  }

  const total = data?.reduce((sum, item) => sum + itemPrice(item) * (item.numAdults + item.numChildren), 0) ?? 0

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-bold text-secondary">Giỏ hàng</h1>

      {status === 'loading' && (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="mt-6">
          <ErrorState description={error} onRetry={refetch} />
        </div>
      )}

      {status === 'success' && data.length === 0 && (
        <div className="mt-6">
          <EmptyState
            icon={ShoppingBag}
            title="Giỏ hàng trống"
            description="Khám phá các tour hấp dẫn và thêm vào giỏ hàng của bạn."
          />
          <div className="mt-4 text-center">
            <Link to={ROUTES.tours}>
              <Button variant="outline">Khám phá tour</Button>
            </Link>
          </div>
        </div>
      )}

      {status === 'success' && data.length > 0 && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            {itemError && (
              <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{itemError}</p>
            )}
            {data.map((item) => {
              const remaining = item.departure.totalSlots - item.departure.bookedSlots
              const requested = item.numAdults + item.numChildren
              const busy = busyId === item.id
              return (
                <div
                  key={item.id}
                  className="flex gap-4 rounded-2xl border border-border bg-surface p-4"
                >
                  <div
                    className="h-20 w-28 shrink-0 rounded-lg bg-cover bg-center"
                    style={{ backgroundImage: `url(${item.tour.thumbnailUrl})` }}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={ROUTES.tourDetail(item.tour.slug)}
                      className="line-clamp-1 font-display text-sm font-bold text-secondary hover:text-primary"
                    >
                      {item.tour.title}
                    </Link>
                    <p className="mt-1 text-xs text-text-muted">
                      Khởi hành {formatDate(item.departure.departureDate)}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={busy || item.numAdults <= 1}
                          onClick={() => handleQtyChange(item, item.numAdults - 1)}
                          className="flex size-6 items-center justify-center rounded-md border border-border text-text-muted hover:bg-surface-alt disabled:opacity-40"
                          aria-label="Giảm số khách"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-14 text-center font-mono text-xs text-text-muted">
                          {requested} khách
                        </span>
                        <button
                          type="button"
                          disabled={busy || requested >= remaining}
                          onClick={() => handleQtyChange(item, item.numAdults + 1)}
                          className="flex size-6 items-center justify-center rounded-md border border-border text-text-muted hover:bg-surface-alt disabled:opacity-40"
                          aria-label="Tăng số khách"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <p className="font-mono text-sm font-bold text-secondary">
                        {formatVnd(itemPrice(item) * requested)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleRemove(item)}
                      aria-label="Xoá khỏi giỏ hàng"
                      className="text-text-faint hover:text-danger disabled:opacity-40"
                    >
                      <Trash2 className="size-4" />
                    </button>
                    <Button
                      size="sm"
                      onClick={() => navigate(`${ROUTES.checkout}?cartItemId=${item.id}`)}
                    >
                      Đặt tour này
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          <aside className="h-fit rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm font-semibold text-secondary">Tổng cộng</p>
            <p className="mt-1 font-mono text-xl font-bold text-secondary">{formatVnd(total)}</p>
            <p className="mt-3 text-xs text-text-faint">
              Mỗi tour trong giỏ được thanh toán riêng — chọn &ldquo;Đặt tour này&rdquo; cho từng mục.
            </p>
          </aside>
        </div>
      )}
    </div>
  )
}

function useAsyncWithRefetch<T>(fetcher: () => Promise<T>, deps: unknown[]) {
  const [tick, setTick] = useState(0)
  const state = useAsync(fetcher, [...deps, tick])
  return { ...state, refetch: () => setTick((t) => t + 1) }
}

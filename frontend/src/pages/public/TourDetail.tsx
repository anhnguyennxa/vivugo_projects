import { Calendar, Check, Minus, MapPin, Plus, ShoppingCart, Star, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Breadcrumb } from '@/components/common/Breadcrumb'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TourGallery } from '@/components/tour/TourGallery'
import { ROUTES } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import { addToCart } from '@/services/cart'
import { getTourBySlug } from '@/services/tours'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import type { Departure } from '@/types/tour'
import { getApiErrorMessage } from '@/utils/errors'

function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount) + '₫'
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(iso),
  )
}

export function TourDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { status, data: tour, error } = useAsync(() => getTourBySlug(slug!), [slug])
  const [selectedDeparture, setSelectedDeparture] = useState<Departure | null>(null)
  const [numAdults, setNumAdults] = useState(1)
  const [addingToCart, setAddingToCart] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [added, setAdded] = useState(false)

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-4 h-4 w-64" />
        <Skeleton className="h-64 w-full rounded-2xl sm:h-[380px]" />
        <Skeleton className="mt-6 h-8 w-2/3" />
        <Skeleton className="mt-2 h-4 w-1/3" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ErrorState
          title={error === 'Request failed with status code 404' ? 'Không tìm thấy tour' : undefined}
          description={error}
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  const price = selectedDeparture?.priceOverride ?? tour.discountPrice ?? tour.basePrice
  const hasDiscount = tour.discountPrice != null && tour.discountPrice < tour.basePrice
  const remaining = selectedDeparture
    ? selectedDeparture.totalSlots - selectedDeparture.bookedSlots
    : 0
  const requested = numAdults

  async function handleAddToCart() {
    if (!user) {
      navigate(`${ROUTES.login}?next=${ROUTES.tourDetail(tour!.slug)}`)
      return
    }
    if (!selectedDeparture) {
      setAddError('Vui lòng chọn đợt khởi hành')
      return
    }

    setAddError(null)
    setAddingToCart(true)
    try {
      await addToCart({
        tourId: tour!.id,
        departureId: selectedDeparture.id,
        numAdults,
      })
      setAdded(true)
      const count = useCartStore.getState().itemCount
      useCartStore.getState().setItemCount(count + 1)
    } catch (err) {
      setAddError(getApiErrorMessage(err) ?? 'Không thể thêm vào giỏ hàng')
    } finally {
      setAddingToCart(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[
          { label: 'Trang chủ', href: ROUTES.home },
          { label: 'Tour', href: ROUTES.tours },
          { label: tour.title },
        ]}
      />

      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <TourGallery images={tour.images} thumbnailUrl={tour.thumbnailUrl} title={tour.title} />

          <div className="mt-6">
            <Badge>{tour.category.name}</Badge>
            <h1 className="mt-2 text-balance font-display text-2xl font-extrabold text-secondary sm:text-3xl">
              {tour.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted">
              <span className="flex items-center gap-1">
                <MapPin className="size-4" /> {tour.location}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="size-4" /> {tour.durationDays} ngày {tour.durationNights} đêm
              </span>
              <span className="flex items-center gap-1">
                <Users className="size-4" /> Tối đa {tour.maxGuests} khách
              </span>
              {tour.reviewCount > 0 && (
                <span className="flex items-center gap-1 font-semibold text-accent">
                  <Star className="size-4 fill-accent" /> {tour.avgRating.toFixed(1)} (
                  {tour.reviewCount} đánh giá)
                </span>
              )}
            </div>

            <p className="mt-4 text-[15px] leading-relaxed text-text-muted">{tour.description}</p>

            {tour.itinerary.length > 0 && (
              <div className="mt-8">
                <h2 className="font-display text-lg font-bold text-secondary">Lịch trình</h2>
                <ol className="mt-4 space-y-4">
                  {tour.itinerary.map((day) => (
                    <li key={day.day} className="flex gap-4">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft font-mono text-xs font-bold text-primary-ink">
                        {day.day}
                      </span>
                      <div>
                        <p className="font-semibold text-secondary">{day.title}</p>
                        <p className="mt-0.5 text-sm text-text-muted">{day.description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="mt-8">
              <h2 className="font-display text-lg font-bold text-secondary">
                Đánh giá {tour.reviewCount > 0 && `(${tour.reviewCount})`}
              </h2>
              {tour.reviews.length === 0 ? (
                <EmptyState
                  icon={Star}
                  title="Chưa có đánh giá nào"
                  description="Hãy là người đầu tiên trải nghiệm và đánh giá tour này."
                />
              ) : (
                <ul className="mt-4 space-y-4">
                  {tour.reviews.map((r) => (
                    <li key={r.id} className="rounded-xl border border-border p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-secondary">{r.user.fullName}</p>
                        <span className="flex items-center gap-1 text-sm font-semibold text-accent">
                          <Star className="size-3.5 fill-accent" /> {r.rating}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-text-muted">{r.comment}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-surface p-5 shadow-sm lg:sticky lg:top-20">
          <p className="font-mono text-2xl font-bold text-secondary">
            {formatVnd(price)}
            <span className="ml-1.5 text-sm font-medium text-text-faint">/khách</span>
          </p>
          {hasDiscount && !selectedDeparture?.priceOverride && (
            <p className="font-mono text-sm text-text-faint line-through">
              {formatVnd(tour.basePrice)}
            </p>
          )}

          <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-text-faint">
            Chọn đợt khởi hành
          </p>
          {tour.departures.length === 0 ? (
            <p className="text-sm text-text-muted">Chưa có lịch khởi hành, vui lòng quay lại sau.</p>
          ) : (
            <div className="space-y-2">
              {tour.departures.map((d) => {
                const remaining = d.totalSlots - d.bookedSlots
                const disabled = d.status !== 'OPEN' || remaining <= 0
                return (
                  <button
                    key={d.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSelectedDeparture(d)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                      selectedDeparture?.id === d.id
                        ? 'border-primary bg-primary-soft'
                        : 'border-border hover:bg-surface-alt',
                    )}
                  >
                    <span className="font-medium text-secondary">
                      {formatDate(d.departureDate)}
                    </span>
                    <span
                      className={cn(
                        'text-xs',
                        d.totalSlots - d.bookedSlots <= 5 &&
                          d.totalSlots - d.bookedSlots > 0 &&
                          'font-semibold text-accent',
                      )}
                    >
                      {disabled ? 'Hết chỗ' : `Còn ${d.totalSlots - d.bookedSlots} chỗ`}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {selectedDeparture && (
            <div className="mt-5 flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <span className="flex items-center gap-1.5 text-sm font-medium text-secondary">
                <Users className="size-4" /> Số khách
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setNumAdults((n) => Math.max(1, n - 1))}
                  className="flex size-6 items-center justify-center rounded-md border border-border text-text-muted hover:bg-surface-alt"
                  aria-label="Giảm số khách"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-6 text-center font-mono text-sm font-semibold">
                  {requested}
                </span>
                <button
                  type="button"
                  onClick={() => setNumAdults((n) => (requested < remaining ? n + 1 : n))}
                  disabled={requested >= remaining}
                  className="flex size-6 items-center justify-center rounded-md border border-border text-text-muted hover:bg-surface-alt disabled:opacity-40"
                  aria-label="Tăng số khách"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>
          )}

          {addError && (
            <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {addError}
            </p>
          )}

          {added ? (
            <div className="mt-5 flex flex-col gap-2">
              <p className="flex items-center justify-center gap-1.5 rounded-lg bg-success-soft px-3 py-2.5 text-sm font-medium text-success">
                <Check className="size-4" /> Đã thêm vào giỏ hàng
              </p>
              <Button variant="outline" className="w-full" onClick={() => navigate(ROUTES.cart)}>
                Xem giỏ hàng
              </Button>
            </div>
          ) : (
            <Button
              className="mt-5 w-full"
              disabled={addingToCart || !selectedDeparture}
              onClick={handleAddToCart}
            >
              <ShoppingCart /> {addingToCart ? 'Đang thêm…' : 'Thêm vào giỏ hàng'}
            </Button>
          )}
        </aside>
      </div>
    </div>
  )
}

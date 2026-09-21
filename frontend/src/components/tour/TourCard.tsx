import { Calendar, ChevronLeft, ChevronRight, Eye, Heart, MapPin } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { DEPARTURE_CITY_LABELS } from '@/constants/departureCity'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { useFavoritesStore } from '@/stores/favorites'
import type { Departure, Tour } from '@/types/tour'
import { formatVnd } from '@/utils/format'

const DATE_SCROLL_PX = 76

function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(iso))
}

function DepartureDates({ slug, departures }: { slug: string; departures: Departure[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(departures.length > 3)

  function update() {
    const el = trackRef.current
    if (!el) return
    setCanPrev(el.scrollLeft > 1)
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }

  function scroll(direction: 1 | -1) {
    trackRef.current?.scrollBy({ left: direction * DATE_SCROLL_PX, behavior: 'smooth' })
  }

  return (
    <div className="mt-3 flex items-center gap-1.5">
      <ScrollButton direction="left" disabled={!canPrev} onClick={() => scroll(-1)} />
      <div
        ref={trackRef}
        onScroll={update}
        className="flex min-w-0 flex-1 gap-1.5 overflow-x-hidden scroll-smooth"
      >
        {departures.map((d) => {
          const remaining = d.totalSlots - d.bookedSlots
          return (
            <Link
              key={d.id}
              to={ROUTES.tourDetail(slug)}
              title={remaining > 0 ? `Còn ${remaining} chỗ` : 'Hết chỗ'}
              className={cn(
                'shrink-0 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors',
                remaining > 0
                  ? 'border-primary text-primary hover:bg-primary-soft'
                  : 'border-border text-text-faint line-through',
              )}
            >
              {formatShortDate(d.departureDate)}
            </Link>
          )
        })}
      </div>
      <ScrollButton direction="right" disabled={!canNext} onClick={() => scroll(1)} />
    </div>
  )
}

function ScrollButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 'left' | 'right'
  disabled: boolean
  onClick: () => void
}) {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      aria-label={direction === 'left' ? 'Ngày trước' : 'Ngày sau'}
      disabled={disabled}
      onClick={onClick}
      className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-text-muted hover:bg-surface-alt disabled:opacity-40"
    >
      <Icon className="size-3.5" />
    </button>
  )
}

export function TourCard({ tour }: { tour: Tour }) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isFavorited = useFavoritesStore((s) => s.ids.has(tour.id))
  const price = tour.discountPrice ?? tour.basePrice
  const hasDiscount = tour.discountPrice != null && tour.discountPrice < tour.basePrice
  const discountPercent = hasDiscount ? Math.round((1 - tour.discountPrice! / tour.basePrice) * 100) : 0
  const departures = tour.departures ?? []
  const detailUrl = ROUTES.tourDetail(tour.slug)

  function handleToggleFavorite() {
    if (!user) {
      navigate(`${ROUTES.login}?next=${detailUrl}`)
      return
    }
    void useFavoritesStore.getState().toggle(tour.id)
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-md">
      <div className="group relative overflow-hidden">
        <Link to={detailUrl} aria-label={tour.title} className="block overflow-hidden">
          <div
            className="aspect-4/3 bg-secondary bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-110"
            style={
              tour.thumbnailUrl
                ? { backgroundImage: `url(${tour.thumbnailUrl})` }
                : { backgroundImage: 'linear-gradient(140deg, #0f172a 0%, #2563eb 60%, #b45f06 130%)' }
            }
          />
        </Link>

        {discountPercent > 0 && (
          <span className="absolute left-2.5 top-2.5 rounded-md bg-danger px-2 py-0.5 text-[11px] font-bold text-white">
            -{discountPercent}%
          </span>
        )}
        <button
          type="button"
          aria-label={isFavorited ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
          onClick={handleToggleFavorite}
          className={cn(
            'absolute right-2.5 top-2.5 flex size-7 items-center justify-center rounded-full bg-white/90 transition-colors hover:text-danger',
            isFavorited ? 'text-danger' : 'text-secondary',
          )}
        >
          <Heart className={cn('size-4', isFavorited && 'fill-danger')} />
        </button>
        {tour.isFeatured && (
          <span className="pointer-events-none absolute bottom-2.5 right-2.5 flex items-center gap-1.5 rounded-full bg-secondary/70 px-3 py-1 text-xs font-bold text-accent backdrop-blur-sm">
            <Eye className="size-3.5" /> Điểm nổi bật
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <Link to={detailUrl}>
          <h3 className="line-clamp-2 min-h-11 font-display text-[15px] font-bold leading-snug text-secondary hover:text-primary-ink">
            {tour.title}
          </h3>
        </Link>

        <div className="mt-2.5 flex items-center justify-between gap-2 text-xs font-semibold text-primary-ink">
          <p className="flex min-w-0 items-center gap-1.5">
            <MapPin className="size-4 shrink-0 text-text-muted" />
            <span className="truncate">{DEPARTURE_CITY_LABELS[tour.departureCity]}</span>
          </p>
          <p className="flex shrink-0 items-center gap-1.5">
            <Calendar className="size-4 text-text-muted" />
            {tour.durationDays}N{tour.durationNights}Đ
          </p>
        </div>

        {departures.length > 0 ? (
          <DepartureDates slug={tour.slug} departures={departures} />
        ) : (
          <p className="mt-3 flex h-6 items-center text-xs text-text-faint">Chưa có lịch khởi hành</p>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 border-t border-dashed border-border pt-3.5">
          <div className="mt-3.5">
            <p className="text-xs text-text-muted">Giá từ:</p>
            <p className="font-mono text-lg font-bold leading-tight text-primary-ink">{formatVnd(price)}</p>
            {hasDiscount && (
              <p className="font-mono text-[11px] text-text-faint line-through">{formatVnd(tour.basePrice)}</p>
            )}
          </div>
          <Link
            to={detailUrl}
            className="rounded-xl bg-primary-soft px-4 py-2.5 text-xs font-bold text-primary-ink transition-colors hover:bg-primary hover:text-white"
          >
            Xem chi tiết
          </Link>
        </div>
      </div>
    </div>
  )
}

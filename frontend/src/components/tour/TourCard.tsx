import { Calendar, Eye, Heart, MapPin, Star } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { DEPARTURE_CITY_LABELS } from '@/constants/departureCity'
import { REGION_LABELS } from '@/constants/region'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { useFavoritesStore } from '@/stores/favorites'
import type { Tour } from '@/types/tour'

function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount) + '₫'
}

function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(iso))
}

export function TourCard({ tour }: { tour: Tour }) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isFavorited = useFavoritesStore((s) => s.ids.has(tour.id))
  const price = tour.discountPrice ?? tour.basePrice
  const hasDiscount = tour.discountPrice != null && tour.discountPrice < tour.basePrice
  const discountPercent = hasDiscount ? Math.round((1 - tour.discountPrice! / tour.basePrice) * 100) : 0
  const nextDeparture = tour.departures?.[0]
  const remaining = nextDeparture ? nextDeparture.totalSlots - nextDeparture.bookedSlots : null

  function handleToggleFavorite(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      navigate(`${ROUTES.login}?next=${ROUTES.tourDetail(tour.slug)}`)
      return
    }
    void useFavoritesStore.getState().toggle(tour.id)
  }

  return (
    <Link
      to={ROUTES.tourDetail(tour.slug)}
      className="group block w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-md"
    >
      <div
        className="relative h-36 bg-secondary bg-cover bg-center"
        style={
          tour.thumbnailUrl
            ? { backgroundImage: `url(${tour.thumbnailUrl})` }
            : { backgroundImage: 'linear-gradient(140deg, #0f172a 0%, #2563eb 60%, #b45f06 130%)' }
        }
      >
        <button
          type="button"
          aria-label={isFavorited ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
          onClick={handleToggleFavorite}
          className={cn(
            'absolute right-2.5 top-2.5 flex size-6.5 items-center justify-center rounded-full bg-white/90 transition-colors hover:text-danger',
            isFavorited ? 'text-danger' : 'text-secondary',
          )}
        >
          <Heart className={cn('size-3.5', isFavorited && 'fill-danger')} />
        </button>
        {discountPercent > 0 && (
          <span className="absolute left-2.5 top-2.5 rounded-md bg-danger px-2 py-0.5 text-[11px] font-bold text-white">
            -{discountPercent}%
          </span>
        )}
        <span className="absolute bottom-2.5 left-2.5 rounded-md bg-secondary/75 px-2 py-0.5 text-[11px] font-semibold text-white">
          {tour.durationDays}N{tour.durationNights}Đ
        </span>

        <div className="absolute bottom-0 right-0 size-16 rounded-tl-[64px] bg-primary">
          <span className="absolute bottom-2.5 right-2.5 flex size-7 items-center justify-center rounded-full bg-white text-primary shadow-md">
            <Eye className="size-3.5" strokeWidth={2.4} />
          </span>
        </div>
      </div>

      <div className="p-3.5">
        <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-primary-ink">
          {tour.category.name}
          <span className="text-text-faint">·</span>
          <span className="normal-case text-text-muted">{REGION_LABELS[tour.region]}</span>
        </p>
        <h3 className="mt-1 line-clamp-2 font-display text-sm font-bold leading-snug text-secondary">
          {tour.title}
        </h3>
        <p className="mt-1.5 flex items-center gap-1 text-xs text-text-muted">
          <MapPin className="size-3.5 shrink-0" /> {tour.location} · Từ {DEPARTURE_CITY_LABELS[tour.departureCity]}
        </p>

        {nextDeparture && remaining != null && (
          <p
            className={cn(
              'mt-1.5 flex items-center gap-1 text-xs font-semibold',
              remaining <= 5 ? 'text-danger' : 'text-accent',
            )}
          >
            <Calendar className="size-3.5 shrink-0" />
            Khởi hành {formatShortDate(nextDeparture.departureDate)} · Còn {remaining} chỗ
          </p>
        )}

        <div className="mt-2.5 flex items-baseline justify-between">
          <p className="font-mono text-[15px] font-bold text-secondary">
            {formatVnd(price)}
            <span className="ml-1 font-sans text-[11px] font-medium text-text-faint">/khách</span>
            {hasDiscount && (
              <span className="ml-1.5 font-sans text-[11px] font-medium text-text-faint line-through">
                {formatVnd(tour.basePrice)}
              </span>
            )}
          </p>
          <p className={cn('flex items-center gap-0.5 text-xs font-semibold text-accent')}>
            <Star className="size-3.5 fill-accent" /> {tour.avgRating.toFixed(1)}
          </p>
        </div>
      </div>
    </Link>
  )
}

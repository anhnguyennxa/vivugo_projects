import { Eye, Heart, MapPin, Star } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'
import type { Tour } from '@/types/tour'

function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount) + '₫'
}

export function TourCard({ tour }: { tour: Tour }) {
  const price = tour.discountPrice ?? tour.basePrice
  const hasDiscount = tour.discountPrice != null && tour.discountPrice < tour.basePrice

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
          aria-label="Thêm vào yêu thích"
          onClick={(e) => e.preventDefault()}
          className="absolute right-2.5 top-2.5 flex size-6.5 items-center justify-center rounded-full bg-white/90 text-secondary transition-colors hover:text-danger"
        >
          <Heart className="size-3.5" />
        </button>
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
        <p className="text-[10.5px] font-bold uppercase tracking-wide text-primary-ink">
          {tour.category.name}
        </p>
        <h3 className="mt-1 line-clamp-2 font-display text-sm font-bold leading-snug text-secondary">
          {tour.title}
        </h3>
        <p className="mt-1.5 flex items-center gap-1 text-xs text-text-muted">
          <MapPin className="size-3.5 shrink-0" /> {tour.location}
        </p>

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

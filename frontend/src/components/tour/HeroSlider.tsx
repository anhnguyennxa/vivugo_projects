import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'
import type { Tour } from '@/types/tour'

const AUTOPLAY_MS = 6000

export function HeroSlider({ tours }: { tours: Tour[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const slides = tours.slice(0, 5)

  useEffect(() => {
    if (paused || slides.length < 2) return
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, AUTOPLAY_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [paused, slides.length])

  if (slides.length === 0) return null

  const tour = slides[index]

  return (
    <div
      className="relative h-[280px] overflow-hidden rounded-2xl shadow-md sm:h-[340px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="absolute inset-0 bg-secondary bg-cover bg-center transition-[background-image] duration-500"
        style={
          tour.thumbnailUrl
            ? { backgroundImage: `url(${tour.thumbnailUrl})` }
            : {
                backgroundImage:
                  'linear-gradient(120deg, #0b1220 0%, #123058 36%, #2563eb 74%, #b45f06 145%)',
              }
        }
      />
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/25 to-black/5" />

      <span className="absolute left-5 top-5 rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm sm:left-9 sm:top-6">
        Điểm đến nổi bật
      </span>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Slide trước"
            onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
            className="absolute left-3.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
          >
            <ChevronLeft className="size-4.5" />
          </button>
          <button
            type="button"
            aria-label="Slide sau"
            onClick={() => setIndex((i) => (i + 1) % slides.length)}
            className="absolute right-3.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
          >
            <ChevronRight className="size-4.5" />
          </button>
        </>
      )}

      <div className="absolute inset-x-5 bottom-14 max-w-md text-white sm:inset-x-9 sm:bottom-14">
        <p className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-amber-300">
          {tour.category.name}
        </p>
        <h2 className="text-balance font-display text-2xl font-extrabold leading-tight sm:text-[29px]">
          {tour.title}
        </h2>
        <p className="mt-2 line-clamp-2 max-w-[44ch] text-[13.3px] text-white/85">
          {tour.summary}
        </p>
        <div className="mt-4 flex gap-2.5">
          <Link
            to={ROUTES.tourDetail(tour.slug)}
            className="rounded-lg bg-primary px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-primary-ink"
          >
            Xem tour
          </Link>
          <Link
            to={ROUTES.tours}
            className="rounded-lg border border-white/35 bg-white/10 px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-white/20"
          >
            Tất cả điểm đến
          </Link>
        </div>
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-5 right-5 flex gap-1.5 sm:right-9">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Đến slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn(
                'h-1.5 rounded-full bg-white/40 transition-all',
                i === index ? 'w-4.5 bg-white' : 'w-1.5',
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { TourCard } from '@/components/tour/TourCard'
import { cn } from '@/lib/utils'
import type { Tour } from '@/types/tour'

const GAP_PX = 16

// Hiển thị 4 card (desktop) / 3 (tablet) / 2 (mobile); mỗi lần bấm mũi tên nhích đúng 1 card.
export function TourCarousel({ tours }: { tours: Tour[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const updateArrows = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setCanPrev(el.scrollLeft > 1)
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const observer = new ResizeObserver(updateArrows)
    observer.observe(el)
    return () => observer.disconnect()
  }, [updateArrows, tours.length])

  function step(direction: 1 | -1) {
    const el = trackRef.current
    const first = el?.firstElementChild as HTMLElement | null
    if (!el || !first) return
    el.scrollBy({ left: direction * (first.offsetWidth + GAP_PX), behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={updateArrows}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tours.map((tour) => (
          <div
            key={tour.id}
            className="w-[calc((100%-1rem)/2)] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)]"
          >
            <TourCard tour={tour} />
          </div>
        ))}
      </div>

      <ArrowButton side="left" disabled={!canPrev} onClick={() => step(-1)} />
      <ArrowButton side="right" disabled={!canNext} onClick={() => step(1)} />
    </div>
  )
}

function ArrowButton({
  side,
  disabled,
  onClick,
}: {
  side: 'left' | 'right'
  disabled: boolean
  onClick: () => void
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      aria-label={side === 'left' ? 'Tour trước' : 'Tour tiếp theo'}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'absolute top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-secondary shadow-md transition-opacity hover:bg-surface-alt sm:flex',
        side === 'left' ? '-left-4' : '-right-4',
        disabled && 'pointer-events-none opacity-30',
      )}
    >
      <Icon className="size-5" />
    </button>
  )
}

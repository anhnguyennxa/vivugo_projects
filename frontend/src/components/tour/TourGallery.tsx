import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'
import type { TourImage } from '@/types/tour'

const VISIBLE_COUNT = 4

export function TourGallery({
  images,
  thumbnailUrl,
  title,
}: {
  images: TourImage[]
  thumbnailUrl: string
  title: string
}) {
  const all = images.length > 0 ? images.map((i) => i.url) : [thumbnailUrl]
  const [active, setActive] = useState(0)
  const [windowStart, setWindowStart] = useState(0)

  const canPrev = windowStart > 0
  const canNext = windowStart + VISIBLE_COUNT < all.length
  const visible = all.slice(windowStart, windowStart + VISIBLE_COUNT)

  return (
    <div>
      <div
        className="h-48 w-full rounded-2xl bg-surface-alt bg-cover bg-center sm:h-[380px]"
        style={{ backgroundImage: `url(${all[active]})` }}
        role="img"
        aria-label={title}
      />
      {all.length > 1 && (
        <div className="mt-3 flex items-center gap-1.5">
          {all.length > VISIBLE_COUNT && (
            <button
              type="button"
              aria-label="Ảnh trước"
              disabled={!canPrev}
              onClick={() => setWindowStart((s) => Math.max(0, s - 1))}
              className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-text-muted hover:bg-surface-alt disabled:opacity-40"
            >
              <ChevronLeft className="size-3.5" />
            </button>
          )}
          <div className="flex min-w-0 flex-1 gap-2">
            {visible.map((url, i) => {
              const index = windowStart + i
              return (
                <button
                  key={url}
                  type="button"
                  onClick={() => setActive(index)}
                  className={cn(
                    'h-14 flex-1 rounded-lg bg-cover bg-center ring-2 transition-all sm:h-16 sm:flex-none sm:w-24',
                    index === active ? 'ring-primary' : 'ring-transparent opacity-70 hover:opacity-100',
                  )}
                  style={{ backgroundImage: `url(${url})` }}
                  aria-label={`Ảnh ${index + 1}`}
                />
              )
            })}
          </div>
          {all.length > VISIBLE_COUNT && (
            <button
              type="button"
              aria-label="Ảnh sau"
              disabled={!canNext}
              onClick={() => setWindowStart((s) => Math.min(all.length - VISIBLE_COUNT, s + 1))}
              className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-text-muted hover:bg-surface-alt disabled:opacity-40"
            >
              <ChevronRight className="size-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

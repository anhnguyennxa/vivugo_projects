import { useState } from 'react'

import { cn } from '@/lib/utils'
import type { TourImage } from '@/types/tour'

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

  return (
    <div>
      <div
        className="h-64 w-full rounded-2xl bg-surface-alt bg-cover bg-center sm:h-[380px]"
        style={{ backgroundImage: `url(${all[active]})` }}
        role="img"
        aria-label={title}
      />
      {all.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {all.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                'h-16 w-24 shrink-0 rounded-lg bg-cover bg-center ring-2 transition-all',
                i === active ? 'ring-primary' : 'ring-transparent opacity-70 hover:opacity-100',
              )}
              style={{ backgroundImage: `url(${url})` }}
              aria-label={`Ảnh ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

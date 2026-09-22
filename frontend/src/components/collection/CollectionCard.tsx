import { Layers } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/constants/routes'
import type { CollectionSummary } from '@/types/collection'
import { formatDate } from '@/utils/format'

export function CollectionCard({ collection }: { collection: CollectionSummary }) {
  return (
    <Link
      to={ROUTES.collectionDetail(collection.slug)}
      className="group block w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-16/9 overflow-hidden">
        <div
          className="size-full bg-secondary bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-110"
          style={{ backgroundImage: `url(${collection.coverImageUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-secondary/80 via-secondary/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3.5">
          <h3 className="font-display text-base font-bold leading-snug text-white drop-shadow-sm">
            {collection.title}
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-white/85">
            <Layers className="size-3.5" /> {collection.tourCount} tour
            {collection.endAt && <span>· Đến hết {formatDate(collection.endAt)}</span>}
          </p>
        </div>
      </div>
      {collection.description && (
        <p className="line-clamp-2 p-3.5 text-xs text-text-muted">{collection.description}</p>
      )}
    </Link>
  )
}

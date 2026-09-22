import { useParams } from 'react-router-dom'

import { Breadcrumb } from '@/components/common/Breadcrumb'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { TourCard } from '@/components/tour/TourCard'
import { TourCardSkeleton } from '@/components/tour/TourCardSkeleton'
import { Skeleton } from '@/components/ui/skeleton'
import { ROUTES } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { getCollectionBySlug } from '@/services/collections'

export function CollectionDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { status, data: collection, error } = useAsync(() => getCollectionBySlug(slug!), [slug])

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-4 h-4 w-64" />
        <Skeleton className="h-48 w-full rounded-2xl sm:h-64" />
        <Skeleton className="mt-6 h-8 w-1/2" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <TourCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ErrorState title="Không tìm thấy bộ sưu tập" description={error} onRetry={() => window.location.reload()} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[
          { label: 'Trang chủ', href: ROUTES.home },
          { label: 'Bộ sưu tập', href: ROUTES.collections },
          { label: collection.title },
        ]}
      />

      <div
        className="mt-4 h-48 rounded-2xl bg-secondary bg-cover bg-center sm:h-64"
        style={{ backgroundImage: `url(${collection.coverImageUrl})` }}
      />

      <h1 className="mt-6 font-display text-2xl font-bold text-secondary sm:text-3xl">{collection.title}</h1>
      {collection.description && <p className="mt-2 max-w-2xl text-sm text-text-muted">{collection.description}</p>}
      <p className="mt-2 text-sm text-text-muted">{collection.tours.length} tour trong bộ sưu tập</p>

      <div className="mt-8">
        {collection.tours.length === 0 ? (
          <EmptyState title="Chưa có tour nào trong bộ sưu tập này" />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {collection.tours.map((tour) => (
              <TourCard key={tour.id} tour={tour} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { ArrowRight, Compass, Layers, Tag, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'

import { CollectionCard } from '@/components/collection/CollectionCard'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { HeroSlider } from '@/components/tour/HeroSlider'
import { TourCarousel } from '@/components/tour/TourCarousel'
import { TourCardSkeleton } from '@/components/tour/TourCardSkeleton'
import { ROUTES } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { getCollections } from '@/services/collections'
import { getFeaturedTours, getLastMinuteTours, getPromoTours } from '@/services/tours'

function SeeAll({ to }: { to: string }) {
  return (
    <Link
      to={to}
      className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
    >
      Xem tất cả <ArrowRight className="size-4" />
    </Link>
  )
}

export function Home() {
  const { status, data: tours, error } = useAsync(() => getFeaturedTours(12), [])
  const {
    status: lastMinuteStatus,
    data: lastMinuteTours,
    error: lastMinuteError,
  } = useAsync(() => getLastMinuteTours(12), [])
  const { status: promoStatus, data: promoTours } = useAsync(() => getPromoTours(12), [])
  const { status: collectionsStatus, data: collections } = useAsync(() => getCollections(4), [])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {status === 'loading' && <div className="h-[280px] animate-pulse rounded-2xl bg-surface-alt sm:h-[340px]" />}
      {status === 'error' && (
        <ErrorState
          title="Không tải được điểm đến nổi bật"
          description={error}
          onRetry={() => window.location.reload()}
        />
      )}
      {status === 'success' && tours.length > 0 && <HeroSlider tours={tours.slice(0, 5)} />}
      {status === 'success' && tours.length === 0 && (
        <EmptyState
          icon={Compass}
          title="Chưa có tour nổi bật"
          description="Admin chưa ghim tour nào lên trang chủ."
        />
      )}

      {(lastMinuteStatus === 'loading' ||
        (lastMinuteStatus === 'success' && lastMinuteTours.length > 0)) && (
        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Zap className="size-4 fill-accent" />
              </span>
              <div>
                <h2 className="font-display text-xl font-bold text-secondary sm:text-2xl">
                  Tour giờ chốt
                </h2>
                <p className="text-sm text-text-muted">Khởi hành trong 3 tuần tới — số chỗ có hạn</p>
              </div>
            </div>
            <SeeAll to={`${ROUTES.tours}?lastMinute=1`} />
          </div>

          {lastMinuteStatus === 'loading' && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <TourCardSkeleton key={i} />
              ))}
            </div>
          )}
          {lastMinuteStatus === 'success' && (
            <TourCarousel tours={lastMinuteTours} />
          )}
        </section>
      )}
      {lastMinuteStatus === 'error' && (
        <section className="mt-12">
          <ErrorState
            title="Không tải được tour giờ chốt"
            description={lastMinuteError}
            onRetry={() => window.location.reload()}
          />
        </section>
      )}

      {promoStatus === 'success' && promoTours.length > 0 && (
        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-danger-soft text-danger">
                <Tag className="size-4" />
              </span>
              <div>
                <h2 className="font-display text-xl font-bold text-secondary sm:text-2xl">Khuyến mãi</h2>
                <p className="text-sm text-text-muted">Giá ưu đãi cho các tour đang giảm giá</p>
              </div>
            </div>
            <SeeAll to={`${ROUTES.tours}?promo=1`} />
          </div>
          <TourCarousel tours={promoTours} />
        </section>
      )}

      {collectionsStatus === 'success' && collections.length > 0 && (
        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary-soft text-primary-ink">
                <Layers className="size-4" />
              </span>
              <div>
                <h2 className="font-display text-xl font-bold text-secondary sm:text-2xl">Bộ sưu tập</h2>
                <p className="text-sm text-text-muted">Tour được tuyển chọn theo chủ đề và mùa</p>
              </div>
            </div>
            <SeeAll to={ROUTES.collections} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {collections.map((c) => (
              <CollectionCard key={c.id} collection={c} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-12">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-secondary sm:text-2xl">
              Tour nổi bật
            </h2>
            <p className="mt-1 text-sm text-text-muted">Được yêu thích nhất trong tháng này</p>
          </div>
          <SeeAll to={`${ROUTES.tours}?featured=1`} />
        </div>

        {status === 'loading' && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <TourCardSkeleton key={i} />
            ))}
          </div>
        )}
        {status === 'error' && (
          <ErrorState description={error} onRetry={() => window.location.reload()} />
        )}
        {status === 'success' && tours.length > 0 && (
          <TourCarousel tours={tours} />
        )}
        {status === 'success' && tours.length === 0 && (
          <EmptyState title="Chưa có tour nào" description="Quay lại sau nhé." />
        )}
      </section>
    </div>
  )
}

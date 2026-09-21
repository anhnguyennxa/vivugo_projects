import { Compass, Zap } from 'lucide-react'

import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { HeroSlider } from '@/components/tour/HeroSlider'
import { TourCard } from '@/components/tour/TourCard'
import { TourCardSkeleton } from '@/components/tour/TourCardSkeleton'
import { useAsync } from '@/hooks/useAsync'
import { getFeaturedTours, getLastMinuteTours } from '@/services/tours'

export function Home() {
  const { status, data: tours, error } = useAsync(() => getFeaturedTours(5), [])
  const {
    status: lastMinuteStatus,
    data: lastMinuteTours,
    error: lastMinuteError,
  } = useAsync(() => getLastMinuteTours(8), [])

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
      {status === 'success' && tours.length > 0 && <HeroSlider tours={tours} />}
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
          <div className="mb-5 flex items-center gap-2">
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

          {lastMinuteStatus === 'loading' && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <TourCardSkeleton key={i} />
              ))}
            </div>
          )}
          {lastMinuteStatus === 'success' && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {lastMinuteTours.map((tour) => (
                <TourCard key={tour.id} tour={tour} />
              ))}
            </div>
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

      <section className="mt-12">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-secondary sm:text-2xl">
              Tour nổi bật
            </h2>
            <p className="mt-1 text-sm text-text-muted">Được yêu thích nhất trong tháng này</p>
          </div>
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {tours.map((tour) => (
              <TourCard key={tour.id} tour={tour} />
            ))}
          </div>
        )}
        {status === 'success' && tours.length === 0 && (
          <EmptyState title="Chưa có tour nào" description="Quay lại sau nhé." />
        )}
      </section>
    </div>
  )
}

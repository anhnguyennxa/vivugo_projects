import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { TourCard } from '@/components/tour/TourCard'
import { TourCardSkeleton } from '@/components/tour/TourCardSkeleton'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { getFavorites } from '@/services/favorites'
import { useAuthStore } from '@/stores/auth'

export function Favorites() {
  const user = useAuthStore((s) => s.user)
  const { status, data, error } = useAsync(() => getFavorites(), [user?.id])

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <EmptyState
          icon={Heart}
          title="Đăng nhập để xem tour yêu thích"
          description="Lưu lại các tour bạn quan tâm để xem sau."
        />
        <div className="mt-4 text-center">
          <Link to={`${ROUTES.login}?next=${ROUTES.favorites}`}>
            <Button variant="outline">Đăng nhập</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-bold text-secondary">Tour yêu thích</h1>

      {status === 'loading' && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <TourCardSkeleton key={i} />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="mt-6">
          <ErrorState description={error} onRetry={() => window.location.reload()} />
        </div>
      )}

      {status === 'success' && data.length === 0 && (
        <div className="mt-6">
          <EmptyState
            icon={Heart}
            title="Chưa có tour yêu thích nào"
            description="Nhấn vào biểu tượng trái tim trên tour bạn thích để lưu lại."
          />
          <div className="mt-4 text-center">
            <Link to={ROUTES.tours}>
              <Button variant="outline">Khám phá tour</Button>
            </Link>
          </div>
        </div>
      )}

      {status === 'success' && data.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.map((favorite) => (
            <TourCard key={favorite.id} tour={favorite.tour} />
          ))}
        </div>
      )}
    </div>
  )
}

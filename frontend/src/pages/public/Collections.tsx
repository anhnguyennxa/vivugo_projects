import { Layers } from 'lucide-react'

import { CollectionCard } from '@/components/collection/CollectionCard'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { useAsync } from '@/hooks/useAsync'
import { getCollections } from '@/services/collections'

export function Collections() {
  const { status, data: collections, error } = useAsync(() => getCollections(), [])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-secondary">Bộ sưu tập tour</h1>
        <p className="mt-1 text-sm text-text-muted">Tour được tuyển chọn theo chủ đề và mùa trong năm</p>
      </div>

      {status === 'loading' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-16/9 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {status === 'error' && <ErrorState description={error} onRetry={() => window.location.reload()} />}

      {status === 'success' && collections.length === 0 && (
        <EmptyState icon={Layers} title="Chưa có bộ sưu tập nào" description="Quay lại sau nhé." />
      )}

      {status === 'success' && collections.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <CollectionCard key={c.id} collection={c} />
          ))}
        </div>
      )}
    </div>
  )
}

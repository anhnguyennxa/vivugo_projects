import { Compass, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Pagination } from '@/components/common/Pagination'
import { TourCard } from '@/components/tour/TourCard'
import { TourCardSkeleton } from '@/components/tour/TourCardSkeleton'
import { DEPARTURE_CITY_OPTIONS } from '@/constants/departureCity'
import { REGION_OPTIONS } from '@/constants/region'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { cn } from '@/lib/utils'
import { getCategories } from '@/services/categories'
import { getTours, type ToursQuery } from '@/services/tours'
import type { DepartureCity, Region } from '@/types/tour'

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'createdAt-desc', label: 'Mới nhất' },
  { value: 'basePrice-asc', label: 'Giá: Thấp đến cao' },
  { value: 'basePrice-desc', label: 'Giá: Cao đến thấp' },
  { value: 'avgRating-desc', label: 'Đánh giá cao nhất' },
]

export function Tours() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const debouncedSearch = useDebouncedValue(searchInput)

  const page = Number(searchParams.get('page') ?? '1')
  const category = searchParams.get('category') ?? ''
  const region = searchParams.get('region') ?? ''
  const departureCity = searchParams.get('departureCity') ?? ''
  const promo = searchParams.get('promo') === '1'
  const featured = searchParams.get('featured') === '1'
  const lastMinute = searchParams.get('lastMinute') === '1'
  const sortKey = searchParams.get('sort') ?? 'createdAt'
  const orderKey = (searchParams.get('order') as 'asc' | 'desc') ?? 'desc'
  const limit = 12

  useEffect(() => {
    const current = searchParams.get('search') ?? ''
    if (debouncedSearch === current) return
    const next = new URLSearchParams(searchParams)
    if (debouncedSearch) next.set('search', debouncedSearch)
    else next.delete('search')
    next.set('page', '1')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const query: ToursQuery = useMemo(
    () => ({
      page,
      limit,
      search: searchParams.get('search') ?? undefined,
      category: category || undefined,
      region: (region || undefined) as Region | undefined,
      departureCity: (departureCity || undefined) as DepartureCity | undefined,
      promo: promo || undefined,
      featured: featured || undefined,
      lastMinute: lastMinute || undefined,
      sort: sortKey as ToursQuery['sort'],
      order: orderKey,
    }),
    [page, category, region, departureCity, promo, featured, lastMinute, sortKey, orderKey, searchParams],
  )

  const { status, data: result, error } = useAsync(() => getTours(query), [JSON.stringify(query)])
  const { data: categories } = useAsync(() => getCategories(), [])

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.set('page', '1')
    setSearchParams(next)
  }

  function clearFilters() {
    setSearchInput('')
    setSearchParams({})
  }

  const pageTitle = promo ? 'Tour khuyến mãi' : lastMinute ? 'Tour giờ chốt' : featured ? 'Tour nổi bật' : 'Tất cả tour'
  const hasFilters = !!(category || region || departureCity || promo || featured || lastMinute || searchParams.get('search'))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-secondary">{pageTitle}</h1>
        <p className="mt-1 text-sm text-text-muted">
          {result ? `${result.total} tour phù hợp` : 'Khám phá các tour du lịch của VivuGo'}
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => updateParam('region', '')}
          className={cn(
            'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
            !region
              ? 'border-primary bg-primary text-white'
              : 'border-border bg-surface text-text-muted hover:bg-surface-alt',
          )}
        >
          Tất cả vùng miền
        </button>
        {REGION_OPTIONS.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => updateParam('region', r.value)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
              region === r.value
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-surface text-text-muted hover:bg-surface-alt',
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo tên tour, điểm đến…"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <select
          value={category}
          onChange={(e) => updateParam('category', e.target.value)}
          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-secondary focus:border-primary focus:outline-none"
        >
          <option value="">Tất cả danh mục</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={departureCity}
          onChange={(e) => updateParam('departureCity', e.target.value)}
          aria-label="Điểm khởi hành"
          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-secondary focus:border-primary focus:outline-none"
        >
          <option value="">Mọi điểm khởi hành</option>
          {DEPARTURE_CITY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              Từ {c.label}
            </option>
          ))}
        </select>

        <select
          value={`${sortKey}-${orderKey}`}
          onChange={(e) => {
            const [s, o] = e.target.value.split('-')
            const next = new URLSearchParams(searchParams)
            next.set('sort', s)
            next.set('order', o)
            next.set('page', '1')
            setSearchParams(next)
          }}
          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-secondary focus:border-primary focus:outline-none"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-medium text-text-muted hover:bg-surface-alt"
          >
            <X className="size-4" /> Xoá bộ lọc
          </button>
        )}
      </div>

      {status === 'loading' && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <TourCardSkeleton key={i} />
          ))}
        </div>
      )}

      {status === 'error' && (
        <ErrorState description={error} onRetry={() => window.location.reload()} />
      )}

      {status === 'success' && result.items.length === 0 && (
        <EmptyState
          icon={Compass}
          title="Không tìm thấy tour phù hợp"
          description="Thử điều chỉnh từ khoá tìm kiếm hoặc bộ lọc."
        />
      )}

      {status === 'success' && result.items.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {result.items.map((tour) => (
              <TourCard key={tour.id} tour={tour} />
            ))}
          </div>
          <div className="mt-8">
            <Pagination
              page={result.page}
              limit={result.limit}
              total={result.total}
              onPageChange={(p) => updateParam('page', String(p))}
            />
          </div>
        </>
      )}
    </div>
  )
}

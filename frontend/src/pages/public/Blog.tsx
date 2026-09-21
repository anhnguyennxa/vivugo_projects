import { BookOpen, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { BlogPostCard } from '@/components/blog/BlogPostCard'
import { BlogPostCardSkeleton } from '@/components/blog/BlogPostCardSkeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Pagination } from '@/components/common/Pagination'
import { REGION_OPTIONS } from '@/constants/region'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { cn } from '@/lib/utils'
import { getBlogPosts, type BlogQuery } from '@/services/blog'
import type { Region } from '@/types/tour'

export function Blog() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const debouncedSearch = useDebouncedValue(searchInput)

  const page = Number(searchParams.get('page') ?? '1')
  const region = searchParams.get('region') ?? ''
  const limit = 9

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

  const query: BlogQuery = useMemo(
    () => ({
      page,
      limit,
      search: searchParams.get('search') ?? undefined,
      region: (region || undefined) as Region | undefined,
    }),
    [page, region, searchParams],
  )

  const { status, data: result, error } = useAsync(() => getBlogPosts(query), [JSON.stringify(query)])

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

  const hasFilters = !!(region || searchParams.get('search'))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-secondary">Cẩm nang du lịch</h1>
        <p className="mt-1 text-sm text-text-muted">
          Kinh nghiệm, gợi ý lịch trình và bí kíp khám phá các điểm đến trong nước
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
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm bài viết…"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex h-10 w-fit items-center gap-1 rounded-lg px-3 text-sm font-medium text-text-muted hover:bg-surface-alt"
          >
            <X className="size-4" /> Xoá bộ lọc
          </button>
        )}
      </div>

      {status === 'loading' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <BlogPostCardSkeleton key={i} />
          ))}
        </div>
      )}

      {status === 'error' && (
        <ErrorState description={error} onRetry={() => window.location.reload()} />
      )}

      {status === 'success' && result.items.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="Không tìm thấy bài viết phù hợp"
          description="Thử điều chỉnh từ khoá tìm kiếm hoặc bộ lọc vùng miền."
        />
      )}

      {status === 'success' && result.items.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((post) => (
              <BlogPostCard key={post.id} post={post} />
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

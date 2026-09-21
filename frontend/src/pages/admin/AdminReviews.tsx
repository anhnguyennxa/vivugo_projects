import { MessageSquare, Search, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Pagination } from '@/components/common/Pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { REVIEW_STATUS_LABELS } from '@/constants/reviewStatus'
import { ROUTES } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { getAdminReviews, moderateReview, type AdminReviewsQuery } from '@/services/admin'
import type { AdminReview, ReviewStatus } from '@/types/admin'
import { getApiErrorMessage } from '@/utils/errors'
import { formatDate } from '@/utils/format'

const STATUS_VARIANT = { PENDING: 'accent', APPROVED: 'success', HIDDEN: 'secondary' } as const

const TABS: { value: ReviewStatus | ''; label: string }[] = [
  { value: 'PENDING', label: REVIEW_STATUS_LABELS.PENDING },
  { value: 'APPROVED', label: REVIEW_STATUS_LABELS.APPROVED },
  { value: 'HIDDEN', label: REVIEW_STATUS_LABELS.HIDDEN },
  { value: '', label: 'Tất cả' },
]

export function AdminReviews() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<ReviewStatus | ''>('PENDING')
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput)
  const [reloadKey, setReloadKey] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const query: AdminReviewsQuery = useMemo(
    () => ({ page, limit: 15, status: status || undefined, search: search || undefined }),
    [page, status, search],
  )

  const { status: loadStatus, data: result, error } = useAsync(
    () => getAdminReviews(query),
    [JSON.stringify(query), reloadKey],
  )

  async function handleModerate(review: AdminReview, next: 'APPROVED' | 'HIDDEN') {
    if (next === 'HIDDEN' && !window.confirm(`Ẩn đánh giá của ${review.user.fullName}? Đánh giá sẽ không hiện trên website.`)) {
      return
    }
    setActionError(null)
    setBusyId(review.id)
    try {
      await moderateReview(review.id, next)
      setReloadKey((k) => k + 1)
    } catch (err) {
      setActionError(getApiErrorMessage(err) ?? 'Không thể cập nhật đánh giá')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="font-display text-2xl font-bold text-secondary">Duyệt đánh giá</h1>
      <p className="mt-1 text-sm text-text-muted">{result ? `${result.total} đánh giá` : 'Danh sách đánh giá'}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg bg-surface-alt p-1">
          {TABS.map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => {
                setStatus(tab.value)
                setPage(1)
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                status === tab.value ? 'bg-surface text-secondary shadow-sm' : 'text-text-muted hover:text-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value)
              setPage(1)
            }}
            placeholder="Nội dung, người đánh giá, tour…"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {actionError && <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{actionError}</p>}

      <div className="mt-4">
        {loadStatus === 'loading' && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-alt" />
            ))}
          </div>
        )}
        {loadStatus === 'error' && <ErrorState description={error} onRetry={() => setReloadKey((k) => k + 1)} />}
        {loadStatus === 'success' && result.items.length === 0 && (
          <EmptyState icon={MessageSquare} title="Không có đánh giá nào" />
        )}

        {loadStatus === 'success' && result.items.length > 0 && (
          <>
            <ul className="space-y-3">
              {result.items.map((r) => (
                <li key={r.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium text-secondary">
                        {r.user.fullName}
                        <span className="text-xs font-normal text-text-muted">{r.user.email}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-text-muted">
                        Tour:{' '}
                        <Link to={ROUTES.adminTourEdit(r.tour.id)} className="text-primary hover:underline">
                          {r.tour.title}
                        </Link>{' '}
                        · {formatDate(r.createdAt)}
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANT[r.status]}>{REVIEW_STATUS_LABELS[r.status]}</Badge>
                  </div>

                  <div className="mt-2 flex" aria-label={`${r.rating} sao`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`size-4 ${i < r.rating ? 'fill-accent text-accent' : 'text-border'}`}
                      />
                    ))}
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-secondary">{r.comment}</p>

                  <div className="mt-3 flex gap-2">
                    {r.status !== 'APPROVED' && (
                      <Button size="sm" disabled={busyId === r.id} onClick={() => handleModerate(r, 'APPROVED')}>
                        Duyệt
                      </Button>
                    )}
                    {r.status !== 'HIDDEN' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === r.id}
                        onClick={() => handleModerate(r, 'HIDDEN')}
                        className="text-danger hover:bg-danger-soft"
                      >
                        Ẩn
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Pagination page={result.page} limit={result.limit} total={result.total} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

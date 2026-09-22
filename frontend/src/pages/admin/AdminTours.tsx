import { Pencil, Plus, Route, Search, Star, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Pagination } from '@/components/common/Pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DEPARTURE_CITY_LABELS } from '@/constants/departureCity'
import { REGION_LABELS } from '@/constants/region'
import { ROUTES } from '@/constants/routes'
import { TOUR_STATUS_LABELS } from '@/constants/tourStatus'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import {
  deleteTour,
  deleteTourPermanently,
  getAdminTours,
  updateTour,
  type AdminToursQuery,
} from '@/services/admin'
import { getCategories } from '@/services/categories'
import type { AdminTour, TourStatus } from '@/types/admin'
import { getApiErrorMessage } from '@/utils/errors'
import { formatDate, formatVnd } from '@/utils/format'

const STATUS_VARIANT = { DRAFT: 'secondary', PUBLISHED: 'success', ARCHIVED: 'danger' } as const

const selectClass =
  'h-10 rounded-lg border border-border bg-surface px-3 text-sm text-secondary focus:border-primary focus:outline-none'

export function AdminTours() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<TourStatus | ''>('')
  const [categoryId, setCategoryId] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput)
  const [reloadKey, setReloadKey] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data: categories } = useAsync(() => getCategories(), [])

  const query: AdminToursQuery = useMemo(
    () => ({
      page,
      limit: 15,
      status: status || undefined,
      categoryId: categoryId || undefined,
      search: search || undefined,
    }),
    [page, status, categoryId, search],
  )

  const { status: loadStatus, data: result, error } = useAsync(
    () => getAdminTours(query),
    [JSON.stringify(query), reloadKey],
  )

  async function run(id: string, fn: () => Promise<void>, fallback: string) {
    setActionError(null)
    setBusyId(id)
    try {
      await fn()
      setReloadKey((k) => k + 1)
    } catch (err) {
      setActionError(getApiErrorMessage(err) ?? fallback)
    } finally {
      setBusyId(null)
    }
  }

  // Tour chưa có đơn: xoá vĩnh viễn. Tour đã có đơn: chỉ ẩn khỏi website để giữ lịch sử đơn/doanh thu.
  function handleDelete(t: AdminTour) {
    if (t._count.bookings === 0) {
      const ok = window.confirm(
        `XOÁ VĨNH VIỄN tour "${t.title}"?\nẢnh, đợt khởi hành, đánh giá của tour cũng bị xoá và không thể khôi phục.`,
      )
      if (ok) void run(t.id, () => deleteTourPermanently(t.id), 'Không thể xoá tour')
      return
    }
    const ok = window.confirm(
      `Tour "${t.title}" đã có ${t._count.bookings} đơn nên không thể xoá vĩnh viễn.\nẨn tour khỏi website?`,
    )
    if (ok) void run(t.id, () => deleteTour(t.id), 'Không thể ẩn tour')
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-secondary">Quản lý tour</h1>
          <p className="mt-1 text-sm text-text-muted">{result ? `${result.total} tour` : 'Danh sách tour'}</p>
        </div>
        <Link to={ROUTES.adminTourNew}>
          <Button>
            <Plus /> Tạo tour
          </Button>
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value)
              setPage(1)
            }}
            placeholder="Tên tour, điểm đến…"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as TourStatus | '')
            setPage(1)
          }}
          className={selectClass}
        >
          <option value="">Mọi trạng thái</option>
          {(Object.keys(TOUR_STATUS_LABELS) as TourStatus[]).map((s) => (
            <option key={s} value={s}>
              {TOUR_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value)
            setPage(1)
          }}
          className={selectClass}
        >
          <option value="">Mọi danh mục</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {actionError && <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{actionError}</p>}

      <div className="mt-4">
        {loadStatus === 'loading' && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-alt" />
            ))}
          </div>
        )}
        {loadStatus === 'error' && <ErrorState description={error} onRetry={() => setReloadKey((k) => k + 1)} />}
        {loadStatus === 'success' && result.items.length === 0 && (
          <EmptyState icon={Route} title="Không có tour nào phù hợp" />
        )}

        {loadStatus === 'success' && result.items.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-xl border border-border bg-surface">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-border bg-surface-alt text-xs font-semibold uppercase text-text-muted">
                  <tr>
                    <th className="px-4 py-3">Tour</th>
                    <th className="px-4 py-3">Khu vực</th>
                    <th className="px-4 py-3 text-right">Giá</th>
                    <th className="px-4 py-3">Đợt / Đơn</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((t) => (
                    <tr key={t.id} className="border-b border-border align-top last:border-0">
                      <td className="max-w-72 px-4 py-3">
                        <div className="flex gap-3">
                          <div
                            className="size-12 shrink-0 rounded-lg bg-secondary bg-cover bg-center"
                            style={{ backgroundImage: `url(${t.thumbnailUrl})` }}
                          />
                          <div className="min-w-0">
                            <p className="line-clamp-1 font-medium text-secondary">
                              {t.isFeatured && <Star className="mr-1 inline size-3.5 fill-accent text-accent" />}
                              {t.title}
                            </p>
                            <p className="text-xs text-text-muted">{t.category.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {REGION_LABELS[t.region]}
                        <p className="text-xs">Từ {DEPARTURE_CITY_LABELS[t.departureCity]}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-secondary">
                        {formatVnd(t.discountPrice ?? t.basePrice)}
                        {t.discountPrice != null && (
                          <>
                            <p className="text-xs font-normal text-text-faint line-through">{formatVnd(t.basePrice)}</p>
                            {(t.promoStartAt || t.promoEndAt) && (
                              <p className="text-xs font-normal text-accent">
                                {t.promoStartAt && `Từ ${formatDate(t.promoStartAt)}`}
                                {t.promoStartAt && t.promoEndAt && ' – '}
                                {t.promoEndAt && `Đến ${formatDate(t.promoEndAt)}`}
                              </p>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {t._count.departures} đợt · {t._count.bookings} đơn
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[t.status]}>{TOUR_STATUS_LABELS[t.status]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          {t.status !== 'PUBLISHED' ? (
                            <Button
                              size="sm"
                              disabled={busyId === t.id}
                              onClick={() => run(t.id, () => updateTour(t.id, { status: 'PUBLISHED' }), 'Không thể mở bán')}
                            >
                              Mở bán
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === t.id}
                              onClick={() => run(t.id, () => updateTour(t.id, { status: 'DRAFT' }), 'Không thể ẩn tour')}
                            >
                              Ẩn
                            </Button>
                          )}
                          <Link to={ROUTES.adminTourEdit(t.id)}>
                            <Button size="sm" variant="outline" aria-label="Sửa">
                              <Pencil />
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            aria-label={t._count.bookings === 0 ? 'Xoá vĩnh viễn' : 'Ẩn khỏi website'}
                            title={t._count.bookings === 0 ? 'Xoá vĩnh viễn' : 'Đã có đơn: chỉ ẩn khỏi website'}
                            disabled={busyId === t.id}
                            onClick={() => handleDelete(t)}
                            className="text-danger hover:bg-danger-soft"
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6">
              <Pagination page={result.page} limit={result.limit} total={result.total} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

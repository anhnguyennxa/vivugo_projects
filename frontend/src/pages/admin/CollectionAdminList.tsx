import { Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Pagination } from '@/components/common/Pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import {
  deleteCollection,
  getAdminCollections,
  type AdminCollectionsQuery,
} from '@/services/collections'
import type { CollectionStatus } from '@/types/collection'
import { formatDate } from '@/utils/format'

const STATUS_LABELS: Record<CollectionStatus, string> = {
  DRAFT: 'Nháp',
  PUBLISHED: 'Đã đăng',
}

export function CollectionAdminList() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<CollectionStatus | ''>('')
  const [reloadKey, setReloadKey] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const query: AdminCollectionsQuery = useMemo(
    () => ({ page, limit: 15, status: status || undefined }),
    [page, status],
  )

  const { status: loadStatus, data: result, error } = useAsync(
    () => getAdminCollections(query),
    [JSON.stringify(query), reloadKey],
  )

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Xoá bộ sưu tập "${title}"? Hành động này không thể hoàn tác.`)) return
    setDeletingId(id)
    try {
      await deleteCollection(id)
      setReloadKey((k) => k + 1)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-secondary">Bộ sưu tập</h1>
          <p className="mt-1 text-sm text-text-muted">
            {result ? `${result.total} bộ sưu tập` : 'Tour theo chủ đề và mùa trong năm'}
          </p>
        </div>
        <Link to={ROUTES.adminCollectionNew}>
          <Button>
            <Plus /> Tạo bộ sưu tập
          </Button>
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as CollectionStatus | '')
            setPage(1)
          }}
          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-secondary focus:border-primary focus:outline-none"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Nháp</option>
          <option value="PUBLISHED">Đã đăng</option>
        </select>
      </div>

      {loadStatus === 'loading' && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-alt" />
          ))}
        </div>
      )}

      {loadStatus === 'error' && <ErrorState description={error} onRetry={() => setReloadKey((k) => k + 1)} />}

      {loadStatus === 'success' && result.items.length === 0 && (
        <EmptyState icon={Layers} title="Chưa có bộ sưu tập nào" description="Nhấn 'Tạo bộ sưu tập' để bắt đầu." />
      )}

      {loadStatus === 'success' && result.items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border bg-surface-alt text-xs font-semibold uppercase text-text-muted">
                <tr>
                  <th className="px-4 py-3">Tên bộ sưu tập</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Hạn hiển thị</th>
                  <th className="px-4 py-3 text-right">Số tour</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="max-w-xs px-4 py-3">
                      <div className="flex gap-3">
                        <div
                          className="size-10 shrink-0 rounded-lg bg-secondary bg-cover bg-center"
                          style={{ backgroundImage: `url(${c.coverImageUrl})` }}
                        />
                        <p className="line-clamp-1 self-center font-medium text-secondary">{c.title}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={c.isActive ? 'success' : 'secondary'}>
                        {c.isActive ? 'Đang hiển thị' : STATUS_LABELS[c.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {c.startAt && `Từ ${formatDate(c.startAt)}`}
                      {c.startAt && c.endAt && ' – '}
                      {c.endAt && `Đến ${formatDate(c.endAt)}`}
                      {!c.startAt && !c.endAt && 'Vô thời hạn'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-secondary">{c.tourCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Link to={ROUTES.adminCollectionEdit(c.id)}>
                          <Button variant="outline" size="sm" aria-label="Sửa">
                            <Pencil />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label="Xoá"
                          disabled={deletingId === c.id}
                          onClick={() => handleDelete(c.id, c.title)}
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
  )
}

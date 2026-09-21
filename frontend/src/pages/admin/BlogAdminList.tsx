import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Pagination } from '@/components/common/Pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { REGION_LABELS, REGION_OPTIONS } from '@/constants/region'
import { ROUTES } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { deleteBlogPost, getAdminBlogPosts, type AdminBlogQuery } from '@/services/blog'
import type { BlogPostStatus } from '@/types/blog'
import type { Region } from '@/types/tour'

const STATUS_LABELS: Record<BlogPostStatus, string> = {
  DRAFT: 'Nháp',
  PUBLISHED: 'Đã đăng',
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(iso),
  )
}

export function BlogAdminList() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<BlogPostStatus | ''>('')
  const [region, setRegion] = useState<Region | ''>('')
  const [reloadKey, setReloadKey] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const query: AdminBlogQuery = useMemo(
    () => ({
      page,
      limit: 10,
      status: status || undefined,
      region: region || undefined,
    }),
    [page, status, region],
  )

  const { status: loadStatus, data: result, error } = useAsync(
    () => getAdminBlogPosts(query),
    [JSON.stringify(query), reloadKey],
  )

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Xoá bài viết "${title}"? Hành động này không thể hoàn tác.`)) return
    setDeletingId(id)
    try {
      await deleteBlogPost(id)
      setReloadKey((k) => k + 1)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-secondary">Bài viết cẩm nang</h1>
          <p className="mt-1 text-sm text-text-muted">
            {result ? `${result.total} bài viết` : 'Quản lý nội dung cẩm nang du lịch'}
          </p>
        </div>
        <Link to={ROUTES.adminBlogNew}>
          <Button>
            <Plus /> Tạo bài viết
          </Button>
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as BlogPostStatus | '')
            setPage(1)
          }}
          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-secondary focus:border-primary focus:outline-none"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Nháp</option>
          <option value="PUBLISHED">Đã đăng</option>
        </select>

        <select
          value={region}
          onChange={(e) => {
            setRegion(e.target.value as Region | '')
            setPage(1)
          }}
          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-secondary focus:border-primary focus:outline-none"
        >
          <option value="">Tất cả vùng miền</option>
          {REGION_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {loadStatus === 'loading' && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-alt" />
          ))}
        </div>
      )}

      {loadStatus === 'error' && (
        <ErrorState description={error} onRetry={() => setReloadKey((k) => k + 1)} />
      )}

      {loadStatus === 'success' && result.items.length === 0 && (
        <EmptyState title="Chưa có bài viết nào" description="Nhấn 'Tạo bài viết' để bắt đầu." />
      )}

      {loadStatus === 'success' && result.items.length > 0 && (
        <>
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-alt text-xs font-semibold uppercase text-text-muted">
                <tr>
                  <th className="px-4 py-3">Tiêu đề</th>
                  <th className="px-4 py-3">Vùng miền</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Ngày tạo</th>
                  <th className="px-4 py-3">Lượt xem</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((post) => (
                  <tr key={post.id} className="border-b border-border last:border-0">
                    <td className="max-w-xs px-4 py-3 font-medium text-secondary">
                      <p className="line-clamp-1">{post.title}</p>
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {post.region ? REGION_LABELS[post.region] : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={post.status === 'PUBLISHED' ? 'success' : 'secondary'}>
                        {STATUS_LABELS[post.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{formatDate(post.createdAt)}</td>
                    <td className="px-4 py-3 text-text-muted">{post.viewCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Link to={ROUTES.adminBlogEdit(post.id)}>
                          <Button variant="outline" size="sm" aria-label="Sửa">
                            <Pencil />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label="Xoá"
                          disabled={deletingId === post.id}
                          onClick={() => handleDelete(post.id, post.title)}
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

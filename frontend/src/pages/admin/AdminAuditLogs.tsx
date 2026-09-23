import { ScrollText, Search } from 'lucide-react'
import { useState } from 'react'

import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Pagination } from '@/components/common/Pagination'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { getAuditLogs } from '@/services/admin'
import { formatRelativeTime } from '@/utils/format'

const ENTITY_OPTIONS = [
  'Tour',
  'TourImage',
  'Category',
  'Departure',
  'Booking',
  'Payment',
  'Review',
  'BlogPost',
  'Collection',
  'Notification',
  'ChatConversation',
  'User',
]

const ACTION_OPTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'DELETE_PERMANENT',
  'ADD_IMAGES',
  'UPDATE_STATUS',
  'REFUND',
  'MODERATE',
  'BROADCAST',
  'ADMIN_REPLY',
  'CLOSE',
]

const selectClass =
  'h-10 rounded-lg border border-border bg-surface px-3 text-sm text-secondary focus:border-primary focus:outline-none'

export function AdminAuditLogs() {
  const [page, setPage] = useState(1)
  const [entity, setEntity] = useState('')
  const [action, setAction] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput)
  const [reloadKey, setReloadKey] = useState(0)

  const { status, data: result, error } = useAsync(
    () =>
      getAuditLogs({
        page,
        limit: 20,
        entity: entity || undefined,
        action: action || undefined,
        search: search || undefined,
      }),
    [page, entity, action, search, reloadKey],
  )

  return (
    <div className="p-4 sm:p-6">
      <h1 className="font-display text-2xl font-bold text-secondary">Nhật ký hoạt động</h1>
      <p className="mt-1 text-sm text-text-muted">
        {result ? `${result.total} bản ghi` : 'Theo dõi hành động của quản trị viên'}
      </p>

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
            placeholder="Tìm theo tên/email admin…"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <select
          value={entity}
          onChange={(e) => {
            setEntity(e.target.value)
            setPage(1)
          }}
          className={selectClass}
        >
          <option value="">Mọi đối tượng</option>
          {ENTITY_OPTIONS.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value)
            setPage(1)
          }}
          className={selectClass}
        >
          <option value="">Mọi hành động</option>
          {ACTION_OPTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        {status === 'loading' && (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-alt" />
            ))}
          </div>
        )}
        {status === 'error' && (
          <ErrorState description={error} onRetry={() => setReloadKey((k) => k + 1)} />
        )}
        {status === 'success' && result.items.length === 0 && (
          <EmptyState icon={ScrollText} title="Không có bản ghi nào phù hợp" />
        )}

        {status === 'success' && result.items.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-xl border border-border bg-surface">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-border bg-surface-alt text-xs font-semibold uppercase text-text-muted">
                  <tr>
                    <th className="px-4 py-3">Thời điểm</th>
                    <th className="px-4 py-3">Người thực hiện</th>
                    <th className="px-4 py-3">Hành động</th>
                    <th className="px-4 py-3">Đối tượng</th>
                    <th className="px-4 py-3">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((log) => (
                    <tr key={log.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-text-muted">{formatRelativeTime(log.createdAt)}</td>
                      <td className="px-4 py-3">
                        {log.user ? (
                          <>
                            <p className="font-medium text-secondary">{log.user.fullName}</p>
                            <p className="text-xs text-text-muted">{log.user.email}</p>
                          </>
                        ) : (
                          <span className="text-text-faint">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary-ink">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-secondary">{log.entity}</p>
                        <p className="font-mono text-xs text-text-muted">{log.entityId}</p>
                      </td>
                      <td className="px-4 py-3 text-text-muted">{log.ipAddress ?? '—'}</td>
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

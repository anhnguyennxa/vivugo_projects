import { Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'

import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Pagination } from '@/components/common/Pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { getAdminUsers, updateAdminUser, type AdminUsersQuery } from '@/services/admin'
import { useAuthStore } from '@/stores/auth'
import type { AdminUser } from '@/types/admin'
import { getApiErrorMessage } from '@/utils/errors'
import { formatDate } from '@/utils/format'

const selectClass =
  'h-10 rounded-lg border border-border bg-surface px-3 text-sm text-secondary focus:border-primary focus:outline-none'

export function AdminUsers() {
  const [page, setPage] = useState(1)
  const [role, setRole] = useState<'USER' | 'ADMIN' | ''>('')
  const [active, setActive] = useState<'' | 'true' | 'false'>('')
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput)
  const [reloadKey, setReloadKey] = useState(0)
  const me = useAuthStore((s) => s.user)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const query: AdminUsersQuery = useMemo(
    () => ({
      page,
      limit: 15,
      role: role || undefined,
      isActive: active === '' ? undefined : active === 'true',
      search: search || undefined,
    }),
    [page, role, active, search],
  )

  const { status, data: result, error } = useAsync(() => getAdminUsers(query), [JSON.stringify(query), reloadKey])

  async function run(id: string, input: { isActive?: boolean; role?: AdminUser['role'] }) {
    setActionError(null)
    setBusyId(id)
    try {
      await updateAdminUser(id, input)
      setReloadKey((k) => k + 1)
    } catch (err) {
      setActionError(getApiErrorMessage(err) ?? 'Không thể cập nhật người dùng')
    } finally {
      setBusyId(null)
    }
  }

  function handleLock(u: AdminUser) {
    const msg = u.isActive
      ? `Khoá tài khoản ${u.email}? Người này sẽ bị đăng xuất và không đăng nhập được nữa.`
      : `Mở khoá tài khoản ${u.email}?`
    if (window.confirm(msg)) void run(u.id, { isActive: !u.isActive })
  }

  function handleRole(u: AdminUser) {
    const next = u.role === 'ADMIN' ? 'USER' : 'ADMIN'
    const msg =
      next === 'ADMIN'
        ? `Cấp quyền quản trị cho ${u.email}? Người này sẽ truy cập được toàn bộ trang quản trị.`
        : `Hạ ${u.email} xuống khách hàng?`
    if (window.confirm(msg)) void run(u.id, { role: next })
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="font-display text-2xl font-bold text-secondary">Người dùng</h1>
      <p className="mt-1 text-sm text-text-muted">{result ? `${result.total} người dùng` : 'Danh sách người dùng'}</p>

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
            placeholder="Họ tên, email, SĐT…"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value as 'USER' | 'ADMIN' | '')
            setPage(1)
          }}
          className={selectClass}
        >
          <option value="">Mọi vai trò</option>
          <option value="USER">Khách hàng</option>
          <option value="ADMIN">Quản trị viên</option>
        </select>
        <select
          value={active}
          onChange={(e) => {
            setActive(e.target.value as '' | 'true' | 'false')
            setPage(1)
          }}
          className={selectClass}
        >
          <option value="">Mọi trạng thái</option>
          <option value="true">Đang hoạt động</option>
          <option value="false">Bị khoá</option>
        </select>
      </div>

      {actionError && <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{actionError}</p>}

      <div className="mt-4">
        {status === 'loading' && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-alt" />
            ))}
          </div>
        )}
        {status === 'error' && <ErrorState description={error} onRetry={() => setReloadKey((k) => k + 1)} />}
        {status === 'success' && result.items.length === 0 && (
          <EmptyState icon={Users} title="Không có người dùng nào phù hợp" />
        )}

        {status === 'success' && result.items.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-xl border border-border bg-surface">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="border-b border-border bg-surface-alt text-xs font-semibold uppercase text-text-muted">
                  <tr>
                    <th className="px-4 py-3">Người dùng</th>
                    <th className="px-4 py-3">SĐT</th>
                    <th className="px-4 py-3">Vai trò</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Đơn đặt</th>
                    <th className="px-4 py-3">Ngày tham gia</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-secondary">{u.fullName}</p>
                        <p className="text-xs text-text-muted">{u.email}</p>
                      </td>
                      <td className="px-4 py-3 text-text-muted">{u.phone ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={u.role === 'ADMIN' ? 'default' : 'secondary'}>
                          {u.role === 'ADMIN' ? 'Quản trị viên' : 'Khách hàng'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={u.isActive ? 'success' : 'danger'}>{u.isActive ? 'Hoạt động' : 'Bị khoá'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-secondary">{u._count.bookings}</td>
                      <td className="px-4 py-3 text-text-muted">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        {u.id === me?.id ? (
                          <p className="text-right text-xs text-text-faint">Tài khoản của bạn</p>
                        ) : (
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === u.id}
                              onClick={() => handleRole(u)}
                            >
                              {u.role === 'ADMIN' ? 'Hạ xuống khách' : 'Cấp quản trị'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === u.id}
                              onClick={() => handleLock(u)}
                              className={u.isActive ? 'text-danger hover:bg-danger-soft' : undefined}
                            >
                              {u.isActive ? 'Khoá' : 'Mở khoá'}
                            </Button>
                          </div>
                        )}
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

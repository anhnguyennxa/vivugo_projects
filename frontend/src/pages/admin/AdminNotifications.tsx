import { Megaphone, Search, X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/useAsync'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { getAdminUsers } from '@/services/admin'
import { broadcastNotification } from '@/services/notifications'
import type { AdminUser } from '@/types/admin'
import { getApiErrorMessage } from '@/utils/errors'

const EMPTY_USERS: AdminUser[] = []

export function AdminNotifications() {
  const [toAll, setToAll] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput)
  const [selected, setSelected] = useState<AdminUser[]>([])
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successCount, setSuccessCount] = useState<number | null>(null)

  const { status: searchStatus, data: searchData } = useAsync(
    () => (search.trim() ? getAdminUsers({ search, limit: 8 }) : Promise.resolve(null)),
    [search],
  )
  const searching = searchStatus === 'loading' && search.trim() !== ''
  const visibleResults = (searchData?.items ?? EMPTY_USERS).filter(
    (u) => !selected.some((s) => s.id === u.id),
  )

  function addUser(user: AdminUser) {
    setSelected((s) => [...s, user])
    setSearchInput('')
  }

  function removeUser(id: string) {
    setSelected((s) => s.filter((u) => u.id !== id))
  }

  async function handleSubmit() {
    setError(null)
    setSuccessCount(null)

    if (!toAll && selected.length === 0) {
      setError('Chọn ít nhất 1 người dùng, hoặc bật gửi cho tất cả')
      return
    }
    if (!title.trim() || !message.trim()) {
      setError('Nhập đầy đủ tiêu đề và nội dung')
      return
    }

    setSubmitting(true)
    try {
      const res = await broadcastNotification({
        toAll,
        userIds: toAll ? undefined : selected.map((u) => u.id),
        title: title.trim(),
        message: message.trim(),
      })
      setSuccessCount(res.count)
      setTitle('')
      setMessage('')
      setSelected([])
    } catch (err) {
      setError(getApiErrorMessage(err) ?? 'Không thể gửi thông báo')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="font-display text-2xl font-bold text-secondary">Thông báo</h1>
      <p className="mt-1 text-sm text-text-muted">Gửi thông báo hệ thống/khuyến mãi tới người dùng</p>

      <div className="mt-6 max-w-xl space-y-5 rounded-xl border border-border bg-surface p-5">
        <label className="flex items-center gap-2 text-sm font-medium text-secondary">
          <input
            type="checkbox"
            checked={toAll}
            onChange={(e) => {
              setToAll(e.target.checked)
              setError(null)
            }}
            className="size-4 rounded border-border"
          />
          Gửi cho tất cả người dùng
        </label>

        {!toAll && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-secondary">Người nhận</p>
            {selected.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {selected.map((u) => (
                  <span
                    key={u.id}
                    className="flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-ink"
                  >
                    {u.fullName}
                    <button type="button" onClick={() => removeUser(u.id)}>
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm theo tên hoặc email…"
                className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            {searching && <p className="mt-1.5 text-xs text-text-muted">Đang tìm…</p>}
            {visibleResults.length > 0 && (
              <div className="mt-1.5 rounded-lg border border-border">
                {visibleResults.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => addUser(u)}
                    className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-surface-alt"
                  >
                    <span className="font-medium text-secondary">{u.fullName}</span>
                    <span className="text-xs text-text-muted">{u.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-secondary">Tiêu đề</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={150}
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-secondary">Nội dung</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={1000}
            rows={4}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        {successCount !== null && (
          <p className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">
            Đã gửi thông báo tới {successCount} người dùng
          </p>
        )}

        <Button disabled={submitting} onClick={() => void handleSubmit()}>
          <Megaphone /> Gửi thông báo
        </Button>
      </div>
    </div>
  )
}

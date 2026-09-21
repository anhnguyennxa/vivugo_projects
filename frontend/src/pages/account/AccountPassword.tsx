import { type FormEvent, useState } from 'react'

import { Button } from '@/components/ui/button'
import { changePassword } from '@/services/auth'
import { getApiErrorMessage } from '@/utils/errors'
import { isStrongPassword } from '@/utils/validation'

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:border-primary focus:outline-none'

export function AccountPassword() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setDone(false)

    if (!current) return setError('Vui lòng nhập mật khẩu hiện tại')
    if (!isStrongPassword(next)) {
      return setError('Mật khẩu mới tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt')
    }
    if (next !== confirm) return setError('Xác nhận mật khẩu không khớp')

    setSaving(true)
    try {
      await changePassword(current, next)
      setDone(true)
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch (err) {
      setError(getApiErrorMessage(err) ?? 'Không thể đổi mật khẩu')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4 rounded-2xl border border-border bg-surface p-5">
      <h2 className="font-display text-lg font-bold text-secondary">Đổi mật khẩu</h2>
      {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      {done && <p className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">Đổi mật khẩu thành công</p>}

      <div>
        <label className="mb-1 block text-sm font-medium text-secondary">Mật khẩu hiện tại</label>
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className={inputClass}
          autoComplete="current-password"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-secondary">Mật khẩu mới</label>
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className={inputClass}
          autoComplete="new-password"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-secondary">Nhập lại mật khẩu mới</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
          autoComplete="new-password"
        />
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? 'Đang lưu…' : 'Đổi mật khẩu'}
      </Button>
    </form>
  )
}

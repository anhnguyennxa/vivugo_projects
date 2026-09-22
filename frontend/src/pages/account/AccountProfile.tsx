import { User as UserIcon } from 'lucide-react'
import { type FormEvent, useState } from 'react'

import { ImageUploadButton } from '@/components/common/ImageUploadButton'
import { Button } from '@/components/ui/button'
import { updateProfile } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'
import { getApiErrorMessage } from '@/utils/errors'

export function AccountProfile() {
  const user = useAuthStore((s) => s.user)!
  const [fullName, setFullName] = useState(user.fullName)
  const [phone, setPhone] = useState(user.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  async function handleAvatarUploaded([url]: string[]) {
    setAvatarError(null)
    try {
      const updated = await updateProfile({ avatarUrl: url })
      useAuthStore.getState().updateUser(updated)
    } catch (err) {
      setAvatarError(getApiErrorMessage(err) ?? 'Không thể cập nhật ảnh đại diện')
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    if (fullName.trim().length < 2) return setError('Họ tên tối thiểu 2 ký tự')
    if (phone && !/^(0|\+84)\d{9,10}$/.test(phone)) return setError('Số điện thoại không hợp lệ')

    setSaving(true)
    try {
      const updated = await updateProfile({ fullName: fullName.trim(), phone })
      useAuthStore.getState().updateUser(updated)
      setSaved(true)
    } catch (err) {
      setError(getApiErrorMessage(err) ?? 'Không thể cập nhật hồ sơ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4 rounded-2xl border border-border bg-surface p-5">
      <h2 className="font-display text-lg font-bold text-secondary">Thông tin cá nhân</h2>
      {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      {saved && <p className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">Đã lưu thay đổi</p>}

      <div>
        <label className="mb-1 block text-sm font-medium text-secondary">Ảnh đại diện</label>
        {avatarError && <p className="mb-1.5 text-xs text-danger">{avatarError}</p>}
        <div className="flex items-center gap-3">
          {user.avatarUrl ? (
            <div
              className="size-14 shrink-0 rounded-full bg-secondary bg-cover bg-center"
              style={{ backgroundImage: `url(${user.avatarUrl})` }}
            />
          ) : (
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-surface-alt text-text-faint">
              <UserIcon className="size-6" />
            </div>
          )}
          <ImageUploadButton label="Đổi ảnh đại diện" onUploaded={handleAvatarUploaded} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-secondary">Email</label>
        <input
          value={user.email}
          disabled
          className="h-10 w-full rounded-lg border border-border bg-surface-alt px-3 text-sm text-text-muted"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-secondary">Họ và tên</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:border-primary focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-secondary">Số điện thoại</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0912345678"
          className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:border-primary focus:outline-none"
        />
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
      </Button>
    </form>
  )
}

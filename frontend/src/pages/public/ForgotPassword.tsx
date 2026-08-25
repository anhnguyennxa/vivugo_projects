import { Compass, MailCheck, Send } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants/routes'
import * as authService from '@/services/auth'
import { getApiErrorMessage } from '@/utils/errors'
import { isValidEmail } from '@/utils/validation'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!isValidEmail(email)) {
      setError('Email không đúng định dạng')
      return
    }

    setSubmitting(true)
    try {
      await authService.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(getApiErrorMessage(err) ?? 'Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-3 flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-primary to-blue-400 text-white">
            <Compass className="size-5" strokeWidth={2.2} />
          </span>
          <h1 className="font-display text-xl font-bold text-secondary">Quên mật khẩu</h1>
          <p className="mt-1 text-sm text-text-muted">
            Nhập email đã đăng ký, VivuGo sẽ gửi liên kết đặt lại mật khẩu
          </p>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-success-soft bg-success-soft/40 p-6 text-center">
            <MailCheck className="size-8 text-success" strokeWidth={1.5} />
            <p className="text-sm text-secondary">
              Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi tới{' '}
              <span className="font-semibold">{email}</span>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
            {error && (
              <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
            )}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-secondary">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:border-primary focus:outline-none"
                placeholder="ban@email.com"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              <Send /> {submitting ? 'Đang gửi…' : 'Gửi liên kết đặt lại'}
            </Button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-text-muted">
          Nhớ mật khẩu rồi?{' '}
          <Link to={ROUTES.login} className="font-semibold text-primary hover:underline">
            Quay lại đăng nhập
          </Link>
        </p>
      </div>
    </div>
  )
}

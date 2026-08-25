import { Check, Compass, Eye, EyeOff, KeyRound, X } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'
import * as authService from '@/services/auth'
import { getApiErrorMessage } from '@/utils/errors'
import { isStrongPassword, passwordRules } from '@/utils/validation'

const RULE_LABELS: { key: keyof ReturnType<typeof passwordRules>; label: string }[] = [
  { key: 'minLength', label: 'Tối thiểu 8 ký tự' },
  { key: 'hasUpper', label: 'Có chữ hoa' },
  { key: 'hasLower', label: 'Có chữ thường' },
  { key: 'hasNumber', label: 'Có số' },
  { key: 'hasSymbol', label: 'Có ký tự đặc biệt' },
]

export function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const rules = passwordRules(password)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError('Liên kết đặt lại mật khẩu không hợp lệ')
      return
    }
    if (!isStrongPassword(password)) {
      setError('Mật khẩu chưa đáp ứng đủ yêu cầu bên dưới')
      return
    }

    setSubmitting(true)
    try {
      await authService.resetPassword(token, password)
      setDone(true)
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
          <h1 className="font-display text-xl font-bold text-secondary">Đặt lại mật khẩu</h1>
          <p className="mt-1 text-sm text-text-muted">Tạo mật khẩu mới cho tài khoản của bạn</p>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-success-soft bg-success-soft/40 p-6 text-center">
            <KeyRound className="size-8 text-success" strokeWidth={1.5} />
            <p className="text-sm text-secondary">Đặt lại mật khẩu thành công.</p>
            <Link to={ROUTES.login}>
              <Button size="sm">Đăng nhập ngay</Button>
            </Link>
          </div>
        ) : !token ? (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-center text-sm text-danger">
            Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại từ trang{' '}
            <Link to={ROUTES.forgotPassword} className="font-semibold underline">
              Quên mật khẩu
            </Link>
            .
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
            {error && (
              <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
            )}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-secondary">
                Mật khẩu mới
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-surface px-3 pr-10 text-sm focus:border-primary focus:outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-muted"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                {RULE_LABELS.map(({ key, label }) => (
                  <li
                    key={key}
                    className={cn(
                      'flex items-center gap-1 text-[11.5px]',
                      rules[key] ? 'text-success' : 'text-text-faint',
                    )}
                  >
                    {rules[key] ? <Check className="size-3" /> : <X className="size-3" />}
                    {label}
                  </li>
                ))}
              </ul>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Đang xử lý…' : 'Đặt lại mật khẩu'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

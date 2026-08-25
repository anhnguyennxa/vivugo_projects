import { Check, Compass, Eye, EyeOff, UserPlus, X } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'
import * as authService from '@/services/auth'
import { useAuthStore } from '@/stores/auth'
import { getApiErrorMessage } from '@/utils/errors'
import { isStrongPassword, isValidEmail, passwordRules } from '@/utils/validation'

const RULE_LABELS: { key: keyof ReturnType<typeof passwordRules>; label: string }[] = [
  { key: 'minLength', label: 'Tối thiểu 8 ký tự' },
  { key: 'hasUpper', label: 'Có chữ hoa' },
  { key: 'hasLower', label: 'Có chữ thường' },
  { key: 'hasNumber', label: 'Có số' },
  { key: 'hasSymbol', label: 'Có ký tự đặc biệt' },
]

export function Register() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)

  const rules = passwordRules(password)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (fullName.trim().length < 2) {
      setError('Họ tên tối thiểu 2 ký tự')
      return
    }
    if (!isValidEmail(email)) {
      setError('Email không đúng định dạng')
      return
    }
    if (!isStrongPassword(password)) {
      setError('Mật khẩu chưa đáp ứng đủ yêu cầu bên dưới')
      return
    }

    setSubmitting(true)
    try {
      const { user, accessToken } = await authService.register({
        email,
        password,
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
      })
      useAuthStore.getState().setSession(user, accessToken)
      navigate(ROUTES.home)
    } catch (err) {
      setError(getApiErrorMessage(err) ?? 'Đăng ký thất bại, vui lòng thử lại')
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
          <h1 className="font-display text-xl font-bold text-secondary">Tạo tài khoản VivuGo</h1>
          <p className="mt-1 text-sm text-text-muted">Đặt tour dễ dàng, theo dõi mọi chuyến đi</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          {error && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
          )}

          <div>
            <label htmlFor="fullName" className="mb-1.5 block text-xs font-semibold text-secondary">
              Họ và tên
            </label>
            <input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:border-primary focus:outline-none"
              placeholder="Nguyễn Văn A"
            />
          </div>

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

          <div>
            <label htmlFor="phone" className="mb-1.5 block text-xs font-semibold text-secondary">
              Số điện thoại <span className="font-normal text-text-faint">(không bắt buộc)</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:border-primary focus:outline-none"
              placeholder="0912345678"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-secondary">
              Mật khẩu
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onFocus={() => setPasswordTouched(true)}
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

            {passwordTouched && (
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
            )}
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            <UserPlus /> {submitting ? 'Đang tạo tài khoản…' : 'Đăng ký'}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-text-muted">
          Đã có tài khoản?{' '}
          <Link to={ROUTES.login} className="font-semibold text-primary hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  )
}

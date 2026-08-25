import { Compass, Eye, EyeOff, LogIn } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants/routes'
import * as authService from '@/services/auth'
import { useAuthStore } from '@/stores/auth'
import { getApiErrorMessage } from '@/utils/errors'
import { isValidEmail } from '@/utils/validation'

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!isValidEmail(email)) {
      setError('Email không đúng định dạng')
      return
    }
    if (password.length === 0) {
      setError('Vui lòng nhập mật khẩu')
      return
    }

    setSubmitting(true)
    try {
      const { user, accessToken } = await authService.login({ email, password })
      useAuthStore.getState().setSession(user, accessToken)
      navigate(ROUTES.home)
    } catch (err) {
      setError(getApiErrorMessage(err) ?? 'Đăng nhập thất bại, vui lòng thử lại')
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
          <h1 className="font-display text-xl font-bold text-secondary">Đăng nhập VivuGo</h1>
          <p className="mt-1 text-sm text-text-muted">Tiếp tục hành trình khám phá của bạn</p>
        </div>

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

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="block text-xs font-semibold text-secondary">
                Mật khẩu
              </label>
              <Link to={ROUTES.forgotPassword} className="text-xs font-medium text-primary hover:underline">
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
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
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            <LogIn /> {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-text-muted">
          Chưa có tài khoản?{' '}
          <Link to={ROUTES.register} className="font-semibold text-primary hover:underline">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  )
}

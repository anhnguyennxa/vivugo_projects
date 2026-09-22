import { KeyRound, Ticket, User as UserIcon } from 'lucide-react'
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'

import { Skeleton } from '@/components/ui/skeleton'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'

const TABS = [
  { label: 'Hồ sơ', to: ROUTES.accountProfile, icon: UserIcon },
  { label: 'Đơn đặt tour', to: ROUTES.accountBookings, icon: Ticket },
  { label: 'Đổi mật khẩu', to: ROUTES.accountPassword, icon: KeyRound },
]

export function AccountLayout() {
  const user = useAuthStore((s) => s.user)
  const isHydrating = useAuthStore((s) => s.isHydrating)
  const location = useLocation()

  if (isHydrating) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to={`${ROUTES.login}?next=${location.pathname}`} replace />
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        {user.avatarUrl ? (
          <div
            className="size-12 shrink-0 rounded-full bg-secondary bg-cover bg-center"
            style={{ backgroundImage: `url(${user.avatarUrl})` }}
          />
        ) : (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-alt text-text-faint">
            <UserIcon className="size-5" />
          </div>
        )}
        <div>
          <h1 className="font-display text-2xl font-bold text-secondary">Tài khoản của tôi</h1>
          <p className="mt-1 text-sm text-text-muted">{user.fullName} · {user.email}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-soft text-primary-ink'
                    : 'text-text-muted hover:bg-surface-alt hover:text-secondary',
                )
              }
            >
              <tab.icon className="size-4" /> {tab.label}
            </NavLink>
          ))}
        </nav>
        <section className="min-w-0">
          <Outlet />
        </section>
      </div>
    </div>
  )
}

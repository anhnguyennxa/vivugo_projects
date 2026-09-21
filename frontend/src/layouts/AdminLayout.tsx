import { Compass, LayoutDashboard } from 'lucide-react'
import { Link, Navigate, Outlet } from 'react-router-dom'

import { APP_NAME } from '@/constants/config'
import { ROUTES } from '@/constants/routes'
import { useAuthStore } from '@/stores/auth'

export function AdminLayout() {
  const user = useAuthStore((s) => s.user)
  const isHydrating = useAuthStore((s) => s.isHydrating)

  if (isHydrating) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-text-muted">Đang tải…</div>
  }

  if (!user || user.role !== 'ADMIN') {
    return <Navigate to={`${ROUTES.login}?next=${ROUTES.adminBlog}`} replace />
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <span className="flex size-7 items-center justify-center rounded-lg bg-secondary text-white">
            <LayoutDashboard className="size-3.5" />
          </span>
          <span className="font-display text-sm font-bold text-secondary">
            {APP_NAME} · Quản trị Cẩm nang
          </span>
          <Link
            to={ROUTES.home}
            className="ml-auto flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-secondary"
          >
            <Compass className="size-3.5" /> Về trang chủ
          </Link>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}

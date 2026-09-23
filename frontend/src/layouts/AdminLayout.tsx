import { Bell, BookOpen, Compass, LayoutDashboard, Layers, MessageCircle, MessageSquare, Route, ScrollText, Tags, Ticket, Users } from 'lucide-react'
import { useEffect } from 'react'
import { Link, Navigate, NavLink, Outlet } from 'react-router-dom'

import { APP_NAME } from '@/constants/config'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'
import { useAdminChatStore } from '@/stores/adminChat'
import { useAuthStore } from '@/stores/auth'

const MENU = [
  { label: 'Tổng quan', to: ROUTES.admin, icon: LayoutDashboard, end: true },
  { label: 'Đơn đặt tour', to: ROUTES.adminBookings, icon: Ticket, end: false },
  { label: 'Tour', to: ROUTES.adminTours, icon: Route, end: false },
  { label: 'Danh mục', to: ROUTES.adminCategories, icon: Tags, end: false },
  { label: 'Đánh giá', to: ROUTES.adminReviews, icon: MessageSquare, end: false },
  { label: 'Người dùng', to: ROUTES.adminUsers, icon: Users, end: false },
  { label: 'Thông báo', to: ROUTES.adminNotifications, icon: Bell, end: false },
  { label: 'Chat hỗ trợ', to: ROUTES.adminChat, icon: MessageCircle, end: false },
  { label: 'Cẩm nang', to: ROUTES.adminBlog, icon: BookOpen, end: false },
  { label: 'Bộ sưu tập', to: ROUTES.adminCollections, icon: Layers, end: false },
  { label: 'Nhật ký hoạt động', to: ROUTES.adminAuditLogs, icon: ScrollText, end: false },
]

export function AdminLayout() {
  const user = useAuthStore((s) => s.user)
  const isHydrating = useAuthStore((s) => s.isHydrating)
  const chatUnreadCount = useAdminChatStore((s) => s.unreadCount)

  useEffect(() => {
    if (user?.role === 'ADMIN') void useAdminChatStore.getState().refresh()
  }, [user?.role])

  if (isHydrating) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-text-muted">Đang tải…</div>
  }

  if (!user || user.role !== 'ADMIN') {
    return <Navigate to={`${ROUTES.login}?next=${ROUTES.admin}`} replace />
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <span className="flex size-7 items-center justify-center rounded-lg bg-secondary text-white">
            <LayoutDashboard className="size-3.5" />
          </span>
          <span className="font-display text-sm font-bold text-secondary">{APP_NAME} · Quản trị</span>
          <Link
            to={ROUTES.home}
            className="ml-auto flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-secondary"
          >
            <Compass className="size-3.5" /> Về trang chủ
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col md:flex-row">
        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-border p-3 md:w-52 md:flex-col md:border-b-0 md:border-r md:p-4">
          {MENU.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-soft text-primary-ink'
                    : 'text-text-muted hover:bg-surface-alt hover:text-secondary',
                )
              }
            >
              <item.icon className="size-4" /> {item.label}
              {item.to === ROUTES.adminChat && chatUnreadCount > 0 && (
                <span className="ml-auto flex size-4.5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                  {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

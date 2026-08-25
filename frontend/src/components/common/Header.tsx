import { Bell, Compass, LogOut, Menu, Search, ShoppingCart, User as UserIcon, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants/routes'
import { APP_NAME } from '@/constants/config'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'

const NAV_LINKS = [
  { label: 'Tour', href: ROUTES.tours },
  { label: 'Danh mục', href: ROUTES.tours },
  { label: 'Về chúng tôi', href: ROUTES.about },
]

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const user = useAuthStore((s) => s.user)
  const itemCount = useCartStore((s) => s.itemCount)
  const navigate = useNavigate()

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function handleLogout() {
    setMenuOpen(false)
    await useAuthStore.getState().logout()
    navigate(ROUTES.home)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link to={ROUTES.home} className="flex shrink-0 items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-primary to-blue-400 text-white">
            <Compass className="size-4.5" strokeWidth={2.2} />
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight text-secondary">
            {APP_NAME}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="text-sm font-medium text-text-muted transition-colors hover:text-secondary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="relative ml-auto hidden max-w-xs flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
          <input
            type="search"
            placeholder="Tìm tour, điểm đến…"
            className="h-9 w-full rounded-lg border border-border bg-surface-alt pl-9 pr-3 text-sm text-secondary placeholder:text-text-faint focus:border-primary focus:outline-none"
          />
        </div>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Link to={ROUTES.cart} className="relative">
            <Button variant="ghost" size="icon" aria-label="Giỏ hàng">
              <ShoppingCart />
            </Button>
            {itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>

          {user ? (
            <>
              <Button variant="ghost" size="icon" aria-label="Thông báo" className="hidden sm:inline-flex">
                <Bell />
              </Button>
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Tài khoản"
                  className="flex size-8 items-center justify-center rounded-full bg-linear-to-br from-accent to-amber-400 text-xs font-bold text-white"
                >
                  {user.fullName.charAt(0).toUpperCase()}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-11 w-48 rounded-xl border border-border bg-surface p-1.5 shadow-md">
                    <p className="truncate px-2.5 py-1.5 text-xs text-text-muted">{user.email}</p>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-danger hover:bg-danger-soft"
                    >
                      <LogOut className="size-4" /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link to={ROUTES.login} className="hidden sm:block">
              <Button size="sm">
                <UserIcon /> Đăng nhập
              </Button>
            </Link>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border px-4 py-3 md:hidden">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
            <input
              type="search"
              placeholder="Tìm tour, điểm đến…"
              className="h-9 w-full rounded-lg border border-border bg-surface-alt pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="rounded-lg px-2 py-2 text-sm font-medium text-text-muted hover:bg-surface-alt hover:text-secondary"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {!user && (
              <Link
                to={ROUTES.login}
                className="mt-1 rounded-lg bg-primary px-2 py-2 text-center text-sm font-semibold text-white"
                onClick={() => setMobileOpen(false)}
              >
                Đăng nhập
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

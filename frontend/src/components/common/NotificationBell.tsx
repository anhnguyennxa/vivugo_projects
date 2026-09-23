import { Bell, Ticket, CreditCard, MessageSquare, Megaphone, CheckCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants/routes'
import { useChatStore } from '@/stores/chat'
import { useNotificationsStore } from '@/stores/notifications'
import type { AppNotification, NotificationType } from '@/types/notification'
import { formatRelativeTime } from '@/utils/format'

const TYPE_ICON: Record<NotificationType, typeof Ticket> = {
  BOOKING_UPDATE: Ticket,
  PAYMENT: CreditCard,
  CHAT: MessageSquare,
  SYSTEM: Megaphone,
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const items = useNotificationsStore((s) => s.items)
  const unreadCount = useNotificationsStore((s) => s.unreadCount)
  const markAsRead = useNotificationsStore((s) => s.markAsRead)
  const markAllAsRead = useNotificationsStore((s) => s.markAllAsRead)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function handleClickItem(notification: AppNotification) {
    void markAsRead(notification.id)
    setOpen(false)
    if (notification.type === 'CHAT') {
      void useChatStore.getState().openPanel()
      return
    }
    if (notification.data?.bookingCode) {
      navigate(ROUTES.accountBookingDetail(notification.data.bookingCode))
    }
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Thông báo"
        className="relative hidden sm:inline-flex"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-11 w-80 rounded-xl border border-border bg-surface shadow-md">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <p className="text-sm font-semibold text-secondary">Thông báo</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllAsRead()}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <CheckCheck className="size-3.5" /> Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-text-muted">Chưa có thông báo nào</p>
            )}
            {items.map((n) => {
              const Icon = TYPE_ICON[n.type]
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClickItem(n)}
                  className={`flex w-full gap-2.5 border-b border-border px-3 py-2.5 text-left last:border-0 hover:bg-surface-alt ${
                    n.isRead ? '' : 'bg-primary-soft/40'
                  }`}
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-alt text-secondary">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-secondary">{n.title}</span>
                    <span className="block line-clamp-2 text-xs text-text-muted">{n.message}</span>
                    <span className="mt-0.5 block text-[11px] text-text-faint">
                      {formatRelativeTime(n.createdAt)}
                    </span>
                  </span>
                  {!n.isRead && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

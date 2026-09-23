import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'

import { ChatWidget } from '@/components/common/ChatWidget'
import { connectSocket, disconnectSocket } from '@/lib/socket'
import { router } from '@/routes'
import { getCart } from '@/services/cart'
import { useAdminChatStore } from '@/stores/adminChat'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useChatStore } from '@/stores/chat'
import { useFavoritesStore } from '@/stores/favorites'
import { useNotificationsStore } from '@/stores/notifications'
import type { ChatMessageEvent } from '@/types/chat'
import type { AppNotification } from '@/types/notification'

export function App() {
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    void useAuthStore.getState().refreshAccessToken()

    const unsubscribe = useAuthStore.subscribe((state, prevState) => {
      if (state.user && !prevState.user) {
        getCart()
          .then((items) => useCartStore.getState().setItemCount(items.length))
          .catch(() => {
            // giỏ hàng sẽ hiển thị badge 0 nếu chưa tải được — không chặn trải nghiệm
          })
        void useFavoritesStore.getState().load()

        void useNotificationsStore.getState().fetchInitial()
        const isAdmin = state.user.role === 'ADMIN'
        if (isAdmin) {
          void useAdminChatStore.getState().refresh()
        } else {
          void useChatStore.getState().fetchUnreadCount()
        }

        if (state.accessToken) {
          const socket = connectSocket(state.accessToken)
          socket.on('notification:new', (notification: AppNotification) => {
            useNotificationsStore.getState().receiveNew(notification)
          })
          socket.on('chat:message', (event: ChatMessageEvent) => {
            if (isAdmin) {
              void useAdminChatStore.getState().refresh()
            } else {
              useChatStore.getState().receiveMessage(event)
            }
          })
        }
      }
      if (!state.user && prevState.user) {
        useCartStore.getState().setItemCount(0)
        useFavoritesStore.getState().reset()
        useNotificationsStore.getState().reset()
        useChatStore.getState().reset()
        useAdminChatStore.getState().reset()
        disconnectSocket()
      }
    })

    return unsubscribe
  }, [])

  return (
    <>
      <RouterProvider router={router} />
      {user && user.role === 'USER' && <ChatWidget />}
    </>
  )
}

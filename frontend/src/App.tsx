import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'

import { connectSocket, disconnectSocket } from '@/lib/socket'
import { router } from '@/routes'
import { getCart } from '@/services/cart'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useFavoritesStore } from '@/stores/favorites'
import { useNotificationsStore } from '@/stores/notifications'
import type { AppNotification } from '@/types/notification'

export function App() {
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
        if (state.accessToken) {
          const socket = connectSocket(state.accessToken)
          socket.on('notification:new', (notification: AppNotification) => {
            useNotificationsStore.getState().receiveNew(notification)
          })
        }
      }
      if (!state.user && prevState.user) {
        useCartStore.getState().setItemCount(0)
        useFavoritesStore.getState().reset()
        useNotificationsStore.getState().reset()
        disconnectSocket()
      }
    })

    return unsubscribe
  }, [])

  return <RouterProvider router={router} />
}

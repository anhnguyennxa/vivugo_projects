import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'

import { router } from '@/routes'
import { getCart } from '@/services/cart'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useFavoritesStore } from '@/stores/favorites'

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
      }
      if (!state.user && prevState.user) {
        useCartStore.getState().setItemCount(0)
        useFavoritesStore.getState().reset()
      }
    })

    return unsubscribe
  }, [])

  return <RouterProvider router={router} />
}

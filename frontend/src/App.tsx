import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'

import { router } from '@/routes'
import { useAuthStore } from '@/stores/auth'

export function App() {
  useEffect(() => {
    void useAuthStore.getState().refreshAccessToken()
  }, [])

  return <RouterProvider router={router} />
}

import { createBrowserRouter } from 'react-router-dom'

import { PublicLayout } from '@/layouts/PublicLayout'
import { CategoryRedirect } from '@/pages/public/CategoryRedirect'
import { ForgotPassword } from '@/pages/public/ForgotPassword'
import { Home } from '@/pages/public/Home'
import { Login } from '@/pages/public/Login'
import { NotFound } from '@/pages/public/NotFound'
import { Register } from '@/pages/public/Register'
import { ResetPassword } from '@/pages/public/ResetPassword'
import { TourDetail } from '@/pages/public/TourDetail'
import { Tours } from '@/pages/public/Tours'

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/tours', element: <Tours /> },
      { path: '/tours/:slug', element: <TourDetail /> },
      { path: '/categories/:slug', element: <CategoryRedirect /> },
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
      { path: '/forgot-password', element: <ForgotPassword /> },
      { path: '/reset-password', element: <ResetPassword /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

import { createBrowserRouter } from 'react-router-dom'

import { AdminLayout } from '@/layouts/AdminLayout'
import { PublicLayout } from '@/layouts/PublicLayout'
import { BlogAdminForm } from '@/pages/admin/BlogAdminForm'
import { BlogAdminList } from '@/pages/admin/BlogAdminList'
import { Blog } from '@/pages/public/Blog'
import { BlogDetail } from '@/pages/public/BlogDetail'
import { Cart } from '@/pages/public/Cart'
import { CategoryRedirect } from '@/pages/public/CategoryRedirect'
import { Checkout } from '@/pages/public/Checkout'
import { CheckoutResult } from '@/pages/public/CheckoutResult'
import { Favorites } from '@/pages/public/Favorites'
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
      { path: '/cam-nang', element: <Blog /> },
      { path: '/cam-nang/:slug', element: <BlogDetail /> },
      { path: '/favorites', element: <Favorites /> },
      { path: '/cart', element: <Cart /> },
      { path: '/checkout', element: <Checkout /> },
      { path: '/checkout/result', element: <CheckoutResult /> },
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
      { path: '/forgot-password', element: <ForgotPassword /> },
      { path: '/reset-password', element: <ResetPassword /> },
      { path: '*', element: <NotFound /> },
    ],
  },
  {
    element: <AdminLayout />,
    children: [
      { path: '/admin/blog', element: <BlogAdminList /> },
      { path: '/admin/blog/new', element: <BlogAdminForm /> },
      { path: '/admin/blog/:id', element: <BlogAdminForm /> },
    ],
  },
])

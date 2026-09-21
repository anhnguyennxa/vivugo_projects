import { createBrowserRouter, Navigate } from 'react-router-dom'

import { AdminLayout } from '@/layouts/AdminLayout'
import { AccountLayout } from '@/layouts/AccountLayout'
import { PublicLayout } from '@/layouts/PublicLayout'
import { AccountBookingDetail } from '@/pages/account/AccountBookingDetail'
import { AccountBookings } from '@/pages/account/AccountBookings'
import { AccountPassword } from '@/pages/account/AccountPassword'
import { AccountProfile } from '@/pages/account/AccountProfile'
import { AdminBookings } from '@/pages/admin/AdminBookings'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { BlogAdminForm } from '@/pages/admin/BlogAdminForm'
import { BlogAdminList } from '@/pages/admin/BlogAdminList'
import { Blog } from '@/pages/public/Blog'
import { BlogDetail } from '@/pages/public/BlogDetail'
import { Cart } from '@/pages/public/Cart'
import { CategoryRedirect } from '@/pages/public/CategoryRedirect'
import { Contact } from '@/pages/public/Contact'
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
      { path: '/contact', element: <Contact /> },
      {
        path: '/account',
        element: <AccountLayout />,
        children: [
          { index: true, element: <Navigate to="profile" replace /> },
          { path: 'profile', element: <AccountProfile /> },
          { path: 'bookings', element: <AccountBookings /> },
          { path: 'bookings/:code', element: <AccountBookingDetail /> },
          { path: 'password', element: <AccountPassword /> },
        ],
      },
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
      { path: '/admin', element: <AdminDashboard /> },
      { path: '/admin/bookings', element: <AdminBookings /> },
      { path: '/admin/blog', element: <BlogAdminList /> },
      { path: '/admin/blog/new', element: <BlogAdminForm /> },
      { path: '/admin/blog/:id', element: <BlogAdminForm /> },
    ],
  },
])

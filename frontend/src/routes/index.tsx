import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'

import { AdminLayout } from '@/layouts/AdminLayout'
import { AccountLayout } from '@/layouts/AccountLayout'
import { PublicLayout } from '@/layouts/PublicLayout'
import { AccountBookingDetail } from '@/pages/account/AccountBookingDetail'
import { AccountBookings } from '@/pages/account/AccountBookings'
import { AccountPassword } from '@/pages/account/AccountPassword'
import { AccountProfile } from '@/pages/account/AccountProfile'
import { Blog } from '@/pages/public/Blog'
import { BlogDetail } from '@/pages/public/BlogDetail'
import { Cart } from '@/pages/public/Cart'
import { CategoryRedirect } from '@/pages/public/CategoryRedirect'
import { CollectionDetail } from '@/pages/public/CollectionDetail'
import { Collections } from '@/pages/public/Collections'
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

// Trang Admin lazy-load để khách vãng lai không phải tải chung 1 bundle với
// công cụ quản trị (chỉ admin mới vào các route này).
const AdminAuditLogs = lazy(() =>
  import('@/pages/admin/AdminAuditLogs').then((m) => ({ default: m.AdminAuditLogs })),
)
const AdminBookings = lazy(() =>
  import('@/pages/admin/AdminBookings').then((m) => ({ default: m.AdminBookings })),
)
const AdminCategories = lazy(() =>
  import('@/pages/admin/AdminCategories').then((m) => ({ default: m.AdminCategories })),
)
const AdminChat = lazy(() => import('@/pages/admin/AdminChat').then((m) => ({ default: m.AdminChat })))
const AdminDashboard = lazy(() =>
  import('@/pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })),
)
const AdminNotifications = lazy(() =>
  import('@/pages/admin/AdminNotifications').then((m) => ({ default: m.AdminNotifications })),
)
const AdminTourForm = lazy(() =>
  import('@/pages/admin/AdminTourForm').then((m) => ({ default: m.AdminTourForm })),
)
const AdminReviews = lazy(() =>
  import('@/pages/admin/AdminReviews').then((m) => ({ default: m.AdminReviews })),
)
const AdminTours = lazy(() => import('@/pages/admin/AdminTours').then((m) => ({ default: m.AdminTours })))
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers').then((m) => ({ default: m.AdminUsers })))
const BlogAdminForm = lazy(() =>
  import('@/pages/admin/BlogAdminForm').then((m) => ({ default: m.BlogAdminForm })),
)
const BlogAdminList = lazy(() =>
  import('@/pages/admin/BlogAdminList').then((m) => ({ default: m.BlogAdminList })),
)
const CollectionAdminForm = lazy(() =>
  import('@/pages/admin/CollectionAdminForm').then((m) => ({ default: m.CollectionAdminForm })),
)
const CollectionAdminList = lazy(() =>
  import('@/pages/admin/CollectionAdminList').then((m) => ({ default: m.CollectionAdminList })),
)

function AdminPageFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-sm text-text-muted">Đang tải…</div>
  )
}

function withAdminSuspense(element: ReactNode) {
  return <Suspense fallback={<AdminPageFallback />}>{element}</Suspense>
}

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
      { path: '/bo-suu-tap', element: <Collections /> },
      { path: '/bo-suu-tap/:slug', element: <CollectionDetail /> },
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
      { path: '/admin', element: withAdminSuspense(<AdminDashboard />) },
      { path: '/admin/bookings', element: withAdminSuspense(<AdminBookings />) },
      { path: '/admin/tours', element: withAdminSuspense(<AdminTours />) },
      { path: '/admin/tours/new', element: withAdminSuspense(<AdminTourForm />) },
      { path: '/admin/tours/:id', element: withAdminSuspense(<AdminTourForm />) },
      { path: '/admin/categories', element: withAdminSuspense(<AdminCategories />) },
      { path: '/admin/reviews', element: withAdminSuspense(<AdminReviews />) },
      { path: '/admin/users', element: withAdminSuspense(<AdminUsers />) },
      { path: '/admin/notifications', element: withAdminSuspense(<AdminNotifications />) },
      { path: '/admin/chat', element: withAdminSuspense(<AdminChat />) },
      { path: '/admin/audit-logs', element: withAdminSuspense(<AdminAuditLogs />) },
      { path: '/admin/blog', element: withAdminSuspense(<BlogAdminList />) },
      { path: '/admin/blog/new', element: withAdminSuspense(<BlogAdminForm />) },
      { path: '/admin/blog/:id', element: withAdminSuspense(<BlogAdminForm />) },
      { path: '/admin/collections', element: withAdminSuspense(<CollectionAdminList />) },
      { path: '/admin/collections/new', element: withAdminSuspense(<CollectionAdminForm />) },
      { path: '/admin/collections/:id', element: withAdminSuspense(<CollectionAdminForm />) },
    ],
  },
])

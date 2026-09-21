import type { BookingPaymentStatus, BookingStatus } from './booking'

export interface AdminBooking {
  id: string
  bookingCode: string
  numAdults: number
  numChildren: number
  totalPrice: number
  status: BookingStatus
  paymentStatus: BookingPaymentStatus
  contactName: string
  contactPhone: string
  contactEmail: string
  note: string | null
  createdAt: string
  tour: { id: string; title: string; slug: string; thumbnailUrl: string }
  departure: { id: string; departureDate: string; returnDate: string }
  user: { id: string; fullName: string; email: string }
  payment: { provider: string; status: string; paidAt: string | null } | null
}

export interface AdminStats {
  totalRevenue: number
  totalBookings: number
  bookingsByStatus: Record<BookingStatus, number>
  userCount: number
  publishedTourCount: number
  pendingReviewCount: number
  revenueByMonth: { month: string; revenue: number }[]
  topTours: { id: string; title: string; slug: string; bookings: number; revenue: number }[]
  recentBookings: AdminBooking[]
}

import type { DepartureCity, ItineraryDay, Region, TourImage } from './tour'
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

export type TourStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export interface AdminTour {
  id: string
  title: string
  slug: string
  location: string
  region: Region
  departureCity: DepartureCity
  basePrice: number
  discountPrice: number | null
  promoStartAt: string | null
  promoEndAt: string | null
  thumbnailUrl: string
  status: TourStatus
  isFeatured: boolean
  category: { id: string; name: string }
  _count: { departures: number; bookings: number }
}

export interface AdminTourDetail {
  id: string
  title: string
  slug: string
  categoryId: string
  summary: string | null
  description: string
  itinerary: ItineraryDay[]
  location: string
  region: Region
  departureCity: DepartureCity
  durationDays: number
  durationNights: number
  basePrice: number
  discountPrice: number | null
  promoStartAt: string | null
  promoEndAt: string | null
  minGuests: number
  maxGuests: number
  thumbnailUrl: string
  status: TourStatus
  isFeatured: boolean
  images: TourImage[]
  departures: AdminDeparture[]
}

export interface AdminDeparture {
  id: string
  departureDate: string
  returnDate: string
  totalSlots: number
  bookedSlots: number
  priceOverride: number | null
  status: 'OPEN' | 'CLOSED' | 'CANCELLED'
}

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'HIDDEN'

export interface AdminReview {
  id: string
  rating: number
  comment: string
  status: ReviewStatus
  createdAt: string
  user: { id: string; fullName: string; email: string }
  tour: { id: string; title: string; slug: string }
}

export interface AdminUser {
  id: string
  email: string
  fullName: string
  phone: string | null
  avatarUrl: string | null
  role: 'USER' | 'ADMIN'
  isActive: boolean
  createdAt: string
  _count: { bookings: number }
}

export interface AuditLog {
  id: string
  userId: string | null
  action: string
  entity: string
  entityId: string
  ipAddress: string | null
  createdAt: string
  user: { id: string; fullName: string; email: string } | null
}

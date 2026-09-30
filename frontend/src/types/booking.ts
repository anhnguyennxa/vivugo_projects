export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
export type BookingPaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED'

export interface Payment {
  id: string
  provider: 'VNPAY' | 'MOMO' | 'ZALOPAY'
  amount: number
  currency: string
  status: 'PENDING' | 'SUCCESS' | 'FAILED'
  transactionRef: string | null
  paidAt: string | null
}

export interface Booking {
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
  payment: Payment | null
  review: { id: string } | null
}

// Trang ket qua ngay sau thanh toan dung ban rut gon nay - khong doi dang
// nhap, khong lo thong tin lien he (xem GET /bookings/:code/receipt).
export interface BookingReceipt {
  bookingCode: string
  status: BookingStatus
  paymentStatus: BookingPaymentStatus
  totalPrice: number
  tour: { title: string }
}

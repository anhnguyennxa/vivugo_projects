export interface CartItem {
  id: string
  numAdults: number
  numChildren: number
  createdAt: string
  tour: {
    id: string
    title: string
    slug: string
    thumbnailUrl: string
    basePrice: number
    discountPrice: number | null
  }
  departure: {
    id: string
    departureDate: string
    returnDate: string
    totalSlots: number
    bookedSlots: number
    priceOverride: number | null
    status: 'OPEN' | 'CLOSED' | 'CANCELLED'
  }
}

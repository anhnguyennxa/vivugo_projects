export interface Category {
  id: string
  name: string
  slug: string
  imageUrl: string | null
}

export interface Departure {
  id: string
  departureDate: string
  returnDate: string
  totalSlots: number
  bookedSlots: number
  status: 'OPEN' | 'CLOSED' | 'CANCELLED'
}

export interface Tour {
  id: string
  title: string
  slug: string
  summary: string
  location: string
  durationDays: number
  durationNights: number
  basePrice: number
  discountPrice: number | null
  thumbnailUrl: string
  avgRating: number
  reviewCount: number
  isFeatured: boolean
  category: Category
  departures?: Departure[]
}

export interface Paginated<T> {
  items: T[]
  page: number
  limit: number
  total: number
}

export type Region = 'MIEN_BAC' | 'MIEN_TRUNG' | 'TAY_NGUYEN' | 'MIEN_NAM'
export type DepartureCity = 'HA_NOI' | 'HO_CHI_MINH' | 'DA_NANG' | 'HAI_PHONG' | 'CAN_THO'

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
}

export interface Departure {
  id: string
  departureDate: string
  returnDate: string
  totalSlots: number
  bookedSlots: number
  priceOverride: number | null
  status: 'OPEN' | 'CLOSED' | 'CANCELLED'
}

export interface TourImage {
  id: string
  url: string
  sortOrder: number
}

export interface Review {
  id: string
  rating: number
  comment: string
  createdAt: string
  user: { fullName: string; avatarUrl: string | null }
}

export interface ItineraryDay {
  day: number
  title: string
  description: string
}

export interface Tour {
  id: string
  title: string
  slug: string
  summary: string
  location: string
  region: Region
  departureCity: DepartureCity
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

export interface TourDetail extends Tour {
  description: string
  itinerary: ItineraryDay[]
  minGuests: number
  maxGuests: number
  images: TourImage[]
  departures: Departure[]
  reviews: Review[]
}

export interface Paginated<T> {
  items: T[]
  page: number
  limit: number
  total: number
}

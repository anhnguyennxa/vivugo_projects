export interface ApiSuccess<T> {
  success: true
  message: string
  data: T
  meta?: { page: number; limit: number; total: number }
}

export interface ApiError {
  success: false
  message: string
  errors?: { field: string; message: string }[]
}

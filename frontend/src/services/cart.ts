import { apiClient } from '@/api/client'
import type { ApiSuccess } from '@/types/api'
import type { CartItem } from '@/types/cart'

export async function getCart(): Promise<CartItem[]> {
  const { data } = await apiClient.get<ApiSuccess<CartItem[]>>('/cart')
  return data.data
}

export async function addToCart(payload: {
  tourId: string
  departureId: string
  numAdults: number
  numChildren?: number
}): Promise<CartItem> {
  const { data } = await apiClient.post<ApiSuccess<CartItem>>('/cart', payload)
  return data.data
}

export async function updateCartItem(
  id: string,
  payload: { numAdults?: number; numChildren?: number },
): Promise<CartItem> {
  const { data } = await apiClient.patch<ApiSuccess<CartItem>>(`/cart/${id}`, payload)
  return data.data
}

export async function removeCartItem(id: string): Promise<void> {
  await apiClient.delete(`/cart/${id}`)
}

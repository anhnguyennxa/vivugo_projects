import { apiClient } from '@/api/client'
import type { AuthUser } from '@/stores/auth'
import type { ApiSuccess } from '@/types/api'

export interface RegisterPayload {
  email: string
  password: string
  fullName: string
  phone?: string
}

export interface LoginPayload {
  email: string
  password: string
}

type SessionData = { user: AuthUser; accessToken: string }

export async function register(payload: RegisterPayload) {
  const { data } = await apiClient.post<ApiSuccess<SessionData>>('/auth/register', payload)
  return data.data
}

export async function login(payload: LoginPayload) {
  const { data } = await apiClient.post<ApiSuccess<SessionData>>('/auth/login', payload)
  return data.data
}

export async function forgotPassword(email: string) {
  const { data } = await apiClient.post<ApiSuccess<null>>('/auth/forgot-password', { email })
  return data.message
}

export async function resetPassword(token: string, newPassword: string) {
  const { data } = await apiClient.post<ApiSuccess<null>>('/auth/reset-password', {
    token,
    newPassword,
  })
  return data.message
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const { data } = await apiClient.patch<ApiSuccess<null>>('/auth/change-password', {
    currentPassword,
    newPassword,
  })
  return data.message
}

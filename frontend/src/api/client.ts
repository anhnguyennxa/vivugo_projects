import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

import { API_BASE_URL } from '@/constants/config'
import { useAuthStore } from '@/stores/auth'
import type { ApiError } from '@/types/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise: Promise<string | null> | null = null

// Các endpoint tự thân liên quan đến phiên đăng nhập — không bao giờ được
// kích hoạt vòng lặp "refresh rồi retry chính nó" khi chúng thất bại.
const AUTH_SESSION_PATHS = ['/auth/refresh', '/auth/logout']

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    const isAuthSessionRequest = AUTH_SESSION_PATHS.some((path) => originalRequest?.url?.includes(path))

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retried ||
      isAuthSessionRequest
    ) {
      throw error
    }
    originalRequest._retried = true

    refreshPromise ??= useAuthStore.getState().refreshAccessToken()
    const newToken = await refreshPromise
    refreshPromise = null

    if (!newToken) {
      useAuthStore.setState({ user: null, accessToken: null })
      throw error
    }

    originalRequest.headers.Authorization = `Bearer ${newToken}`
    return apiClient(originalRequest)
  },
)

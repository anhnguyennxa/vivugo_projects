import { create } from 'zustand'

import { apiClient } from '@/api/client'
import type { ApiSuccess } from '@/types/api'

export interface AuthUser {
  id: string
  email: string
  fullName: string
  role: 'USER' | 'ADMIN'
  avatarUrl: string | null
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  isHydrating: boolean
  setSession: (user: AuthUser, accessToken: string) => void
  logout: () => Promise<void>
  refreshAccessToken: () => Promise<string | null>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isHydrating: true,

  setSession: (user, accessToken) => set({ user, accessToken, isHydrating: false }),

  logout: async () => {
    try {
      await apiClient.post('/auth/logout')
    } finally {
      set({ user: null, accessToken: null })
    }
  },

  refreshAccessToken: async () => {
    try {
      const { data } = await apiClient.post<ApiSuccess<{ accessToken: string; user: AuthUser }>>(
        '/auth/refresh',
      )
      get().setSession(data.data.user, data.data.accessToken)
      return data.data.accessToken
    } catch {
      set({ user: null, accessToken: null, isHydrating: false })
      return null
    }
  },
}))

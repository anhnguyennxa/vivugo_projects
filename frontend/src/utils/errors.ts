import { AxiosError } from 'axios'

import type { ApiError } from '@/types/api'

export function getApiErrorMessage(err: unknown): string | undefined {
  if (err instanceof AxiosError) {
    return (err.response?.data as ApiError | undefined)?.message
  }
  return undefined
}

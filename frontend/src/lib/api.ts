import { DEFAULT_BACKEND_URL } from '@/state/constants'

export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export async function safeJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T | { detail?: string }

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'detail' in payload && payload.detail
        ? payload.detail
        : `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return payload as T
}
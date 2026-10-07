import { apiFetch } from '@/lib/api/client'
import type { LoginRequest, LoginResult, User } from '@/lib/api/types'

export function toLoginRequest(values: { username: string; password: string }): LoginRequest {
  return { username: values.username.trim(), password: values.password }
}

export const authApi = {
  login: (values: { username: string; password: string }) =>
    apiFetch<LoginResult>('/auth/login', {
      method: 'POST',
      body: toLoginRequest(values),
      skipUnauthorizedHandler: true,
    }),
  me: (signal?: AbortSignal) => apiFetch<User>('/auth/me', { signal }),
}

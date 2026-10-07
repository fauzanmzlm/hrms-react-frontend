import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onUnauthorized } from '@/lib/api/client'
import { queryKeys } from '@/lib/query-keys'
import {
  clearSession,
  isSessionExpired,
  parseSession,
  readStoredSession,
  saveSession,
  SESSION_STORAGE_KEY,
  type Session,
} from '@/lib/session'
import { authApi } from './api'
import { AuthContext, type AuthContextValue, type LogoutReason } from './auth-context'
import { can as canRole, type Action } from './permissions'

// setTimeout overflows above ~24.8 days; tokens last 8 hours.
const MAX_TIMEOUT_MS = 2 ** 31 - 1

interface InitialState {
  session: Session | null
  reason: LogoutReason | null
}

function initialState(): InitialState {
  const stored = readStoredSession()
  if (stored && isSessionExpired(stored)) {
    clearSession()
    return { session: null, reason: 'expired' }
  }
  return { session: stored, reason: null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [{ session, reason }, setState] = useState<InitialState>(initialState)

  const logout = useCallback(
    (logoutReason: LogoutReason = 'manual') => {
      clearSession()
      setState({ session: null, reason: logoutReason })
      queryClient.clear()
    },
    [queryClient],
  )

  const login = useCallback(
    async (username: string, password: string) => {
      const result = await authApi.login({ username, password })
      queryClient.clear()
      const next: Session = {
        token: result.access_token,
        expiresAt: result.expires_at,
        user: result.user,
      }
      saveSession(next)
      setState({ session: next, reason: null })
      return result.user
    },
    [queryClient],
  )

  // Any 401 outside login means the token is invalid or expired; there is no refresh endpoint.
  useEffect(() => onUnauthorized(() => logout('expired')), [logout])

  useEffect(() => {
    if (!session) return
    const remaining = Date.parse(session.expiresAt) - Date.now()
    const timer = window.setTimeout(
      () => logout('expired'),
      Math.min(Math.max(remaining, 0), MAX_TIMEOUT_MS),
    )
    return () => window.clearTimeout(timer)
  }, [session, logout])

  // Keep tabs in sync: logging in or out in one tab applies to all of them.
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== SESSION_STORAGE_KEY) return
      const next = parseSession(event.newValue)
      if (next && !isSessionExpired(next)) {
        queryClient.clear()
        setState({ session: next, reason: null })
      } else {
        queryClient.clear()
        setState({ session: null, reason: 'manual' })
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [queryClient])

  // Revalidate the stored session; a 401 here triggers logout via onUnauthorized.
  const me = useQuery({
    queryKey: [...queryKeys.me, session?.user.id],
    queryFn: ({ signal }) => authApi.me(signal),
    enabled: session !== null,
    staleTime: 5 * 60_000,
  })

  const user = session ? (me.data ?? session.user) : null

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      logoutReason: reason,
      login,
      logout,
      can: (action: Action) => canRole(user?.role, action),
    }),
    [user, reason, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

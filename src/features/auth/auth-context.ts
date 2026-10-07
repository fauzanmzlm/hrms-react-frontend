import { createContext, useContext } from 'react'
import type { User } from '@/lib/api/types'
import type { Action } from './permissions'

export type LogoutReason = 'manual' | 'expired'

export interface AuthContextValue {
  user: User | null
  /** Why the last session ended; shown on the login page. */
  logoutReason: LogoutReason | null
  login: (username: string, password: string) => Promise<User>
  logout: (reason?: LogoutReason) => void
  can: (action: Action) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}

/** The signed-in user. Only use below <RequireAuth>. */
export function useCurrentUser(): User {
  const { user } = useAuth()
  if (!user) throw new Error('useCurrentUser requires a signed-in user')
  return user
}

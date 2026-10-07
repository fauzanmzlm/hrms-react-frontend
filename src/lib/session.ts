import type { User } from '@/lib/api/types'

/**
 * The session lives in localStorage so it survives reloads and is shared by
 * tabs. The trade-off is that script injected through an XSS bug could read
 * the token; the backend only issues bearer tokens (no httpOnly cookie), and
 * tokens expire after 8 hours with no refresh.
 */
export const SESSION_STORAGE_KEY = 'hrms.session'

export interface Session {
  token: string
  expiresAt: string
  user: User
}

function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Partial<Session>
  return (
    typeof s.token === 'string' &&
    typeof s.expiresAt === 'string' &&
    typeof s.user === 'object' &&
    s.user !== null &&
    typeof s.user.id === 'number' &&
    typeof s.user.role === 'string'
  )
}

export function parseSession(raw: string | null): Session | null {
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    return isSession(value) ? value : null
  } catch {
    return null
  }
}

export function isSessionExpired(session: Session, now = Date.now()): boolean {
  const expiresAt = Date.parse(session.expiresAt)
  return Number.isNaN(expiresAt) || expiresAt <= now
}

/** Returns the stored session, including an expired one. */
export function readStoredSession(): Session | null {
  return parseSession(localStorage.getItem(SESSION_STORAGE_KEY))
}

export function saveSession(session: Session): void {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY)
}

export function getStoredToken(): string | null {
  const session = readStoredSession()
  return session && !isSessionExpired(session) ? session.token : null
}

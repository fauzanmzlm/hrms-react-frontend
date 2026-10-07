import { Navigate, Outlet, useLocation } from 'react-router'
import { ForbiddenPage } from '@/app/pages/ForbiddenPage'
import { useAuth } from './auth-context'
import type { Action } from './permissions'

/** Redirects to /login (remembering the current URL) when nobody is signed in. */
export function RequireAuth() {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) {
    const redirect = `${location.pathname}${location.search}`
    const search = redirect === '/' ? '' : `?redirect=${encodeURIComponent(redirect)}`
    return <Navigate to={`/login${search}`} replace />
  }
  return <Outlet />
}

/** Renders the 403 page unless the signed-in user's role allows `action`. */
export function RequirePermission({ action }: { action: Action }) {
  const { can } = useAuth()
  return can(action) ? <Outlet /> : <ForbiddenPage />
}

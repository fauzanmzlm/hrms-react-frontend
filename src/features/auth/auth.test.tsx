import { screen, waitFor, within } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { queryKeys } from '@/lib/query-keys'
import { readStoredSession, saveSession } from '@/lib/session'
import { makeUser, signInAs } from '@/test/fixtures'
import { apiError, ok } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'
import { safeRedirect } from './redirect'

describe('authentication', () => {
  it('redirects to the login page, then back after signing in', async () => {
    const admin = makeUser('ADMIN')
    server.use(
      http.post('/api/v1/auth/login', () =>
        ok({
          access_token: 'jwt',
          token_type: 'Bearer',
          expires_at: new Date(Date.now() + 3600_000).toISOString(),
          user: admin,
        }),
      ),
    )
    const { user, router } = renderApp('/admin/users/new')

    expect(await screen.findByRole('heading', { name: 'Sign in to HRMS' })).toBeInTheDocument()
    expect(router.state.location.search).toBe('?redirect=%2Fadmin%2Fusers%2Fnew')

    await user.type(screen.getByLabelText(/username/i), 'admin')
    await user.type(screen.getByLabelText(/password/i), 'ChangeMe-2026')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/users/new'))
    expect(readStoredSession()?.token).toBe('jwt')
  })

  it('shows invalid credentials inline without treating the 401 as an expired session', async () => {
    server.use(
      http.post('/api/v1/auth/login', () =>
        apiError(401, 'UNAUTHORIZED', 'unauthorized: invalid username or password'),
      ),
    )
    const { user } = renderApp('/login')
    await user.type(await screen.findByLabelText(/username/i), 'admin')
    await user.type(screen.getByLabelText(/password/i), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Invalid username or password.')).toBeInTheDocument()
    expect(screen.queryByText(/session has expired/i)).not.toBeInTheDocument()
  })

  it('validates required fields before calling the API', async () => {
    const { user } = renderApp('/login')
    await user.click(await screen.findByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Enter your username')).toBeInTheDocument()
    expect(screen.getByLabelText(/username/i)).toHaveAttribute('aria-invalid', 'true')
  })

  it('signs out and shows a notice when the API returns 401', async () => {
    signInAs('ADMIN')
    const { router, queryClient } = renderApp('/')
    await screen.findByRole('heading', { name: /welcome, admin/i })

    server.use(
      http.get('/api/v1/auth/me', () => apiError(401, 'UNAUTHORIZED', 'invalid or expired token')),
    )
    await queryClient.invalidateQueries({ queryKey: queryKeys.me })

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(await screen.findByText(/session has expired/i)).toBeInTheDocument()
    expect(readStoredSession()).toBeNull()
  })

  it('treats an expired stored session as signed out', async () => {
    saveSession({ token: 'old', expiresAt: '2020-01-01T00:00:00Z', user: makeUser('ADMIN') })
    renderApp('/')
    expect(await screen.findByText(/session has expired/i)).toBeInTheDocument()
    expect(readStoredSession()).toBeNull()
  })
})

describe('route guards', () => {
  it('shows the access denied page when the role lacks permission', async () => {
    signInAs('HR_OFFICER')
    renderApp('/admin/users/new')
    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Create user' })).not.toBeInTheDocument()
  })

  it('shows admin navigation to admins only', async () => {
    signInAs('ADMIN')
    renderApp('/')
    const nav = await screen.findByRole('navigation', { name: 'Main' })
    expect(within(nav).getByRole('link', { name: 'Create user' })).toBeInTheDocument()
  })
})

describe('safeRedirect', () => {
  it('only allows same-app paths', () => {
    expect(safeRedirect('/employees?page=2')).toBe('/employees?page=2')
    expect(safeRedirect('//evil.example')).toBe('/')
    expect(safeRedirect('https://evil.example')).toBe('/')
    expect(safeRedirect(null)).toBe('/')
  })
})

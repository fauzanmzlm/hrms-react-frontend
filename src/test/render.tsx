import { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AppProviders } from '@/app/providers'
import { routes } from '@/app/routes'
import { readStoredSession } from '@/lib/session'
import { ok } from './msw/handlers'
import { server } from './msw/server'

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  })
}

/**
 * Renders the full app (providers, guards, shell) at `path`. Sign in first
 * with signInAs() from fixtures; GET /auth/me then echoes the stored user.
 */
export function renderApp(path = '/') {
  server.use(
    http.get('/api/v1/auth/me', () => {
      const session = readStoredSession()
      return session ? ok(session.user) : new Response(null, { status: 401 })
    }),
  )
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const queryClient = createTestQueryClient()
  const user = userEvent.setup()
  const result = render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return { ...result, router, queryClient, user }
}

import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiError, ok } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { signInAs } from '@/test/fixtures'
import { apiFetch, ApiError, buildUrl, onUnauthorized } from './client'

describe('apiFetch', () => {
  const unsubscribers: Array<() => void> = []
  afterEach(() => unsubscribers.splice(0).forEach((u) => u()))

  it('unwraps the data envelope and sends the bearer token', async () => {
    signInAs('ADMIN')
    let auth: string | null = null
    server.use(
      http.get('/api/v1/grades', ({ request }) => {
        auth = request.headers.get('Authorization')
        return ok([{ id: 1 }])
      }),
    )
    await expect(apiFetch('/grades')).resolves.toEqual([{ id: 1 }])
    expect(auth).toBe('Bearer token-ADMIN')
  })

  it('returns undefined for 204 No Content', async () => {
    server.use(http.delete('/api/v1/grades/1', () => new HttpResponse(null, { status: 204 })))
    await expect(apiFetch('/grades/1', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('serialises the body as JSON and skips empty query params', async () => {
    let url = ''
    let body: unknown
    server.use(
      http.post('/api/v1/promotions', async ({ request }) => {
        url = request.url
        body = await request.json()
        return ok({ id: 9 }, 201)
      }),
    )
    await apiFetch('/promotions', {
      method: 'POST',
      body: { proposed_grade_id: 2 },
      query: { a: 1, b: '', c: undefined, d: null },
    })
    expect(new URL(url).search).toBe('?a=1')
    expect(body).toEqual({ proposed_grade_id: 2 })
  })

  it('throws a typed ApiError from the error envelope', async () => {
    server.use(
      http.post('/api/v1/employees', () =>
        apiError(422, 'VALIDATION_FAILED', 'validation failed', { ic_number: 'is invalid' }),
      ),
    )
    const error = await apiFetch('/employees', { method: 'POST', body: {} }).catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 422,
      code: 'VALIDATION_FAILED',
      fields: { ic_number: 'is invalid' },
      requestId: 'test-request-id',
    })
  })

  it('falls back to a generic error when the body is not an error envelope', async () => {
    server.use(http.get('/api/v1/grades', () => new HttpResponse('oops', { status: 502 })))
    const error = await apiFetch('/grades').catch((e) => e)
    expect(error).toMatchObject({ status: 502, code: 'INTERNAL_ERROR' })
  })

  it('maps network failures to NETWORK_ERROR', async () => {
    server.use(http.get('/api/v1/grades', () => HttpResponse.error()))
    const error = await apiFetch('/grades').catch((e) => e)
    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' })
  })

  it('notifies unauthorized listeners on 401', async () => {
    const listener = vi.fn()
    unsubscribers.push(onUnauthorized(listener))
    server.use(
      http.get('/api/v1/grades', () => apiError(401, 'UNAUTHORIZED', 'invalid or expired token')),
    )
    await expect(apiFetch('/grades')).rejects.toMatchObject({ status: 401 })
    expect(listener).toHaveBeenCalledOnce()
  })

  it('does not notify listeners when the caller opts out (login)', async () => {
    const listener = vi.fn()
    unsubscribers.push(onUnauthorized(listener))
    server.use(
      http.post('/api/v1/auth/login', () =>
        apiError(401, 'UNAUTHORIZED', 'unauthorized: invalid username or password'),
      ),
    )
    await expect(
      apiFetch('/auth/login', { method: 'POST', body: {}, skipUnauthorizedHandler: true }),
    ).rejects.toMatchObject({ status: 401 })
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('buildUrl', () => {
  it('prefixes the API base path', () => {
    expect(new URL(buildUrl('/employees', { page: 2 })).pathname).toBe('/api/v1/employees')
  })
})

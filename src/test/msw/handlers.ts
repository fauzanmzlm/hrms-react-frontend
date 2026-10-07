import { http, HttpResponse } from 'msw'

export const api = (path: string) => `/api/v1${path}`

export function ok<T>(data: T, status = 200) {
  return HttpResponse.json({ data }, { status })
}

export function apiError(
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
) {
  return HttpResponse.json(
    { error: { code, message, fields, request_id: 'test-request-id' } },
    { status },
  )
}

export const emptyPage = { items: [], total: 0, page: 1, page_size: 20 }

/** Lists shown as side panels default to empty; tests override what they assert on. */
export const defaultHandlers = [
  http.get('/healthz', () => ok({ status: 'ok' })),
  http.get(api('/employees'), () => ok(emptyPage)),
  http.get(api('/promotions'), () => ok(emptyPage)),
  http.get(api('/disciplinary-records'), () => ok(emptyPage)),
]

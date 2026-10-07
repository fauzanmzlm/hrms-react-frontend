import { getStoredToken } from '@/lib/session'
import type { ApiErrorDetail } from './types'

export const API_BASE_PATH = '/api/v1'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields?: Record<string, string>
  readonly requestId?: string

  constructor(status: number, detail: ApiErrorDetail) {
    super(detail.message)
    this.name = 'ApiError'
    this.status = status
    this.code = detail.code
    this.fields = detail.fields && Object.keys(detail.fields).length > 0 ? detail.fields : undefined
    this.requestId = detail.request_id
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

type QueryValue = string | number | boolean | null | undefined
export type QueryParams = Record<string, QueryValue>

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  query?: QueryParams
  body?: unknown
  signal?: AbortSignal
  /** Do not treat a 401 as an expired session (used by login, where 401 means bad credentials). */
  skipUnauthorizedHandler?: boolean
}

type UnauthorizedListener = (error: ApiError) => void
const unauthorizedListeners = new Set<UnauthorizedListener>()

/** Registers a callback for 401 responses. Returns an unsubscribe function. */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener)
  return () => {
    unauthorizedListeners.delete(listener)
  }
}

export function buildUrl(path: string, query?: QueryParams): string {
  // An absolute URL on the current origin keeps requests same-origin (via the
  // Vite proxy in development) and works in jsdom, which rejects relative URLs.
  const url = new URL(`${API_BASE_PATH}${path}`, window.location.origin)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue
    url.searchParams.set(key, String(value))
  }
  return url.toString()
}

function isErrorBody(payload: unknown): payload is { error: ApiErrorDetail } {
  if (typeof payload !== 'object' || payload === null || !('error' in payload)) return false
  const { error } = payload as { error: unknown }
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as ApiErrorDetail).code === 'string' &&
    typeof (error as ApiErrorDetail).message === 'string'
  )
}

/**
 * Calls the HRMS API. Successful responses are unwrapped from the
 * `{"data": ...}` envelope; failures throw an ApiError built from the
 * `{"error": {...}}` envelope.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, signal, skipUnauthorizedHandler = false } = options
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = getStoredToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiError(0, {
      code: 'NETWORK_ERROR',
      message: 'Cannot reach the server. Check your connection and that the backend is running.',
    })
  }

  if (response.status === 204) return undefined as T

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new ApiError(
      response.status,
      isErrorBody(payload)
        ? payload.error
        : {
            code: response.status >= 500 ? 'INTERNAL_ERROR' : 'HTTP_ERROR',
            message: response.statusText || `Request failed with status ${response.status}`,
          },
    )
    if (response.status === 401 && !skipUnauthorizedHandler) {
      unauthorizedListeners.forEach((listener) => listener(error))
    }
    throw error
  }

  return (payload as { data: T }).data
}

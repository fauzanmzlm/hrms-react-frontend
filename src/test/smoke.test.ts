import { describe, expect, it } from 'vitest'

describe('test environment', () => {
  it('intercepts requests with MSW', async () => {
    const response = await fetch(new URL('/healthz', window.location.origin))
    await expect(response.json()).resolves.toEqual({ data: { status: 'ok' } })
  })
})

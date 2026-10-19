import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, fetchIntraday } from './intraday'

const rows = [{ day: '2026-10-16', lowAverage: 350.1, highAverage: 352.4, volume: 1000 }]

function mockFetch(response: Response | Error) {
  const fn = vi.fn(async () => {
    if (response instanceof Error) throw response
    return response
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('fetchIntraday', () => {
  it('returns rows from the backend', async () => {
    const fetch = mockFetch(json(rows))
    const signal = new AbortController().signal

    await expect(fetchIntraday('TSLA', signal)).resolves.toEqual(rows)
    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/intraday/TSLA', { signal })
  })

  it('encodes the ticker into the path', async () => {
    const fetch = mockFetch(json(rows))
    await fetchIntraday('^GSPC')
    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/intraday/%5EGSPC', expect.anything())
  })

  it('uses VITE_API_BASE_URL without a trailing slash', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.example:8080/')
    const fetch = mockFetch(json(rows))
    await fetchIntraday('TSLA')
    expect(fetch).toHaveBeenCalledWith('http://api.example:8080/intraday/TSLA', expect.anything())
  })

  it('returns an empty list when there is no data', async () => {
    mockFetch(json([]))
    await expect(fetchIntraday('TSLA')).resolves.toEqual([])
  })

  it('throws ApiError with the backend message and status', async () => {
    mockFetch(json({ error: 'No data found, symbol may be delisted' }, 404))
    const err = await fetchIntraday('NOPE').catch((e: unknown) => e)

    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 404, message: 'No data found, symbol may be delisted', retryAfter: undefined })
  })

  it('reads Retry-After in seconds on rate limits', async () => {
    mockFetch(json({ error: 'Too many requests, please try again later' }, 429, { 'Retry-After': '42' }))
    await expect(fetchIntraday('TSLA')).rejects.toMatchObject({ status: 429, retryAfter: 42 })
  })

  it('ignores a Retry-After that is not a number of seconds', async () => {
    mockFetch(json({ error: 'busy' }, 503, { 'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT' }))
    await expect(fetchIntraday('TSLA')).rejects.toMatchObject({ status: 503, retryAfter: undefined })
  })

  it('falls back to a generic message when the error body is not JSON', async () => {
    mockFetch(new Response('<html>Bad Gateway</html>', { status: 502, headers: { 'Content-Type': 'text/html' } }))
    await expect(fetchIntraday('TSLA')).rejects.toMatchObject({ status: 502, message: 'Request failed with status 502' })
  })

  it('rejects a success response that is not a list of rows', async () => {
    mockFetch(json({ unexpected: true }))
    await expect(fetchIntraday('TSLA')).rejects.toMatchObject({ status: 200, message: 'Unexpected response from the server' })
  })

  it('throws ApiError with status 0 when the backend is unreachable', async () => {
    mockFetch(new TypeError('Failed to fetch'))
    const err = await fetchIntraday('TSLA').catch((e: unknown) => e)

    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 0, message: 'Could not reach the server. Is the backend running?' })
  })

  it('passes cancellation through as the original AbortError', async () => {
    const controller = new AbortController()
    controller.abort()
    mockFetch(new DOMException('This operation was aborted', 'AbortError'))

    const err = await fetchIntraday('TSLA', controller.signal).catch((e: unknown) => e)
    expect(err).not.toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ name: 'AbortError' })
  })
})

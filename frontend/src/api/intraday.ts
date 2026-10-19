export interface IntradayRow {
  day: string
  lowAverage: number
  highAverage: number
  volume: number
}

// Every failure the page needs to show. status is 0 when the backend couldn't be reached at all.
export class ApiError extends Error {
  status: number
  // seconds, when the backend says how long to wait (429/503)
  retryAfter?: number

  constructor(status: number, message: string, retryAfter?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.retryAfter = retryAfter
  }
}

function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

function parseRetryAfter(value: string | null): number | undefined {
  const seconds = Number(value)
  return value && Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined
}

// Rejects with ApiError for anything the backend or network got wrong; an aborted request rejects
// with the original AbortError so callers can tell cancellation apart from failure.
export async function fetchIntraday(ticker: string, signal?: AbortSignal): Promise<IntradayRow[]> {
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl()}/intraday/${encodeURIComponent(ticker)}`, { signal })
  } catch (err) {
    if (signal?.aborted) throw err
    throw new ApiError(0, 'Could not reach the server. Is the backend running?')
  }

  const body = await readJson(response)
  if (!response.ok) {
    const message = (body as { error?: unknown } | undefined)?.error
    throw new ApiError(
      response.status,
      typeof message === 'string' ? message : `Request failed with status ${response.status}`,
      parseRetryAfter(response.headers.get('Retry-After')),
    )
  }
  if (!Array.isArray(body)) {
    throw new ApiError(response.status, 'Unexpected response from the server')
  }
  return body as IntradayRow[]
}

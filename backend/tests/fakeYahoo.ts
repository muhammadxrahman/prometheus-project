import { mock } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

const realFetch = globalThis.fetch;

const chartBody = {
  chart: {
    result: [
      {
        meta: { gmtoffset: -14400 },
        timestamp: [1792157400, 1792158300],
        indicators: { quote: [{ low: [10, 12], high: [20, 22], volume: [100, 200] }] },
      },
    ],
    error: null,
  },
};

const errorBody = { chart: { result: null, error: { code: 'Internal', description: 'Internal error' } } };

interface FakeResponse {
  status: number;
  delayMs?: number;
  // headers arrive, but the body never finishes until the signal aborts
  stallBody?: boolean;
  // reject like real fetch does on DNS/connection failures
  networkError?: boolean;
  // strings are sent as-is, anything else as JSON; defaults to a chart or error payload
  body?: unknown;
  headers?: Record<string, string>;
}

// Stands in for Yahoo while letting the test's own requests to the app through.
// Responses are used in call order; the last one repeats.
export function fakeYahoo(...responses: FakeResponse[]) {
  const calls: string[] = [];
  mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (!url.startsWith('https://query1.finance.yahoo.com/')) return realFetch(input, init);

    const spec = responses[Math.min(calls.length, responses.length - 1)];
    const { status, delayMs = 0, stallBody = false, networkError = false } = spec;
    calls.push(url);
    const signal = init?.signal ?? undefined;
    // like real fetch, an aborted signal rejects with its reason (e.g. TimeoutError)
    if (delayMs) await delay(delayMs, undefined, { signal }).catch(() => Promise.reject(signal?.reason));
    if (networkError) throw new TypeError('fetch failed', { cause: new Error('getaddrinfo ENOTFOUND') });

    const headers = { 'Content-Type': 'application/json', ...spec.headers };
    if (stallBody) {
      const stream = new ReadableStream({
        start(controller) {
          signal?.addEventListener('abort', () => controller.error(signal.reason));
        },
      });
      return new Response(stream, { status, headers });
    }
    const body = 'body' in spec ? spec.body : status === 200 ? chartBody : errorBody;
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers });
  });
  return calls;
}

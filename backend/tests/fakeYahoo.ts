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

// Stands in for Yahoo while letting the test's own requests to the app through.
// Responses are used in call order; the last one repeats.
export function fakeYahoo(...responses: { status: number; delayMs?: number; stallBody?: boolean }[]) {
  const calls: string[] = [];
  mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (!url.startsWith('https://query1.finance.yahoo.com/')) return realFetch(input, init);

    const { status, delayMs = 0, stallBody = false } = responses[Math.min(calls.length, responses.length - 1)];
    calls.push(url);
    const signal = init?.signal ?? undefined;
    // like real fetch, an aborted signal rejects with its reason (e.g. TimeoutError)
    if (delayMs) await delay(delayMs, undefined, { signal }).catch(() => Promise.reject(signal?.reason));
    const headers = { 'Content-Type': 'application/json' };
    if (stallBody) {
      // headers arrive, but the body never finishes until the signal aborts
      const stream = new ReadableStream({
        start(controller) {
          signal?.addEventListener('abort', () => controller.error(signal.reason));
        },
      });
      return new Response(stream, { status, headers });
    }
    const body = status === 200 ? chartBody : { chart: { result: null, error: { code: 'Internal' } } };
    return new Response(JSON.stringify(body), { status, headers });
  });
  return calls;
}

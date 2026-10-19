import { test, before, after, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fakeYahoo } from './fakeYahoo.js';

// this file makes more requests than the default limit allows; set it before loading the app
process.env.INTRADAY_RATE_LIMIT_MAX = '1000';

let server: Server;
let baseUrl: string;

before(async () => {
  const { default: app } = await import('../app.js');
  server = app.listen(0);
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
});

after(() => server.close());

afterEach(() => mock.restoreAll());

// silences the expected console.error output so it stays out of the test report
async function getError(ticker: string) {
  mock.method(console, 'error', () => {});
  const res = await fetch(`${baseUrl}/intraday/${ticker}`);
  assert.match(res.headers.get('Content-Type') ?? '', /application\/json/);
  return { res, body: await res.json() };
}

// each test uses its own ticker so cache entries don't leak between tests
test('network failure returns 502', async () => {
  fakeYahoo({ status: 0, networkError: true });
  const { res, body } = await getError('NET');
  assert.strictEqual(res.status, 502);
  assert.strictEqual(res.headers.get('X-Cache'), 'MISS');
  assert.deepStrictEqual(body, { error: 'Could not reach market data provider' });
});

test('unknown symbol returns 404 with the provider description', async () => {
  fakeYahoo({
    status: 404,
    body: { chart: { result: null, error: { code: 'Not Found', description: 'No data found, symbol may be delisted' } } },
  });
  const { res, body } = await getError('NOPE');
  assert.strictEqual(res.status, 404);
  assert.deepStrictEqual(body, { error: 'No data found, symbol may be delisted' });
});

test('provider rate limit with a text body returns 503 and forwards Retry-After', async () => {
  fakeYahoo({ status: 429, body: 'Edge: Too Many Requests', headers: { 'Content-Type': 'text/html', 'Retry-After': '30' } });
  const { res, body } = await getError('BUSY');
  assert.strictEqual(res.status, 503);
  assert.strictEqual(res.headers.get('Retry-After'), '30');
  assert.deepStrictEqual(body, { error: 'Market data provider is rate limiting requests, please try again later' });
});

test('other provider errors return 502 without leaking provider details', async () => {
  fakeYahoo({ status: 422, body: { chart: { result: null, error: { code: 'Unprocessable Entity', description: 'range too long' } } } });
  const { res, body } = await getError('BADREQ');
  assert.strictEqual(res.status, 502);
  assert.deepStrictEqual(body, { error: 'Market data provider returned an error' });
});

test('non-JSON 200 response returns 502', async () => {
  fakeYahoo({ status: 200, body: '<html>maintenance</html>', headers: { 'Content-Type': 'text/html' } });
  const { res, body } = await getError('HTML');
  assert.strictEqual(res.status, 502);
  assert.deepStrictEqual(body, { error: 'Market data provider returned an unexpected response' });
});

const malformedPayloads: [string, unknown][] = [
  ['NULLBODY', null],
  ['NORESULT', { chart: { result: [], error: null } }],
  ['NOMETA', { chart: { result: [{ timestamp: [1], indicators: { quote: [{ low: [1], high: [2] }] } }] } }],
  ['NOQUOTE', { chart: { result: [{ meta: { gmtoffset: 0 }, timestamp: [1], indicators: { quote: [] } }] } }],
  ['BADTS', { chart: { result: [{ meta: { gmtoffset: 0 }, timestamp: 'x', indicators: { quote: [{ low: [], high: [] }] } }] } }],
];

for (const [ticker, payload] of malformedPayloads) {
  test(`malformed 200 payload (${ticker}) returns 502`, async () => {
    fakeYahoo({ status: 200, body: payload });
    const { res, body } = await getError(ticker);
    assert.strictEqual(res.status, 502);
    assert.deepStrictEqual(body, { error: 'Market data provider returned an unexpected response' });
  });
}

test('missing volume and non-numeric timestamps are tolerated', async () => {
  fakeYahoo({
    status: 200,
    body: {
      chart: { result: [{ meta: { gmtoffset: 0 }, timestamp: [86400, null], indicators: { quote: [{ low: [1, 1], high: [3, 3] }] } }] },
    },
  });
  const res = await fetch(`${baseUrl}/intraday/NOVOL`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(await res.json(), [{ day: '1970-01-02', lowAverage: 1, highAverage: 3, volume: 0 }]);
});

test('no bars in range returns an empty list', async () => {
  fakeYahoo({ status: 200, body: { chart: { result: [{ meta: { gmtoffset: 0 }, indicators: { quote: [{ low: [], high: [] }] } }] } } });
  const res = await fetch(`${baseUrl}/intraday/EMPTY`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(await res.json(), []);
});

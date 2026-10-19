import { test, before, after, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fakeYahoo } from './fakeYahoo.js';

// the timeout is read at import time, so set it before loading the app
process.env.INTRADAY_UPSTREAM_TIMEOUT_MS = '30';

let server: Server;
let baseUrl: string;

before(async () => {
  const { default: app } = await import('../app.js');
  server = app.listen(0);
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
});

after(() => server.close());

afterEach(() => mock.restoreAll());

test('slow upstream response returns 504 and is not cached', async () => {
  const calls = fakeYahoo({ status: 200, delayMs: 200 }, { status: 200 });

  const timedOut = await fetch(`${baseUrl}/intraday/SLOW`);
  assert.strictEqual(timedOut.status, 504);
  assert.strictEqual(timedOut.headers.get('X-Cache'), 'MISS');
  assert.deepStrictEqual(await timedOut.json(), { error: 'Upstream request timed out' });

  const retried = await fetch(`${baseUrl}/intraday/SLOW`);
  assert.strictEqual(retried.status, 200);
  assert.strictEqual(calls.length, 2);
});

test('stalled upstream body returns 504', async () => {
  fakeYahoo({ status: 200, stallBody: true });

  const res = await fetch(`${baseUrl}/intraday/STALL`);
  assert.strictEqual(res.status, 504);
  assert.deepStrictEqual(await res.json(), { error: 'Upstream request timed out' });
});

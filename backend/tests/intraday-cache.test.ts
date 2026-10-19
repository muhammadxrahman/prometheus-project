import { test, before, after, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import app from '../app.js';
import { fakeYahoo } from './fakeYahoo.js';

let server: Server;
let baseUrl: string;

before(() => {
  server = app.listen(0);
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
});

after(() => server.close());

afterEach(() => mock.restoreAll());

// each test uses its own ticker so cache entries don't leak between tests
test('sequential requests hit the cache', async () => {
  const calls = fakeYahoo({ status: 200 });

  const first = await fetch(`${baseUrl}/intraday/SEQ`);
  const second = await fetch(`${baseUrl}/intraday/SEQ`);

  assert.strictEqual(first.headers.get('X-Cache'), 'MISS');
  assert.strictEqual(second.headers.get('X-Cache'), 'HIT');
  assert.deepStrictEqual(await second.json(), await first.json());
  assert.strictEqual(calls.length, 1);
});

test('concurrent requests share one upstream call', async () => {
  const calls = fakeYahoo({ status: 200, delayMs: 50 });

  const responses = await Promise.all([1, 2, 3].map(() => fetch(`${baseUrl}/intraday/CONC`)));
  const bodies = await Promise.all(responses.map((r) => r.json()));

  assert.ok(responses.every((r) => r.status === 200));
  assert.deepStrictEqual(responses.map((r) => r.headers.get('X-Cache')).sort(), ['HIT', 'HIT', 'MISS']);
  assert.deepStrictEqual(bodies[1], bodies[0]);
  assert.deepStrictEqual(bodies[2], bodies[0]);
  assert.strictEqual(calls.length, 1);
});

test('upstream failures are not cached', async () => {
  const calls = fakeYahoo({ status: 500 }, { status: 200 });
  mock.method(console, 'error', () => {});

  const failed = await fetch(`${baseUrl}/intraday/FAIL`);
  assert.strictEqual(failed.status, 502);
  assert.strictEqual(failed.headers.get('X-Cache'), 'MISS');
  assert.deepStrictEqual(await failed.json(), { error: 'Market data provider returned an error' });

  const retried = await fetch(`${baseUrl}/intraday/FAIL`);
  assert.strictEqual(retried.status, 200);
  assert.strictEqual(retried.headers.get('X-Cache'), 'MISS');
  assert.strictEqual(calls.length, 2);
});

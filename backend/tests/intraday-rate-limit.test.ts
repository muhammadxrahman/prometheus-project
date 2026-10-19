import { test, before, after, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { fakeYahoo } from './fakeYahoo.js';

// the limiter reads its config at import time, so set it before loading the app
process.env.INTRADAY_RATE_LIMIT_MAX = '2';
process.env.INTRADAY_RATE_LIMIT_WINDOW_MS = '200';

let server: Server;
let baseUrl: string;

before(async () => {
  const { default: app } = await import('../app.js');
  server = app.listen(0);
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
});

after(() => server.close());

afterEach(() => mock.restoreAll());

test('requests over the limit get 429 until the window resets', async () => {
  const calls = fakeYahoo({ status: 200 });

  assert.strictEqual((await fetch(`${baseUrl}/intraday/RL`)).status, 200);
  assert.strictEqual((await fetch(`${baseUrl}/intraday/RL`)).status, 200);

  const limited = await fetch(`${baseUrl}/intraday/RL`);
  assert.strictEqual(limited.status, 429);
  assert.ok(limited.headers.get('Retry-After'));
  assert.deepStrictEqual(await limited.json(), { error: 'Too many requests, please try again later' });
  assert.strictEqual(calls.length, 1);

  await delay(250);

  assert.strictEqual((await fetch(`${baseUrl}/intraday/RL`)).status, 200);
});

test('health route is not rate limited', async () => {
  for (let i = 0; i < 5; i++) {
    assert.strictEqual((await fetch(`${baseUrl}/health`)).status, 200);
  }
});

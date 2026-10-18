import { test, before, after } from 'node:test';
import assert from 'node:assert';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { fakeYahoo } from './fakeYahoo.js';

// the cache reads its TTL at import time, so set it before loading the app
process.env.INTRADAY_CACHE_TTL_MS = '50';

let server: Server;
let baseUrl: string;

before(async () => {
  const { default: app } = await import('../app.js');
  server = app.listen(0);
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
});

after(() => server.close());

test('cached entries expire after the TTL', async () => {
  const calls = fakeYahoo({ status: 200 });

  assert.strictEqual((await fetch(`${baseUrl}/intraday/TTL`)).headers.get('X-Cache'), 'MISS');
  assert.strictEqual((await fetch(`${baseUrl}/intraday/TTL`)).headers.get('X-Cache'), 'HIT');

  await delay(80);

  assert.strictEqual((await fetch(`${baseUrl}/intraday/TTL`)).headers.get('X-Cache'), 'MISS');
  assert.strictEqual(calls.length, 2);
});

import { test, before, after } from 'node:test';
import assert from 'node:assert';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import app from '../app.js';

let server: Server;
let baseUrl: string;

before(() => {
  server = app.listen(0);
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
});

after(() => server.close());

const FRONTEND = 'http://localhost:5173';

test('allows the frontend origin and exposes Retry-After', async () => {
  const res = await fetch(`${baseUrl}/health`, { headers: { Origin: FRONTEND } });
  assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), FRONTEND);
  assert.strictEqual(res.headers.get('Access-Control-Expose-Headers'), 'Retry-After');
});

test('error responses carry CORS headers so the frontend can read them', async () => {
  const res = await fetch(`${baseUrl}/intraday/BAD!`, { headers: { Origin: FRONTEND } });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), FRONTEND);
});

test('preflight requests are answered without reaching the route and allow only GET', async () => {
  const res = await fetch(`${baseUrl}/intraday/TSLA`, {
    method: 'OPTIONS',
    headers: { Origin: FRONTEND, 'Access-Control-Request-Method': 'GET' },
  });
  assert.strictEqual(res.status, 204);
  assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), FRONTEND);
  assert.strictEqual(res.headers.get('Access-Control-Allow-Methods'), 'GET');
});

test('other origins are not allowed', async () => {
  const res = await fetch(`${baseUrl}/health`, { headers: { Origin: 'http://evil.example' } });
  assert.notStrictEqual(res.headers.get('Access-Control-Allow-Origin'), 'http://evil.example');
});

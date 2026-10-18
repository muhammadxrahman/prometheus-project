const { test, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../app');

let server;
let baseUrl;

before(() => {
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}`;
});

after(() => server.close());

test('valid ticker returns daily aggregates', async () => {
  const res = await fetch(`${baseUrl}/intraday/TSLA`);
  assert.strictEqual(res.status, 200);

  const body = await res.json();
  assert.ok(Array.isArray(body) && body.length > 0);
  assert.deepStrictEqual(Object.keys(body[0]), ['day', 'lowAverage', 'highAverage', 'volume']);
});

test('invalid ticker is rejected before hitting the API', async () => {
  const res = await fetch(`${baseUrl}/intraday/TSLA123!`);
  assert.strictEqual(res.status, 400);
});

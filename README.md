# Stock Tracker

Look up a stock ticker and see the last month of intraday trading summarized by day: the average low, average high, and total volume of each day's 15-minute bars, shown as a chart or a table.

- **`backend/`**: Express + TypeScript API that fetches 15-minute bars from Yahoo Finance and aggregates them per trading day. It caches results, rate-limits clients, and returns JSON errors.
- **`frontend/`**: React + TypeScript + Vite single-page app (Bootstrap, Recharts) that calls the backend.

## Requirements

- Node.js **22.12 or newer** (22, 24, or 26; Vitest doesn't support 23 or 25)
- npm
- Internet access from the backend (it calls `query1.finance.yahoo.com`)

## Quick start

Run the backend and frontend in two terminals.

**1. Backend** (http://localhost:3000)

```sh
cd backend
npm install
npm run dev
```

**2. Frontend** (http://localhost:5173)

```sh
cd frontend
npm install
npm run dev
```

Open http://localhost:5173, enter a ticker such as `TSLA`, `BRK.B`, or `^GSPC`, and switch between the chart and table views.

The defaults are set up for this exact setup: the backend allows requests from `http://localhost:5173`, and the frontend calls `http://localhost:3000`. Nothing needs configuring to run it locally.

## Backend

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start with auto-reload (`tsx watch`) |
| `npm test` | Run the test suite (`node:test`). One test calls the live Yahoo API, so it needs internet access. |
| `npm run typecheck` | Type-check without emitting |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run the compiled server (run `npm run build` first) |

The server always listens on port **3000**.

### Configuration

All settings are optional environment variables. There is no `.env` loader, so set them in the shell when starting the server:

```sh
INTRADAY_RATE_LIMIT_MAX=30 INTRADAY_CACHE_TTL_MS=60000 npm run dev
```

Numeric settings must be positive whole numbers. An invalid value (e.g. `0`, `-5`, `abc`) is ignored and the default is used.

| Variable | Default | Purpose |
|---|---|---|
| `CORS_ORIGIN` | `http://localhost:5173` | The frontend origin allowed to call the API (GET only) |
| `INTRADAY_RATE_LIMIT_MAX` | `10` | Requests allowed per client per window (see [Rate limiting](#rate-limiting)) |
| `INTRADAY_RATE_LIMIT_WINDOW_MS` | `60000` (1 minute) | Rate-limit window length |
| `INTRADAY_CACHE_TTL_MS` | `300000` (5 minutes) | How long a ticker's results are cached |
| `INTRADAY_CACHE_MAX` | `500` | Maximum number of tickers kept in the cache |
| `INTRADAY_UPSTREAM_TIMEOUT_MS` | `8000` (8 seconds) | Time allowed for a Yahoo request before returning 504 |

### Rate limiting

`GET /intraday/:ticker` is rate-limited per client. `/health` is not.

- **Configurable:** `INTRADAY_RATE_LIMIT_MAX` requests per `INTRADAY_RATE_LIMIT_WINDOW_MS`. The default is **10 requests per minute**.
- **Per client IP, fixed window:** each IP address gets its own count, which resets when the window ends.
- **Every request counts**, including cache hits and invalid tickers.
- **Over the limit**, the API returns `429` with `{ "error": "Too many requests, please try again later" }` and a `Retry-After` header. The frontend shows this as an error with a "try again in N s" hint.
- **Headers:** every response from this route includes standard `RateLimit` and `RateLimit-Policy` headers showing the remaining allowance.
- **In memory:** counts reset when the server restarts and aren't shared between multiple server instances.

Clicking through tickers quickly during a demo can hit the default limit. Raise it for the session:

```sh
INTRADAY_RATE_LIMIT_MAX=60 npm run dev
```

Behind a reverse proxy or load balancer, every request appears to come from the proxy's IP, so all clients share one limit. Enable Express's [`trust proxy`](https://expressjs.com/en/guide/behind-proxies.html) setting in `backend/app.ts` if you deploy that way.

### Caching

Results are cached per ticker, and only the aggregated daily rows are stored.

- **Shared requests:** concurrent requests for the same ticker share a single Yahoo call.
- **Failures aren't cached:** the next request tries Yahoo again.
- **`X-Cache` header:** `HIT` when the response came from the cache or joined a request already in progress; `MISS` when it made a new Yahoo call.

### API

**`GET /health`**: returns `Server is healthy`.

**`GET /intraday/:ticker`**: the last month of 15-minute bars grouped by trading day, oldest first:

```json
[
  { "day": "2026-09-17", "lowAverage": 366.5762, "highAverage": 368.7883, "volume": 34544536 }
]
```

Tickers are case-insensitive. Letters, digits, and `. = ^ -` are allowed, up to 15 characters. Every error is JSON in the form `{ "error": "<message>" }`:

| Status | When |
|---|---|
| `400` | Ticker format is invalid |
| `404` | Yahoo has no data for the symbol |
| `429` | Rate limit reached (includes `Retry-After`) |
| `502` | Yahoo couldn't be reached, returned an error, or sent an unexpected response |
| `503` | Yahoo is rate-limiting the backend (includes `Retry-After` when Yahoo sends one) |
| `504` | Yahoo didn't respond within `INTRADAY_UPSTREAM_TIMEOUT_MS` |
| `500` | Unexpected server error |

## Frontend

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server on http://localhost:5173 |
| `npm test` | Run unit tests (Vitest) |
| `npm run lint` | Run ESLint |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the built app on http://localhost:4173 |

### Configuration

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3000` | Backend URL the app calls |

`VITE_API_BASE_URL` is read when the dev server starts or when the app is built, not while it runs. Set it before `npm run dev` or `npm run build`, or put it in `frontend/.env.local`, which git ignores:

```sh
VITE_API_BASE_URL=http://localhost:3000
```

### Running on a different origin

The backend accepts browser requests only from `CORS_ORIGIN`. If the frontend runs anywhere other than `http://localhost:5173`, start the backend with the matching origin. For example, to try the production build:

```sh
# terminal 1
cd backend && CORS_ORIGIN=http://localhost:4173 npm run dev

# terminal 2
cd frontend && npm run build && npm run preview
```

If the origins don't match, the browser blocks the response and the page shows "Could not reach the server".

## Project structure

```
backend/
  app.ts                  routes, Yahoo client, cache, rate limit, CORS, error handling
  server.ts               starts the server on port 3000
  tests/                  API, cache, timeout, error, rate-limit, and CORS tests
frontend/src/
  api/intraday.ts         the only code that calls the backend
  pages/IntradayPage.tsx  page layout and request state
  components/             TickerForm, IntradayChart, IntradayTable, ViewToggle, ErrorAlert
  utils/                  ticker cleaning and validation, number and date formatting
```

## Notes

- Yahoo Finance's chart endpoint is unofficial and undocumented. Its responses or availability can change without notice.
- While the market is open, the current day is incomplete, so its averages will change through the day.

import express, { type ErrorRequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { LRUCache } from 'lru-cache';

const app = express();

const TICKER_PATTERN = /^[A-Z0-9^][A-Z0-9.=^-]{0,14}$/;

interface ChartResult {
  meta: { gmtoffset: number };
  timestamp?: number[];
  indicators: {
    quote: { low: (number | null)[]; high: (number | null)[]; volume?: (number | null)[] }[];
  };
}

interface ChartResponse {
  chart?: { result?: unknown[] | null; error?: { code?: string; description?: string } | null };
}

interface DayTotals {
  lowSum: number;
  highSum: number;
  count: number;
  volume: number;
}

interface IntradayRow {
  day: string;
  lowAverage: number;
  highAverage: number;
  volume: number;
}

// failures talking to Yahoo, already mapped to the status and message our clients see
class UpstreamError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfter?: string
  ) {
    super(message);
  }
}

function positiveIntFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

const UPSTREAM_TIMEOUT_MS = positiveIntFromEnv('INTRADAY_UPSTREAM_TIMEOUT_MS', 8000);

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function isChartResult(value: unknown): value is ChartResult {
  const r = value as ChartResult | null | undefined;
  const quote = r?.indicators?.quote?.[0];
  return (
    typeof r?.meta?.gmtoffset === 'number' &&
    (r.timestamp === undefined || Array.isArray(r.timestamp)) &&
    Array.isArray(quote?.low) &&
    Array.isArray(quote?.high) &&
    (quote.volume === undefined || Array.isArray(quote.volume))
  );
}

// Yahoo's status describes Yahoo's problem, not the client's, so only a missing symbol passes through
function errorForStatus(ticker: string, response: Response, data: ChartResponse | undefined): UpstreamError {
  if (response.status === 404) {
    return new UpstreamError(404, data?.chart?.error?.description ?? `No data found for ticker ${ticker}`);
  }
  if (response.status === 429) {
    return new UpstreamError(
      503,
      'Market data provider is rate limiting requests, please try again later',
      response.headers.get('Retry-After') ?? undefined
    );
  }
  console.error(`Yahoo returned ${response.status} for ${ticker}:`, data?.chart?.error ?? '(no error details)');
  return new UpstreamError(502, 'Market data provider returned an error');
}

async function getIntraday(ticker: string): Promise<IntradayRow[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=15m&range=1mo`;
  let response: Response;
  let text: string;
  try {
    // one signal covers both the request and reading the body
    response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    text = await response.text();
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new UpstreamError(504, 'Market data provider timed out');
    }
    // DNS failures, refused or reset connections, TLS errors; the real reason is on err.cause
    console.error(`Yahoo request for ${ticker} failed:`, err instanceof Error ? (err.cause ?? err) : err);
    throw new UpstreamError(502, 'Could not reach market data provider');
  }

  // error responses are often HTML or plain text (e.g. 429 "Too Many Requests"), so parse leniently
  const data = parseJson(text) as ChartResponse | undefined;
  if (!response.ok) throw errorForStatus(ticker, response, data);

  const result = data?.chart?.result?.[0];
  if (!isChartResult(result)) {
    console.error(`Yahoo returned an unexpected payload for ${ticker}:`, text.slice(0, 200));
    throw new UpstreamError(502, 'Market data provider returned an unexpected response');
  }

  const { timestamp = [], meta, indicators } = result;
  const { low, high, volume = [] } = indicators.quote[0];
  const days: Record<string, DayTotals> = {};

  timestamp.forEach((ts, i) => {
    const l = low[i];
    const h = high[i];
    if (l == null || h == null || !Number.isFinite(ts)) return;
    // shift to exchange-local time so bars group by trading day
    const day = new Date((ts + meta.gmtoffset) * 1000).toISOString().slice(0, 10);
    days[day] ??= { lowSum: 0, highSum: 0, count: 0, volume: 0 };
    days[day].lowSum += l;
    days[day].highSum += h;
    days[day].count += 1;
    days[day].volume += volume[i] ?? 0;
  });

  return Object.entries(days).map(([day, d]) => ({
    day,
    lowAverage: Number((d.lowSum / d.count).toFixed(4)),
    highAverage: Number((d.highSum / d.count).toFixed(4)),
    volume: d.volume,
  }));
}

// failed fetches reject without storing, so errors are never cached
const intradayCache = new LRUCache<string, IntradayRow[], string>({
  max: positiveIntFromEnv('INTRADAY_CACHE_MAX', 500),
  ttl: positiveIntFromEnv('INTRADAY_CACHE_TTL_MS', 5 * 60 * 1000),
  fetchMethod: (_key, _stale, { context }) => getIntraday(context),
  // if the entry is evicted mid-fetch, still answer the requests waiting on it
  ignoreFetchAbort: true,
});

// per-client (req.ip) fixed window; set app 'trust proxy' if deployed behind a proxy
const intradayRateLimit = rateLimit({
  windowMs: positiveIntFromEnv('INTRADAY_RATE_LIMIT_WINDOW_MS', 60 * 1000),
  limit: positiveIntFromEnv('INTRADAY_RATE_LIMIT_MAX', 10),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

// routes
app.get('/health', (req, res) => {
  res.send('Server is healthy');
});

app.get<'/intraday/:ticker', { ticker: string }>('/intraday/:ticker', intradayRateLimit, async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  if (!TICKER_PATTERN.test(ticker)) {
    return res.status(400).json({ error: `Invalid ticker symbol: ${req.params.ticker}` });
  }

  const status: LRUCache.Status<string, IntradayRow[], string> = {};
  try {
    const rows = await intradayCache.fetch(`${ticker}:1mo:15m`, { context: ticker, status });
    // requests that joined an in-flight fetch didn't make their own upstream call
    res.set('X-Cache', status.fetch === 'hit' || status.fetch === 'inflight' ? 'HIT' : 'MISS');
    res.json(rows);
  } catch (err) {
    if (!(err instanceof UpstreamError)) throw err;
    res.set('X-Cache', 'MISS');
    if (err.retryAfter) res.set('Retry-After', err.retryAfter);
    res.status(err.status).json({ error: err.message });
  }
});

// last resort for anything unexpected: JSON instead of Express's HTML page, and no stack traces
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({ error: 'Internal server error' });
};
app.use(errorHandler);

export default app;

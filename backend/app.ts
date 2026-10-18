import express from 'express';
import { LRUCache } from 'lru-cache';

const app = express();

const TICKER_PATTERN = /^[A-Z0-9^][A-Z0-9.=^-]{0,14}$/;

interface ChartResult {
  meta: { gmtoffset: number };
  timestamp?: number[];
  indicators: {
    quote: { low: (number | null)[]; high: (number | null)[]; volume: (number | null)[] }[];
  };
}

interface ChartResponse {
  chart?: { result?: ChartResult[] | null; error?: unknown };
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

class UpstreamError extends Error {
  constructor(
    public status: number,
    public body: unknown
  ) {
    super(`Upstream request failed with status ${status}`);
  }
}

function positiveIntFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

async function getIntraday(ticker: string): Promise<IntradayRow[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=15m&range=1mo`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  const data = (await response.json()) as ChartResponse;
  const result = data.chart?.result?.[0];
  if (!response.ok || !result) {
    throw new UpstreamError(response.status === 200 ? 502 : response.status, data.chart?.error ?? {});
  }

  const { timestamp = [], meta, indicators } = result;
  const { low, high, volume } = indicators.quote[0];
  const days: Record<string, DayTotals> = {};

  timestamp.forEach((ts, i) => {
    const l = low[i];
    const h = high[i];
    if (l == null || h == null) return;
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
});

// routes
app.get('/health', (req, res) => {
  res.send('Server is healthy');
});

app.get('/intraday/:ticker', async (req, res) => {
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
    res.status(err.status).json(err.body);
  }
});

export default app;

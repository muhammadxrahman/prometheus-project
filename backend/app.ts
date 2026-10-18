import express from 'express';

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

// routes
app.get('/health', (req, res) => {
  res.send('Server is healthy');
});

app.get('/intraday/:ticker', async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  if (!TICKER_PATTERN.test(ticker)) {
    return res.status(400).json({ error: `Invalid ticker symbol: ${req.params.ticker}` });
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=15m&range=1mo`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  const data = (await response.json()) as ChartResponse;
  const result = data.chart?.result?.[0];
  if (!response.ok || !result) {
    return res.status(response.status === 200 ? 502 : response.status).json(data.chart?.error ?? {});
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

  res.json(
    Object.entries(days).map(([day, d]) => ({
      day,
      lowAverage: Number((d.lowSum / d.count).toFixed(4)),
      highAverage: Number((d.highSum / d.count).toFixed(4)),
      volume: d.volume,
    }))
  );
});

export default app;

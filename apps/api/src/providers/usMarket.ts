import yahooFinance from "yahoo-finance2";
import type { Candle, Interval, Quote } from "@autostock/shared";

yahooFinance.suppressNotices(["yahooSurvey"]);

export async function getUsQuote(symbol: string): Promise<Quote> {
  const q = await yahooFinance.quote(symbol);
  const price = Number(q.regularMarketPrice ?? 0);
  const prev = Number(q.regularMarketPreviousClose ?? 0);
  return {
    symbol,
    market: "US",
    price,
    change: Number(q.regularMarketChange ?? price - prev),
    changePct: Number(q.regularMarketChangePercent ?? 0),
    prevClose: prev,
    asOf: Math.floor(Date.now() / 1000),
    source: "Yahoo",
  };
}

type ChartInterval = "1m" | "5m" | "15m" | "60m" | "1d";

const intervalMap: Record<Interval, { interval: ChartInterval; lookbackDays: number }> = {
  "1m":  { interval: "1m",  lookbackDays: 1   },
  "5m":  { interval: "5m",  lookbackDays: 5   },
  "15m": { interval: "15m", lookbackDays: 30  },
  "1h":  { interval: "60m", lookbackDays: 90  },
  "1d":  { interval: "1d",  lookbackDays: 730 },
};

export async function getUsCandles(symbol: string, interval: Interval, limit = 200): Promise<Candle[]> {
  const m = intervalMap[interval];
  const period1 = new Date(Date.now() - m.lookbackDays * 86400_000);
  const result = await yahooFinance.chart(symbol, {
    period1,
    interval: m.interval,
  });
  const quotes = result.quotes ?? [];
  const candles: Candle[] = [];
  for (const q of quotes) {
    if (q.open == null || q.high == null || q.low == null || q.close == null) continue;
    const t = q.date instanceof Date ? Math.floor(q.date.getTime() / 1000) : Math.floor(Number(q.date) / 1000);
    candles.push({
      time: t,
      open: Number(q.open),
      high: Number(q.high),
      low: Number(q.low),
      close: Number(q.close),
      volume: Number(q.volume ?? 0),
    });
  }
  return candles.slice(-limit);
}

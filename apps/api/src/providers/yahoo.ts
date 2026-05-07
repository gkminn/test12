import yahooFinance from "yahoo-finance2";
import type { Candle, Interval, Market, Quote } from "@autostock/shared";
import { findSymbol } from "../catalog/index.js";

yahooFinance.suppressNotices(["yahooSurvey"]);

// Map our (market, symbol) tuple to Yahoo's ticker format.
//   KR + KOSPI  → "005930.KS"
//   KR + KOSDAQ → "086520.KQ"
//   US          → "AAPL"
export function toYahooTicker(market: Market, symbol: string): string {
  if (market !== "KR") return symbol;
  const info = findSymbol("KR", symbol);
  if (info?.exchange === "KOSDAQ") return `${symbol}.KQ`;
  // Default KR to KOSPI suffix when unknown.
  return `${symbol}.KS`;
}

export async function getQuote(market: Market, symbol: string): Promise<Quote> {
  const ticker = toYahooTicker(market, symbol);
  const q = await yahooFinance.quote(ticker);
  const price = Number(q.regularMarketPrice ?? 0);
  const prev = Number(q.regularMarketPreviousClose ?? 0);
  return {
    symbol,
    market,
    price,
    change: Number(q.regularMarketChange ?? price - prev),
    changePct: Number(q.regularMarketChangePercent ?? 0),
    prevClose: prev,
    asOf: Math.floor(Date.now() / 1000),
    source: market === "KR" ? "Yahoo (지연)" : "Yahoo",
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

export async function getCandles(market: Market, symbol: string, interval: Interval, limit = 200): Promise<Candle[]> {
  const ticker = toYahooTicker(market, symbol);
  const m = intervalMap[interval];
  const period1 = new Date(Date.now() - m.lookbackDays * 86400_000);
  const result = await yahooFinance.chart(ticker, {
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

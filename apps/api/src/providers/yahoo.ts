import yahooFinance from "yahoo-finance2";
import type { Candle, Interval, Market, Quote } from "@autostock/shared";
import { findSymbol } from "../catalog/index.js";

yahooFinance.suppressNotices(["yahooSurvey"]);

// Mimic a real browser to avoid Yahoo Finance 429 rate limiting
const MODULE_OPTS = {
  fetchOptions: {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
    },
  },
} as const;

// Simple in-memory cache to avoid hammering Yahoo Finance
interface CacheEntry<T> { data: T; expiresAt: number }
const cache = new Map<string, CacheEntry<unknown>>();

function cacheGet<T>(key: string): T | undefined {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return undefined; }
  return entry.data;
}

function cacheSet<T>(key: string, data: T, ttlMs: number) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

async function withRetry<T>(fn: () => Promise<T>, retries = 4, delayMs = 2000): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const msg = (err as Error).message ?? "";
      const isRateLimit = msg.includes("Too Many Requests") || msg.includes("429");
      if (!isRateLimit || attempt === retries) throw err;
      await new Promise(r => setTimeout(r, delayMs * Math.pow(2, attempt)));
    }
  }
  throw new Error("unreachable");
}

export function toYahooTicker(market: Market, symbol: string): string {
  if (market !== "KR") return symbol;
  const info = findSymbol("KR", symbol);
  if (info?.exchange === "KOSDAQ") return `${symbol}.KQ`;
  return `${symbol}.KS`;
}

export async function getQuote(market: Market, symbol: string): Promise<Quote> {
  const ticker = toYahooTicker(market, symbol);
  const cacheKey = `quote:${ticker}`;
  const cached = cacheGet<Quote>(cacheKey);
  if (cached) return cached;

  const q = await withRetry(() => yahooFinance.quote(ticker, {}, MODULE_OPTS));
  const price = Number(q.regularMarketPrice ?? 0);
  const prev = Number(q.regularMarketPreviousClose ?? 0);
  const result: Quote = {
    symbol,
    market,
    price,
    change: Number(q.regularMarketChange ?? price - prev),
    changePct: Number(q.regularMarketChangePercent ?? 0),
    prevClose: prev,
    asOf: Math.floor(Date.now() / 1000),
    source: market === "KR" ? "Yahoo (지연)" : "Yahoo",
  };
  cacheSet(cacheKey, result, 30_000);
  return result;
}

type ChartInterval = "1m" | "5m" | "15m" | "60m" | "1d";

const intervalMap: Record<Interval, { interval: ChartInterval; lookbackDays: number; cacheTtlMs: number }> = {
  "1m":  { interval: "1m",  lookbackDays: 1,   cacheTtlMs: 30_000   },
  "5m":  { interval: "5m",  lookbackDays: 5,   cacheTtlMs: 60_000   },
  "15m": { interval: "15m", lookbackDays: 30,  cacheTtlMs: 120_000  },
  "1h":  { interval: "60m", lookbackDays: 90,  cacheTtlMs: 300_000  },
  "1d":  { interval: "1d",  lookbackDays: 730, cacheTtlMs: 600_000  },
};

const POSITIVE_KW = ["급등","상승","돌파","강세","매수","호실적","성장","확대","신고가","반등","흑자","수주","계약","어닝","서프라이즈","surges","rises","beats","strong","buy","upgrade","bullish","growth","record","profit","beat","rally","soars","gains"];
const NEGATIVE_KW = ["급락","하락","부진","약세","매도","손실","감소","경고","위험","적자","소송","제재","폭락","실망","falls","drops","misses","weak","sell","downgrade","bearish","loss","warning","risk","lawsuit","penalty","decline","plunges","slumps"];

function scoreNewsSentiment(titles: string[]): number {
  if (titles.length === 0) return 0;
  let score = 0;
  for (const title of titles) {
    const lower = title.toLowerCase();
    for (const w of POSITIVE_KW) if (lower.includes(w)) score += 1;
    for (const w of NEGATIVE_KW) if (lower.includes(w)) score -= 1;
  }
  return Math.max(-1, Math.min(1, score / titles.length));
}

export interface NewsResult { count: number; sentiment: number; titles: string[] }

export async function getNews(market: Market, symbol: string): Promise<NewsResult> {
  const ticker = toYahooTicker(market, symbol);
  const cacheKey = `news:${ticker}`;
  const cached = cacheGet<NewsResult>(cacheKey);
  if (cached) return cached;

  try {
    const result = await withRetry(
      () => yahooFinance.search(ticker, { newsCount: 20, quotesCount: 0 }, MODULE_OPTS as never),
    );
    const news = (result as { news?: { title?: string }[] }).news ?? [];
    const titles = news.map((n) => n.title ?? "").filter(Boolean);
    const output: NewsResult = { count: titles.length, sentiment: scoreNewsSentiment(titles), titles };
    cacheSet(cacheKey, output, 300_000);
    return output;
  } catch {
    return { count: 0, sentiment: 0, titles: [] };
  }
}

export async function getCandles(market: Market, symbol: string, interval: Interval, limit = 200): Promise<Candle[]> {
  const ticker = toYahooTicker(market, symbol);
  const m = intervalMap[interval];
  const cacheKey = `candles:${ticker}:${interval}`;
  const cached = cacheGet<Candle[]>(cacheKey);
  if (cached) return cached.slice(-limit);

  const period1 = new Date(Date.now() - m.lookbackDays * 86400_000);
  const result = await withRetry(() => yahooFinance.chart(ticker, { period1, interval: m.interval }, MODULE_OPTS));
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
  cacheSet(cacheKey, candles, m.cacheTtlMs);
  return candles.slice(-limit);
}

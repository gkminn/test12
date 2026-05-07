import type { Candle, Interval, Market, Prediction, Quote, Reasoning, SearchResult } from "@autostock/shared";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  search: (q: string) => getJson<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(q)}`),
  quote:  (market: Market, symbol: string) => getJson<Quote>(`/api/quote/${market}/${symbol}`),
  candles: (market: Market, symbol: string, interval: Interval) =>
    getJson<{ candles: Candle[] }>(`/api/candles/${market}/${symbol}?interval=${interval}`),
  indicators: (market: Market, symbol: string, interval: Interval) =>
    getJson<Reasoning>(`/api/indicators/${market}/${symbol}?interval=${interval}`),
  predict: (market: Market, symbol: string, interval: Interval) =>
    postJson<Prediction>("/api/predict", { market, symbol, interval }),
};

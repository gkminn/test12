export type Market = "KR" | "US";

export type Interval = "1m" | "5m" | "15m" | "1h" | "1d";

export const ALL_INTERVALS: Interval[] = ["1m", "5m", "15m", "1h", "1d"];

export interface SymbolInfo {
  symbol: string;       // KR: 6-digit code (e.g. "018880"), US: ticker (e.g. "AAPL")
  name: string;         // 한글명 or English name
  market: Market;
  exchange: string;     // KOSPI, KOSDAQ, NASDAQ, NYSE
}

export interface Candle {
  time: number;         // unix seconds (UTC) at bar open
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Quote {
  symbol: string;
  market: Market;
  price: number;
  change: number;       // absolute change vs prev close
  changePct: number;    // percent
  prevClose: number;
  asOf: number;         // unix seconds
  source: string;       // "KIS WS" | "KIS REST" | "Yahoo"
}

export type FactorGroup = "기본" | "가격" | "수급" | "시장" | "뉴스";

export type FactorVerdict = "상승" | "중립" | "하락" | "대기";

export interface ReasoningFactor {
  name: string;
  group: FactorGroup;
  value: string;        // formatted value e.g. "28.8", "-2.1%", "지지 0.4% · 저항 8%"
  score: number;        // -100..100
  verdict: FactorVerdict;
  description?: string; // tooltip
}

export interface Reasoning {
  symbol: string;
  market: Market;
  interval: Interval;
  asOf: number;
  factors: ReasoningFactor[];
}

export interface PredictionPath {
  baseline: number[];
  bull: number[];
  bear: number[];
  upper: number[];
  lower: number[];
}

export interface Prediction {
  symbol: string;
  market: Market;
  interval: Interval;
  trend: "bull" | "bear" | "neutral";
  hitRate: number;            // 0-100
  startTime: number;          // first predicted bar's open time (unix s)
  step: number;               // seconds between bars
  path: PredictionPath;
  factors: ReasoningFactor[]; // top reasoning factors selected by AI
  summary: string;
  asOf: number;
  modelVersion: string;       // e.g. "Rolling Ridge v1"
}

export interface SearchResult {
  symbol: string;
  name: string;
  market: Market;
  exchange: string;
  score: number;
}

export const INTERVAL_SECONDS: Record<Interval, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "1d": 86400,
};

export const PREDICT_BAR_COUNT: Record<Interval, number> = {
  "1m": 60,
  "5m": 48,
  "15m": 32,
  "1h": 24,
  "1d": 20,
};

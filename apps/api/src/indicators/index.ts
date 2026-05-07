import type { Candle, Reasoning, ReasoningFactor, Interval, Market } from "@autostock/shared";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function sma(values: number[], period: number): number[] {
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : NaN);
  }
  return out;
}

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = NaN;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (i === 0) prev = v;
    else prev = v * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function rsi(values: number[], period = 14): number {
  if (values.length < period + 1) return 50;
  let gain = 0, loss = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d; else loss -= d;
  }
  const rs = loss === 0 ? 100 : gain / loss;
  return 100 - 100 / (1 + rs);
}

export function macd(values: number[]) {
  const e12 = ema(values, 12);
  const e26 = ema(values, 26);
  const line = values.map((_, i) => e12[i] - e26[i]);
  const signal = ema(line.slice(25), 9);
  const lastLine = line[line.length - 1] ?? 0;
  const lastSignal = signal[signal.length - 1] ?? 0;
  return { line: lastLine, signal: lastSignal, hist: lastLine - lastSignal };
}

export function bollinger(values: number[], period = 20, mult = 2) {
  if (values.length < period) return { mid: NaN, upper: NaN, lower: NaN, posPct: 0 };
  const slice = values.slice(-period);
  const mid = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + (b - mid) ** 2, 0) / period;
  const sd = Math.sqrt(variance);
  const upper = mid + mult * sd;
  const lower = mid - mult * sd;
  const last = values[values.length - 1];
  const posPct = upper === lower ? 0 : ((last - lower) / (upper - lower)) * 100 - 50;
  return { mid, upper, lower, posPct };
}

export function atr(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return 0;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const p = candles[i - 1];
    const tr = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
    trs.push(tr);
  }
  const recent = trs.slice(-period);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const last = candles[candles.length - 1].close;
  return (avg / last) * 100; // % of last close
}

export function vwap(candles: Candle[]): number {
  let pv = 0, vol = 0;
  for (const c of candles) {
    const tp = (c.high + c.low + c.close) / 3;
    pv += tp * c.volume;
    vol += c.volume;
  }
  if (vol === 0) return candles[candles.length - 1]?.close ?? 0;
  return pv / vol;
}

export function obv(candles: Candle[]): number {
  let v = 0;
  for (let i = 1; i < candles.length; i++) {
    if (candles[i].close > candles[i - 1].close) v += candles[i].volume;
    else if (candles[i].close < candles[i - 1].close) v -= candles[i].volume;
  }
  return v;
}

export function obvDelta(candles: Candle[], lookback = 20): number {
  if (candles.length < lookback + 1) return 0;
  const recent = candles.slice(-lookback);
  let pos = 0, neg = 0;
  for (let i = 1; i < recent.length; i++) {
    const v = recent[i].volume;
    if (recent[i].close > recent[i - 1].close) pos += v;
    else if (recent[i].close < recent[i - 1].close) neg += v;
  }
  const tot = pos + neg;
  if (tot === 0) return 0;
  return ((pos - neg) / tot) * 100;
}

export function mfi(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return 50;
  let posMF = 0, negMF = 0;
  const slice = candles.slice(-period - 1);
  for (let i = 1; i < slice.length; i++) {
    const tp = (slice[i].high + slice[i].low + slice[i].close) / 3;
    const tpPrev = (slice[i - 1].high + slice[i - 1].low + slice[i - 1].close) / 3;
    const flow = tp * slice[i].volume;
    if (tp > tpPrev) posMF += flow;
    else if (tp < tpPrev) negMF += flow;
  }
  if (negMF === 0) return 100;
  const ratio = posMF / negMF;
  return 100 - 100 / (1 + ratio);
}

export function priceTrendPct(candles: Candle[], lookback = 20): number {
  if (candles.length < lookback) return 0;
  const a = candles[candles.length - lookback].close;
  const b = candles[candles.length - 1].close;
  return ((b - a) / a) * 100;
}

export function supportResistance(candles: Candle[]) {
  const last = candles[candles.length - 1].close;
  const lookback = candles.slice(-60);
  const highs = lookback.map(c => c.high);
  const lows = lookback.map(c => c.low);
  const support = Math.min(...lows);
  const resistance = Math.max(...highs);
  const supDist = ((last - support) / last) * 100;
  const resDist = ((resistance - last) / last) * 100;
  return { support, resistance, supDist, resDist };
}

export function gapDirection(candles: Candle[]): number {
  if (candles.length < 2) return 0;
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  return ((last.open - prev.close) / prev.close) * 100;
}

export function volumePressure(candles: Candle[]): number {
  if (candles.length < 21) return 1;
  const recent = candles.slice(-1)[0].volume;
  const avg = candles.slice(-21, -1).reduce((a, b) => a + b.volume, 0) / 20;
  if (avg === 0) return 1;
  return recent / avg;
}

interface MacroContext {
  marketIndexChangePct?: number;     // KOSPI / S&P 500 daily change %
  fxKrwUsd?: number;
  policyRate?: number;
  newsCount24h?: number;
  newsSentiment?: number;            // -1..1
}

function score(value: number, scale: number): number {
  return Math.round(clamp(value * scale, -100, 100));
}

export function buildReasoning(
  symbol: string,
  market: Market,
  interval: Interval,
  candles: Candle[],
  macro: MacroContext = {},
): Reasoning {
  const closes = candles.map(c => c.close);
  const last = closes[closes.length - 1] ?? 0;

  const trendPct = priceTrendPct(candles, 20);
  const rsiVal = rsi(closes, 14);
  const macdVal = macd(closes);
  const boll = bollinger(closes, 20, 2);
  const atrPct = atr(candles, 14);
  const vwapVal = vwap(candles.slice(-Math.min(candles.length, 60)));
  const vwapDiff = ((last - vwapVal) / vwapVal) * 100;
  const sr = supportResistance(candles);
  const obvD = obvDelta(candles, 20);
  const mfiVal = mfi(candles, 14);
  const volP = volumePressure(candles);
  const gap = gapDirection(candles);

  const factors: ReasoningFactor[] = [
    { group: "기본", name: "기본 추세", value: trendPct.toFixed(1) + "% / 20봉", score: score(trendPct, 5), verdict: verdict(trendPct, 0.5) },
    { group: "기본", name: "최근 변동성", value: atrPct.toFixed(1) + "%", score: score(-Math.abs(atrPct - 1), 30), verdict: "중립" },
    { group: "기본", name: "재귀 보정", value: "6회 평가 · 대기", score: 0, verdict: "대기" },

    { group: "가격", name: "가격 추세", value: trendPct.toFixed(1) + "% / 20봉", score: score(trendPct, 12), verdict: verdict(trendPct, 0.5) },
    { group: "가격", name: "RSI", value: rsiVal.toFixed(1), score: rsiScore(rsiVal), verdict: rsiVerdict(rsiVal) },
    { group: "가격", name: "MACD", value: Math.round(macdVal.hist) + "bp", score: score(macdVal.hist / Math.max(last, 1) * 100, 50), verdict: verdict(macdVal.hist, 0) },
    { group: "가격", name: "볼린저 위치", value: boll.posPct.toFixed(1) + "%", score: score(boll.posPct, 1.5), verdict: verdict(boll.posPct, 5) },
    { group: "가격", name: "ATR 변동폭", value: atrPct.toFixed(1) + "%", score: 0, verdict: "중립" },
    { group: "가격", name: "VWAP 괴리", value: vwapDiff.toFixed(1) + "%", score: score(vwapDiff, 20), verdict: verdict(vwapDiff, 0.2) },
    { group: "가격", name: "지지/저항", value: `지지 ${sr.supDist.toFixed(1)}% · 저항 ${sr.resDist.toFixed(0)}%`, score: score(sr.resDist - sr.supDist, 8), verdict: verdict(sr.resDist - sr.supDist, 1) },

    { group: "수급", name: "거래량 압력", value: volP.toFixed(1) + "x", score: score(volP - 1, 100), verdict: verdict(volP - 1, 0.05) },
    { group: "수급", name: "OBV 수급", value: obvD.toFixed(1) + "%", score: score(obvD, 1), verdict: verdict(obvD, 5) },
    { group: "수급", name: "MFI 자금흐름", value: mfiVal.toFixed(1), score: score(mfiVal - 50, 2), verdict: verdict(mfiVal - 50, 5) },
    { group: "수급", name: "갭 방향", value: gap.toFixed(1) + "%", score: score(gap, 50), verdict: verdict(gap, 0.1) },

    { group: "시장", name: "시장지수", value: macroLabel(market) + " " + (macro.marketIndexChangePct ?? 0).toFixed(2) + "%", score: score(macro.marketIndexChangePct ?? 0, 30), verdict: verdict(macro.marketIndexChangePct ?? 0, 0.1) },
    { group: "시장", name: "국내 기준금리", value: (macro.policyRate ?? 2.5).toFixed(2) + "%", score: 0, verdict: "대기" },
    { group: "시장", name: "원/달러 환율", value: (macro.fxKrwUsd ?? 1300).toFixed(1) + "원", score: score(((macro.fxKrwUsd ?? 1300) - 1350) / 50, -50), verdict: verdict(1350 - (macro.fxKrwUsd ?? 1300), 5) },

    { group: "뉴스", name: "뉴스 흐름", value: (macro.newsCount24h ?? 0) + "건 / 24h · " + (macro.newsSentiment ?? 0).toFixed(1), score: score(macro.newsSentiment ?? 0, 60), verdict: verdict(macro.newsSentiment ?? 0, 0.1) },
  ];

  return {
    symbol,
    market,
    interval,
    asOf: Math.floor(Date.now() / 1000),
    factors,
  };
}

function verdict(v: number, neutralBand: number): ReasoningFactor["verdict"] {
  if (v > neutralBand) return "상승";
  if (v < -neutralBand) return "하락";
  return "중립";
}

function rsiScore(v: number): number {
  if (v < 30) return -Math.round(((30 - v) / 30) * 80);
  if (v > 70) return Math.round(((v - 70) / 30) * 80);
  return Math.round((v - 50) * 0.5);
}

function rsiVerdict(v: number): ReasoningFactor["verdict"] {
  if (v < 30) return "하락";
  if (v > 70) return "상승";
  return "중립";
}

function macroLabel(market: Market): string {
  return market === "KR" ? "KODEX 200" : "SPY";
}

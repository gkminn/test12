import Anthropic from "@anthropic-ai/sdk";
import type { Candle, Interval, Market, Prediction, Reasoning, ReasoningFactor } from "@autostock/shared";
import { INTERVAL_SECONDS, PREDICT_BAR_COUNT } from "@autostock/shared";
import { env } from "../env.js";

const client = env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  : null;

const MODEL = "claude-opus-4-7";
const FALLBACK_MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are AutoStock AI, a quantitative analyst that produces short-horizon
price-path forecasts for Korean (KOSPI/KOSDAQ) and US (NASDAQ/NYSE) equities.

You must always answer by invoking the \`emit_prediction\` tool with structured
JSON. You never speak in free-form prose. The schema is enforced; values must be
real numbers, not strings.

# Indicator dictionary (used to interpret the user message)

- RSI(14): momentum oscillator. <30 oversold, >70 overbought.
- MACD histogram (in basis points of last close): positive = bullish momentum.
- Bollinger position: -50 (lower band) … 0 (mid) … +50 (upper band).
- ATR%: average true range as % of last close. Higher = more volatile.
- VWAP gap %: (close − VWAP) / VWAP × 100. Positive = price above VWAP (demand).
- Support/Resistance: distance to nearest swing levels in %.
- OBV delta: 20-bar net on-balance volume %. Positive = accumulation.
- MFI(14): money flow index. <20 oversold, >80 overbought.
- Volume pressure: today's bar / 20-bar average. >1.2x = unusual interest.
- Gap direction: open vs previous close, %.
- Market index change: KOSPI for KR, SPY for US, daily %.
- FX KRW/USD: USD/KRW level (KR only). Lower KRW = export-heavy KR equities benefit.
- Policy rate: Bank of Korea base rate (KR) / Fed funds (US). Higher = headwind.
- News flow: 24h count and sentiment in [-1, +1].

# Forecast construction rules

1. Produce EXACTLY \`barCount\` future closes for baseline, bullPath, bearPath,
   confidenceUpper, confidenceLower.
2. The first predicted bar's open time is provided as \`startTime\`.
3. Step seconds between bars equals \`step\`.
4. baseline must lie between bullPath and bearPath at every index, except the
   first index which equals the last actual close ± a small drift.
5. confidenceUpper >= bullPath; confidenceLower <= bearPath; cone widens with
   the square root of horizon (volatility scaling).
6. hitRate is your retrospective confidence (0–100) — anchor it to recent
   indicator coherence, NOT to wishful thinking.
7. trend ∈ {"bull","bear","neutral"}; pick the dominant scenario.
8. factors: pick the 6–10 most decisive reasoning items, each with a -100..100
   score and one of {"상승","중립","하락","대기"} verdicts in Korean.
9. summary: one short Korean sentence (≤80 chars).

# Numerical safety

- Never emit NaN/Infinity. If unsure, output baseline = last close repeated.
- Round prices to 2 decimals for US stocks, integers for KR stocks.
- Keep bull/bear bands realistic: clamp to last close × [0.5, 2.0] over the
  horizon.

You are a calm, evidence-driven analyst. Do not invent news. Do not speculate
beyond the indicator dictionary.`;

const TOOL = {
  name: "emit_prediction",
  description: "Emit the structured price-path forecast.",
  input_schema: {
    type: "object" as const,
    required: ["trend", "hitRate", "baseline", "bullPath", "bearPath", "confidenceUpper", "confidenceLower", "factors", "summary"],
    properties: {
      trend: { type: "string", enum: ["bull", "bear", "neutral"] },
      hitRate: { type: "number", minimum: 0, maximum: 100 },
      baseline: { type: "array", items: { type: "number" } },
      bullPath: { type: "array", items: { type: "number" } },
      bearPath: { type: "array", items: { type: "number" } },
      confidenceUpper: { type: "array", items: { type: "number" } },
      confidenceLower: { type: "array", items: { type: "number" } },
      factors: {
        type: "array",
        items: {
          type: "object",
          required: ["name", "group", "value", "score", "verdict"],
          properties: {
            name: { type: "string" },
            group: { type: "string", enum: ["기본","가격","수급","시장","뉴스"] },
            value: { type: "string" },
            score: { type: "number", minimum: -100, maximum: 100 },
            verdict: { type: "string", enum: ["상승","중립","하락","대기"] },
            description: { type: "string" },
          },
        },
      },
      summary: { type: "string" },
    },
  },
};

interface PredictArgs {
  symbol: string;
  name: string;
  market: Market;
  interval: Interval;
  candles: Candle[];
  reasoning: Reasoning;
}

const cache = new Map<string, { at: number; value: Prediction }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function predict(args: PredictArgs): Promise<Prediction> {
  const { symbol, market, interval, candles, reasoning, name } = args;
  const last = candles[candles.length - 1];
  const cacheKey = `${market}:${symbol}:${interval}:${last?.time ?? 0}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const barCount = PREDICT_BAR_COUNT[interval];
  const step = INTERVAL_SECONDS[interval];
  const startTime = (last?.time ?? Math.floor(Date.now() / 1000)) + step;
  const lastClose = last?.close ?? 0;

  if (!client) {
    const result = synthesizeFallback({ symbol, market, interval, candles, reasoning, name });
    cache.set(cacheKey, { at: Date.now(), value: result });
    return result;
  }

  const userPayload = {
    symbol,
    name,
    market,
    interval,
    barCount,
    step,
    startTime,
    lastClose,
    recentCandles: candles.slice(-200).map(c => ({
      t: c.time, o: c.open, h: c.high, l: c.low, c: c.close, v: c.volume,
    })),
    indicators: reasoning.factors.map(f => ({ group: f.group, name: f.name, value: f.value, score: f.score, verdict: f.verdict })),
  };

  const userText = `Forecast the next ${barCount} bars (interval=${interval}) for ${name} (${market}:${symbol}).
Use the indicator dictionary in the system prompt. Output via the emit_prediction tool only.

DATA (JSON):
${JSON.stringify(userPayload)}`;

  const callOnce = async (model: string) => client.messages.create({
    model,
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [TOOL],
    tool_choice: { type: "tool", name: TOOL.name },
    messages: [{ role: "user", content: userText }],
  });

  let resp;
  try {
    resp = await callOnce(MODEL);
  } catch {
    resp = await callOnce(FALLBACK_MODEL);
  }

  const toolBlock = resp.content.find(b => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Claude returned no tool_use block");
  }
  const out = toolBlock.input as {
    trend: "bull" | "bear" | "neutral";
    hitRate: number;
    baseline: number[];
    bullPath: number[];
    bearPath: number[];
    confidenceUpper: number[];
    confidenceLower: number[];
    factors: ReasoningFactor[];
    summary: string;
  };

  const ensureLen = (arr: number[]): number[] => {
    if (!Array.isArray(arr)) return Array(barCount).fill(lastClose);
    if (arr.length === barCount) return arr.map(safeNum(lastClose));
    if (arr.length > barCount) return arr.slice(0, barCount).map(safeNum(lastClose));
    const padded = [...arr];
    while (padded.length < barCount) padded.push(arr[arr.length - 1] ?? lastClose);
    return padded.map(safeNum(lastClose));
  };

  const result: Prediction = {
    symbol,
    market,
    interval,
    trend: out.trend,
    hitRate: clamp(Math.round(out.hitRate ?? 50), 0, 100),
    startTime,
    step,
    path: {
      baseline: ensureLen(out.baseline),
      bull: ensureLen(out.bullPath),
      bear: ensureLen(out.bearPath),
      upper: ensureLen(out.confidenceUpper),
      lower: ensureLen(out.confidenceLower),
    },
    factors: (out.factors ?? []).slice(0, 12),
    summary: out.summary ?? "",
    asOf: Math.floor(Date.now() / 1000),
    modelVersion: `${resp.model}`,
  };
  cache.set(cacheKey, { at: Date.now(), value: result });
  return result;
}

function safeNum(fallback: number) {
  return (n: number) => (Number.isFinite(n) ? n : fallback);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// Fallback synthesizer if no ANTHROPIC_API_KEY is configured. Builds a
// plausible cone using ATR scaling so the UI stays usable for development.
function synthesizeFallback(args: PredictArgs): Prediction {
  const { symbol, market, interval, candles, reasoning } = args;
  const barCount = PREDICT_BAR_COUNT[interval];
  const step = INTERVAL_SECONDS[interval];
  const last = candles[candles.length - 1];
  const lastClose = last?.close ?? 0;
  const startTime = (last?.time ?? Math.floor(Date.now() / 1000)) + step;
  const trendFactor = reasoning.factors.find(f => f.name === "기본 추세");
  const trendScore = trendFactor?.score ?? 0;
  const driftPerBar = (trendScore / 100) * 0.001 * lastClose;
  const atrFactor = reasoning.factors.find(f => f.name === "ATR 변동폭");
  const atrPct = atrFactor ? Number(atrFactor.value.replace("%","")) : 1;
  const sigma = (atrPct / 100) * lastClose;

  const baseline: number[] = [];
  const bull: number[] = [];
  const bear: number[] = [];
  const upper: number[] = [];
  const lower: number[] = [];
  for (let i = 1; i <= barCount; i++) {
    const drift = driftPerBar * i;
    const widen = sigma * Math.sqrt(i);
    baseline.push(lastClose + drift);
    bull.push(lastClose + drift + widen * 0.6);
    bear.push(lastClose + drift - widen * 0.6);
    upper.push(lastClose + drift + widen);
    lower.push(lastClose + drift - widen);
  }

  return {
    symbol,
    market,
    interval,
    trend: trendScore > 5 ? "bull" : trendScore < -5 ? "bear" : "neutral",
    hitRate: 60,
    startTime,
    step,
    path: { baseline, bull, bear, upper, lower },
    factors: reasoning.factors.slice(0, 8),
    summary: "ANTHROPIC_API_KEY 미설정 — ATR 기반 합성 시나리오",
    asOf: Math.floor(Date.now() / 1000),
    modelVersion: "fallback-atr",
  };
}

import type { FastifyInstance } from "fastify";
import { getKrCandles } from "../providers/kis.js";
import { getUsCandles, getUsQuote } from "../providers/usMarket.js";
import { buildReasoning } from "../indicators/index.js";
import { predict } from "../ai/claude.js";
import { findSymbol } from "../catalog/index.js";
import type { Interval, Market } from "@autostock/shared";
import { ALL_INTERVALS } from "@autostock/shared";

interface Body {
  market: Market;
  symbol: string;
  interval: Interval;
}

export async function registerPredictRoute(app: FastifyInstance) {
  app.post<{ Body: Body }>("/api/predict", async (req, reply) => {
    const { market, symbol, interval } = req.body ?? ({} as Body);
    if (!market || !symbol || !ALL_INTERVALS.includes(interval)) {
      reply.code(400);
      return { error: "missing market/symbol/interval" };
    }
    try {
      const candles = market === "KR"
        ? await getKrCandles(symbol, interval, 200)
        : await getUsCandles(symbol, interval, 200);
      const macro = market === "KR"
        ? {
            marketIndexChangePct: (await getUsQuote("^KS11").catch(() => null))?.changePct ?? 0,
            fxKrwUsd: (await getUsQuote("KRW=X").catch(() => null))?.price ?? 1300,
            policyRate: 2.5,
          }
        : {
            marketIndexChangePct: (await getUsQuote("SPY").catch(() => null))?.changePct ?? 0,
            policyRate: 4.5,
          };
      const reasoning = buildReasoning(symbol, market, interval, candles, macro);
      const info = findSymbol(market, symbol);
      const prediction = await predict({
        symbol,
        name: info?.name ?? symbol,
        market,
        interval,
        candles,
        reasoning,
      });
      return prediction;
    } catch (err: unknown) {
      app.log.error({ err }, "predict failed");
      reply.code(502);
      return { error: (err as Error).message };
    }
  });
}

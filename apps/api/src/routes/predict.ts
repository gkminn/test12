import type { FastifyInstance } from "fastify";
import { getCandles, getQuote, getNews } from "../providers/yahoo.js";
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
      const [candles, news] = await Promise.all([
        getCandles(market, symbol, interval, 200),
        getNews(market, symbol),
      ]);
      const macro = market === "KR"
        ? {
            marketIndexChangePct: (await getQuote("US", "^KS11").catch(() => null))?.changePct ?? 0,
            fxKrwUsd: (await getQuote("US", "KRW=X").catch(() => null))?.price ?? 1300,
            policyRate: 2.5,
            newsCount24h: news.count,
            newsSentiment: news.sentiment,
          }
        : {
            marketIndexChangePct: (await getQuote("US", "SPY").catch(() => null))?.changePct ?? 0,
            policyRate: 4.5,
            newsCount24h: news.count,
            newsSentiment: news.sentiment,
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

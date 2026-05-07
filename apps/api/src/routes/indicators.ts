import type { FastifyInstance } from "fastify";
import { getCandles, getQuote } from "../providers/yahoo.js";
import { buildReasoning } from "../indicators/index.js";
import type { Interval, Market } from "@autostock/shared";
import { ALL_INTERVALS } from "@autostock/shared";

async function getMarketContext(market: Market) {
  try {
    if (market === "KR") {
      const [kospi, fx] = await Promise.all([
        getQuote("US", "^KS11").catch(() => null),
        getQuote("US", "KRW=X").catch(() => null),
      ]);
      return {
        marketIndexChangePct: kospi?.changePct ?? 0,
        fxKrwUsd: fx?.price ?? 1300,
        policyRate: 2.5,
      };
    }
    const spy = await getQuote("US", "SPY").catch(() => null);
    return {
      marketIndexChangePct: spy?.changePct ?? 0,
      policyRate: 4.5,
    };
  } catch {
    return {};
  }
}

export async function registerIndicatorsRoute(app: FastifyInstance) {
  app.get<{
    Params: { market: Market; symbol: string };
    Querystring: { interval?: string };
  }>("/api/indicators/:market/:symbol", async (req, reply) => {
    const { market, symbol } = req.params;
    const interval = (req.query.interval ?? "1d") as Interval;
    if (!ALL_INTERVALS.includes(interval)) {
      reply.code(400);
      return { error: "invalid interval" };
    }
    if (market !== "KR" && market !== "US") {
      reply.code(400);
      return { error: "unknown market" };
    }
    try {
      const candles = await getCandles(market, symbol, interval, 200);
      const macro = await getMarketContext(market);
      return buildReasoning(symbol, market, interval, candles, macro);
    } catch (err: unknown) {
      app.log.error({ err }, "indicators failed");
      reply.code(502);
      return { error: (err as Error).message };
    }
  });
}

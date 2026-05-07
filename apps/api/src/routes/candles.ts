import type { FastifyInstance } from "fastify";
import { getKrCandles } from "../providers/kis.js";
import { getUsCandles } from "../providers/usMarket.js";
import type { Interval, Market } from "@autostock/shared";
import { ALL_INTERVALS } from "@autostock/shared";

export async function registerCandlesRoute(app: FastifyInstance) {
  app.get<{
    Params: { market: Market; symbol: string };
    Querystring: { interval?: string; limit?: string };
  }>("/api/candles/:market/:symbol", async (req, reply) => {
    const { market, symbol } = req.params;
    const interval = (req.query.interval ?? "1d") as Interval;
    const limit = Math.min(500, Number(req.query.limit ?? 200));
    if (!ALL_INTERVALS.includes(interval)) {
      reply.code(400);
      return { error: "invalid interval" };
    }
    try {
      const candles = market === "KR"
        ? await getKrCandles(symbol, interval, limit)
        : await getUsCandles(symbol, interval, limit);
      return { symbol, market, interval, candles };
    } catch (err: unknown) {
      app.log.error({ err }, "candles failed");
      reply.code(502);
      return { error: (err as Error).message };
    }
  });
}

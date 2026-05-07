import type { FastifyInstance } from "fastify";
import { getKrQuote } from "../providers/kis.js";
import { getUsQuote } from "../providers/usMarket.js";
import type { Market } from "@autostock/shared";

export async function registerQuoteRoute(app: FastifyInstance) {
  app.get<{ Params: { market: Market; symbol: string } }>("/api/quote/:market/:symbol", async (req, reply) => {
    const { market, symbol } = req.params;
    try {
      if (market === "KR") return await getKrQuote(symbol);
      if (market === "US") return await getUsQuote(symbol);
      reply.code(400);
      return { error: "unknown market" };
    } catch (err: unknown) {
      app.log.error({ err }, "quote failed");
      reply.code(502);
      return { error: (err as Error).message };
    }
  });
}

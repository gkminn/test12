import type { FastifyInstance } from "fastify";
import { getQuote } from "../providers/yahoo.js";
import type { Market } from "@autostock/shared";

export async function registerQuoteRoute(app: FastifyInstance) {
  app.get<{ Params: { market: Market; symbol: string } }>("/api/quote/:market/:symbol", async (req, reply) => {
    const { market, symbol } = req.params;
    if (market !== "KR" && market !== "US") {
      reply.code(400);
      return { error: "unknown market" };
    }
    try {
      return await getQuote(market, symbol);
    } catch (err: unknown) {
      app.log.error({ err }, "quote failed");
      reply.code(502);
      return { error: (err as Error).message };
    }
  });
}

import type { FastifyInstance } from "fastify";
import { getKrQuote } from "../providers/kis.js";
import { getUsQuote } from "../providers/usMarket.js";
import type { Market } from "@autostock/shared";

export async function registerRealtimeRoute(app: FastifyInstance) {
  app.get("/ws/quote", { websocket: true }, (socket /* WebSocket */, req) => {
    const url = new URL(req.url, "http://localhost");
    const market = (url.searchParams.get("market") as Market) ?? "KR";
    const symbol = url.searchParams.get("symbol") ?? "";
    if (!symbol) {
      socket.close(1008, "missing symbol");
      return;
    }
    let alive = true;
    const tick = async () => {
      while (alive) {
        try {
          const q = market === "KR" ? await getKrQuote(symbol) : await getUsQuote(symbol);
          socket.send(JSON.stringify({ type: "quote", quote: q }));
        } catch (err) {
          socket.send(JSON.stringify({ type: "error", error: (err as Error).message }));
        }
        await new Promise(r => setTimeout(r, market === "KR" ? 2000 : 5000));
      }
    };
    tick();
    socket.on("close", () => { alive = false; });
  });
}

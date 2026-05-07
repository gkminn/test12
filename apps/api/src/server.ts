import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { env } from "./env.js";
import { registerSearchRoute } from "./routes/search.js";
import { registerQuoteRoute } from "./routes/quote.js";
import { registerCandlesRoute } from "./routes/candles.js";
import { registerIndicatorsRoute } from "./routes/indicators.js";
import { registerPredictRoute } from "./routes/predict.js";
import { registerChatRoute } from "./routes/chat.js";
import { registerRealtimeRoute } from "./routes/realtime.js";

async function main() {
  const app = Fastify({ logger: { level: env.NODE_ENV === "production" ? "info" : "debug" } });

  await app.register(cors, { origin: true });
  await app.register(websocket);

  await registerSearchRoute(app);
  await registerQuoteRoute(app);
  await registerCandlesRoute(app);
  await registerIndicatorsRoute(app);
  await registerPredictRoute(app);
  await registerChatRoute(app);
  await registerRealtimeRoute(app);

  app.get("/api/health", async () => ({
    ok: true,
    hasAnthropic: Boolean(env.ANTHROPIC_API_KEY),
    hasKis: Boolean(env.KIS_APP_KEY && env.KIS_APP_SECRET),
    env: env.KIS_ENV,
  }));

  await app.listen({ port: env.PORT_API, host: "0.0.0.0" });
  app.log.info(`AutoStock AI API listening on :${env.PORT_API}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

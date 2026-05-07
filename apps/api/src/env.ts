import "dotenv/config";

function pick(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  PORT_API: Number(pick("PORT_API", "5174")),
  ANTHROPIC_API_KEY: pick("ANTHROPIC_API_KEY"),
  KIS_APP_KEY: pick("KIS_APP_KEY"),
  KIS_APP_SECRET: pick("KIS_APP_SECRET"),
  KIS_ACCOUNT_NO: pick("KIS_ACCOUNT_NO"),
  KIS_ENV: (pick("KIS_ENV", "prod") as "prod" | "vts"),
  NODE_ENV: pick("NODE_ENV", "development"),
};

export const KIS_BASE = env.KIS_ENV === "vts"
  ? "https://openapivts.koreainvestment.com:29443"
  : "https://openapi.koreainvestment.com:9443";

export const KIS_WS = env.KIS_ENV === "vts"
  ? "ws://ops.koreainvestment.com:31000"
  : "ws://ops.koreainvestment.com:21000";

import "dotenv/config";

function pick(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  PORT_API: Number(pick("PORT_API", "5174")),
  ANTHROPIC_API_KEY: pick("ANTHROPIC_API_KEY"),
  NODE_ENV: pick("NODE_ENV", "development"),
};

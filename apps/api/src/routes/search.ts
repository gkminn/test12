import type { FastifyInstance } from "fastify";
import { search } from "../catalog/index.js";

export async function registerSearchRoute(app: FastifyInstance) {
  app.get<{ Querystring: { q?: string; limit?: string } }>("/api/search", async (req) => {
    const q = (req.query.q ?? "").trim();
    const limit = Math.min(20, Number(req.query.limit ?? 10));
    return { results: search(q, limit) };
  });
}

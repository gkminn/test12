import type { FastifyInstance } from "fastify";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env.js";
import type { Market } from "@autostock/shared";

const client = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null;

interface ChatBody {
  market: Market;
  symbol: string;
  name: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

const SYSTEM = `너는 AutoStock AI 챗봇이다. 한국어로 간결히 답한다.
사용자가 보고 있는 종목과 관련된 질문에 답하되, 투자 권유는 하지 않고 항상
"투자 참고용" 디스클레이머를 마지막 줄에 덧붙인다. 구체적인 수치를 인용할
때는 사용자가 화면에서 보고 있는 지표와 일치하도록 보수적으로 답하라.`;

export async function registerChatRoute(app: FastifyInstance) {
  app.post<{ Body: ChatBody }>("/api/chat", async (req, reply) => {
    if (!client) {
      reply.code(503);
      return { error: "ANTHROPIC_API_KEY not set" };
    }
    const { messages, name, symbol, market } = req.body;
    reply.raw.setHeader("content-type", "text/event-stream");
    reply.raw.setHeader("cache-control", "no-cache");
    reply.raw.setHeader("connection", "keep-alive");

    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [
        { role: "user", content: `종목: ${name} (${market}:${symbol})` },
        { role: "assistant", content: "확인했습니다." },
        ...messages,
      ],
    });

    stream.on("text", (text: string) => {
      reply.raw.write(`data: ${JSON.stringify({ text })}\n\n`);
    });
    stream.on("end", () => {
      reply.raw.write("data: [DONE]\n\n");
      reply.raw.end();
    });
    stream.on("error", (err: Error) => {
      reply.raw.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      reply.raw.end();
    });
  });
}
